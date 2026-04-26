import Anthropic from '@anthropic-ai/sdk'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const SYSTEM_PROMPT =
  "You are Lumo, a calm inbox guardian. Read this message and give ONE sentence assessment — what does this person want and is it worth the recipient's time? Be warm but honest. No exclamation marks."

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 90

/**
 * Asks Lumo (Claude Haiku) to read a paid message and produce a single-sentence
 * assessment for the recipient's dashboard. Returns null on any failure or when
 * ANTHROPIC_API_KEY isn't configured — never throws, never blocks.
 */
export async function generateLumoTake(args: {
  intentLabel: string
  messageText: string
  replyTo?: string
}): Promise<string | null> {
  if (!anthropic) {
    console.warn('[lumo-take] ANTHROPIC_API_KEY not set — skipping take.')
    return null
  }

  const userContent =
    `Intent: ${args.intentLabel}\n` +
    (args.replyTo ? `Reply to: ${args.replyTo}\n` : '') +
    `\nMessage:\n${args.messageText}`

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('')
      .trim()

    if (!text) {
      console.warn('[lumo-take] empty response from Anthropic')
      return null
    }

    // Strip any leading "Lumo's take:" the model occasionally adds.
    return text.replace(/^["']?(?:lumo['']?s take:?\s*)?["']?/i, '').trim()
  } catch (err) {
    console.warn('[lumo-take] Anthropic call failed:', err)
    return null
  }
}
