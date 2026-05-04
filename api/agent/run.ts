import Anthropic from '@anthropic-ai/sdk'
import { Mppx, tempo } from 'mppx/client'
import { privateKeyToAccount } from 'viem/accounts'

import { keys, redis, type Creator } from '../_lib/redis.js'
import { INTENTS } from '../../src/intents.js'

type AgentStep = {
  label: string
  detail?: string
  state: 'thinking' | 'done' | 'error'
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json' },
    })
  }

  const steps: AgentStep[] = []

  try {
    const body = (await request.json().catch(() => ({}))) as { handle?: string }
    const handle = body.handle
    if (typeof handle !== 'string' || !handle) {
      return Response.json({ error: 'missing_handle' }, { status: 400 })
    }

    const creator = await redis.get<Creator>(keys.creator(handle))
    if (!creator) return Response.json({ error: 'recipient_not_found' }, { status: 404 })
    steps.push({
      label: `Found @${creator.handle}`,
      detail: `Recipient wallet ${shorten(creator.walletAddress)}`,
      state: 'done',
    })

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const agentKey = process.env.AGENT_WALLET_PRIVATE_KEY
    if (!anthropicKey) {
      return Response.json(
        { error: 'agent_not_configured', detail: 'Set ANTHROPIC_API_KEY' },
        { status: 500 },
      )
    }
    if (!agentKey) {
      return Response.json(
        {
          error: 'agent_not_configured',
          detail: 'Set AGENT_WALLET_PRIVATE_KEY (a fresh dev wallet, not your main one)',
        },
        { status: 500 },
      )
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const intentSummary = INTENTS.map(
      (i) => `- "${i.id}" (${i.displayPrice}) — ${i.label}`,
    ).join('\n')

    const prompt = `You are an autonomous agent reaching out to @${creator.handle} on pay2text.xyz, a platform where every message costs pathUSD on Tempo. Your goal: send one short, sincere message.

The price is the filter — pick an intent that genuinely matches the importance of what you want to say. Don't overpay for a casual hello and don't underpay for something meaningful.

Available intents:
${intentSummary}

Write a brief, human message (max 200 characters). No greeting like "Hi", no signoff. Be direct.

Respond ONLY with valid JSON, no prose, no code fences. Format:
{"intentId": "<id>", "message": "<text>", "reasoning": "<one sentence on why you picked this intent>"}`

    steps.push({ label: 'Asking Claude what to send…', state: 'thinking' })

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = completion.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('')

    let decision: { intentId: string; message: string; reasoning: string }
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
      decision = JSON.parse(cleaned)
    } catch {
      return Response.json(
        { error: 'bad_agent_response', detail: 'Claude did not return valid JSON', rawText },
        { status: 500 },
      )
    }

    const intent = INTENTS.find((i) => i.id === decision.intentId)
    if (!intent) {
      return Response.json(
        { error: 'invalid_intent_choice', chosen: decision.intentId },
        { status: 500 },
      )
    }

    steps[steps.length - 1] = {
      label: `Decided: "${intent.label}" (${intent.displayPrice})`,
      detail: decision.reasoning,
      state: 'done',
    }
    steps.push({ label: 'Drafted message', detail: decision.message, state: 'done' })

    const account = privateKeyToAccount(agentKey as `0x${string}`)
    steps.push({
      label: 'Loading agent wallet…',
      detail: shorten(account.address),
      state: 'done',
    })

    // Build an mppx client scoped to this request — `polyfill: false` so we
    // don't pollute the serverless function's global fetch across calls.
    const client = Mppx.create({
      methods: [tempo({ account })],
      polyfill: false,
    })

    steps.push({
      label: `Paying ${intent.displayPrice} on Tempo testnet…`,
      state: 'thinking',
    })

    const baseUrl = `https://${request.headers.get('host') ?? 'tempo.pay2text.xyz'}`
    const payRes = await client.fetch(`${baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: creator.handle,
        intentId: intent.id,
        message: decision.message,
      }),
    })

    if (!payRes.ok) {
      const errBody = await payRes.json().catch(() => ({}))
      steps[steps.length - 1] = {
        label: 'Payment failed',
        detail: String(
          (errBody as { reason?: unknown; error?: unknown }).reason ??
            (errBody as { error?: unknown }).error ??
            `status ${payRes.status}`,
        ),
        state: 'error',
      }
      return Response.json({ error: 'payment_failed', steps, details: errBody }, { status: 502 })
    }

    const payJson = (await payRes.json().catch(() => ({}))) as { txHash?: string }
    const txHash = typeof payJson.txHash === 'string' ? payJson.txHash : undefined

    steps[steps.length - 1] = {
      label: `Paid ${intent.displayPrice} → @${creator.handle}`,
      detail: txHash
        ? `tx ${txHash.slice(0, 10)}…${txHash.slice(-6)}`
        : 'on-chain settlement complete',
      state: 'done',
    }

    steps.push({
      label: 'Message delivered',
      detail: 'Lumo let the agent in',
      state: 'done',
    })

    return Response.json({
      ok: true,
      steps,
      result: {
        intent,
        message: decision.message,
        reasoning: decision.reasoning,
        agentAddress: account.address,
        recipient: { handle: creator.handle, walletAddress: creator.walletAddress },
        txHash,
      },
    })
  } catch (err) {
    console.error('agent run error:', err)
    return Response.json(
      {
        error: 'server_error',
        detail: err instanceof Error ? err.message : 'unknown',
        steps,
      },
      { status: 500 },
    )
  }
}

function shorten(addr: string): string {
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
}
