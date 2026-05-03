import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createWalletClient, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { wrapFetchWithPayment } from 'x402-fetch'

import { redis, type Creator } from '../_lib/redis.js'
import { INTENTS } from '../../src/intents.js'

const MAX_PAYMENT_ATOMIC = 11_000_000n // 11 USDC ceiling

type AgentStep = {
  label: string
  detail?: string
  state: 'thinking' | 'done' | 'error'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const steps: AgentStep[] = []

  try {
    const { handle } = (req.body ?? {}) as { handle?: string }
    if (typeof handle !== 'string' || !handle) {
      return res.status(400).json({ error: 'missing_handle' })
    }

    // 1. Confirm recipient exists
    const creator = await redis.get<Creator>(`creator:${handle.toLowerCase()}`)
    if (!creator) return res.status(404).json({ error: 'recipient_not_found' })
    steps.push({
      label: `Found @${creator.handle}`,
      detail: `Recipient wallet ${shorten(creator.walletAddress)}`,
      state: 'done',
    })

    // 2. Confirm credentials
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const agentKey = process.env.AGENT_WALLET_PRIVATE_KEY
    if (!anthropicKey) {
      return res
        .status(500)
        .json({ error: 'agent_not_configured', detail: 'Set ANTHROPIC_API_KEY' })
    }
    if (!agentKey) {
      return res.status(500).json({
        error: 'agent_not_configured',
        detail: 'Set AGENT_WALLET_PRIVATE_KEY (a fresh dev wallet, not your main one)',
      })
    }

    // 3. Ask Claude to choose an intent and write a message
    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const intentSummary = INTENTS.map(
      (i) => `- "${i.id}" (${i.displayPrice}) — ${i.label}`,
    ).join('\n')

    const prompt = `You are an autonomous agent reaching out to @${creator.handle} on pay2text.xyz, a platform where every message costs USDC. Your goal: send one short, sincere message.

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
      return res.status(500).json({
        error: 'bad_agent_response',
        detail: 'Claude did not return valid JSON',
        rawText,
      })
    }

    const intent = INTENTS.find((i) => i.id === decision.intentId)
    if (!intent) {
      return res
        .status(500)
        .json({ error: 'invalid_intent_choice', chosen: decision.intentId })
    }

    steps[steps.length - 1] = {
      label: `Decided: "${intent.label}" (${intent.displayPrice})`,
      detail: decision.reasoning,
      state: 'done',
    }
    steps.push({
      label: 'Drafted message',
      detail: decision.message,
      state: 'done',
    })

    // 4. Build the agent's signing wallet
    const account = privateKeyToAccount(agentKey as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    }).extend(publicActions)

    steps.push({
      label: 'Loading agent wallet…',
      detail: shorten(account.address),
      state: 'done',
    })

    // 5. Pay via x402 and post the message
    const fetchWithPayment = wrapFetchWithPayment(
      fetch,
      walletClient as unknown as Parameters<typeof wrapFetchWithPayment>[1],
      MAX_PAYMENT_ATOMIC,
    )

    steps.push({
      label: `Paying ${intent.displayPrice} on Base Sepolia…`,
      state: 'thinking',
    })

    const baseUrl = `https://${req.headers.host ?? 'pay2text.xyz'}`
    const payRes = await fetchWithPayment(`${baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: creator.handle,
        intentId: intent.id,
        message: decision.message,
      }),
    })

    if (!payRes.ok) {
      const body = await payRes.json().catch(() => ({}))
      steps[steps.length - 1] = {
        label: 'Payment failed',
        detail: String(body?.reason ?? body?.error ?? `status ${payRes.status}`),
        state: 'error',
      }
      return res.status(502).json({ error: 'payment_failed', steps, details: body })
    }

    const xPaymentResponse = payRes.headers.get('x-payment-response')
    let txHash: string | undefined
    if (xPaymentResponse) {
      try {
        const decoded = JSON.parse(
          Buffer.from(xPaymentResponse, 'base64').toString('utf-8'),
        )
        if (typeof decoded.transaction === 'string') txHash = decoded.transaction
      } catch {
        /* ignore */
      }
    }

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

    return res.status(200).json({
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
    return res.status(500).json({
      error: 'server_error',
      detail: err instanceof Error ? err.message : 'unknown',
      steps,
    })
  }
}

function shorten(addr: string): string {
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
}
