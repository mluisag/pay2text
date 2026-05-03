import Anthropic from '@anthropic-ai/sdk'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const SYSTEM_PROMPT =
  "You are Lumo, a calm inbox guardian. Read this message and give ONE sentence assessment — what does this person want and is it worth the recipient's time? Be warm but honest. No exclamation marks."

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 90
const DEFAULT_TIMEOUT_MS = 1500

/**
 * Asks Lumo (Claude Haiku) to read a paid message and produce a single-sentence
 * assessment for the recipient's dashboard. Returns null on any failure or when
 * ANTHROPIC_API_KEY isn't configured — never throws, never blocks.
 */
export async function generateLumoTake(args: {
  intentLabel: string
  messageText: string
  replyTo?: string
  timeoutMs?: number
}): Promise<string | null> {
  if (!anthropic) {
    console.warn('[lumo-take] ANTHROPIC_API_KEY not set — skipping take.')
    return null
  }

  const userContent =
    `Intent: ${args.intentLabel}\n` +
    (args.replyTo ? `Reply to: ${args.replyTo}\n` : '') +
    `\nMessage:\n${args.messageText}`

  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS

  // Race the Anthropic call against a hard timeout so a slow/down model
  // never delays the payment response. The take is best-effort — if it
  // misses the window, the message saves without one.
  const callPromise = anthropic.messages
    .create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })
    .then((response) => {
      const text = response.content
        .filter((c): c is Anthropic.TextBlock => c.type === 'text')
        .map((c) => c.text)
        .join('')
        .trim()
      if (!text) return null
      // Strip any leading "Lumo's take:" the model occasionally adds.
      return text.replace(/^["']?(?:lumo['']?s take:?\s*)?["']?/i, '').trim()
    })
    .catch((err) => {
      console.warn('[lumo-take] Anthropic call failed:', err)
      return null
    })

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => {
      console.warn(`[lumo-take] timed out after ${timeoutMs}ms — skipping`)
      resolve(null)
    }, timeoutMs),
  )

  return Promise.race([callPromise, timeoutPromise])
}
