import type { VercelRequest, VercelResponse } from '@vercel/node'
import { useFacilitator } from 'x402/verify'
import { decodePayment } from 'x402/schemes'
import { settleResponseHeader, type PaymentRequirements } from 'x402/types'

import { redis, type Creator } from './_lib/redis.js'
import { INTENTS, priceUsdToAtomicUsdc } from '../src/intents.js'

const FACILITATOR_URL = 'https://x402.org/facilitator'
const NETWORK = 'base-sepolia'
// USDC contract on Base Sepolia (Circle's official testnet USDC)
const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

const facilitator = useFacilitator({ url: FACILITATOR_URL })

type StoredMessage = {
  id: string
  recipientHandle: string
  senderAddress: string
  intentId: string
  intentLabel: string
  amountAtomic: string
  priceUsd: number
  messageText: string
  txHash?: string
  timestamp: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const handle = typeof req.query.handle === 'string' ? req.query.handle : null
      if (!handle) return res.status(400).json({ error: 'missing_handle' })

      const items = await redis.lrange(`messages:${handle.toLowerCase()}`, 0, -1)
      // Upstash sometimes auto-parses JSON, sometimes returns strings. Handle both.
      const messages = items.map((it) =>
        typeof it === 'string' ? JSON.parse(it) : it,
      )
      return res.status(200).json({ messages })
    } catch (err) {
      console.error('messages GET error:', err)
      return res.status(500).json({ error: 'server_error' })
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const { handle, intentId, message } = req.body ?? {}

    if (
      typeof handle !== 'string' ||
      typeof intentId !== 'string' ||
      typeof message !== 'string'
    ) {
      return res.status(400).json({ error: 'invalid_body' })
    }

    const trimmedMessage = message.trim()
    if (trimmedMessage.length === 0 || trimmedMessage.length > 1000) {
      return res.status(400).json({ error: 'invalid_message_length' })
    }

    const creator = await redis.get<Creator>(`creator:${handle.toLowerCase()}`)
    if (!creator) return res.status(404).json({ error: 'recipient_not_found' })

    const intent = INTENTS.find((i) => i.id === intentId)
    if (!intent) return res.status(400).json({ error: 'invalid_intent' })

    const atomicAmount = priceUsdToAtomicUsdc(intent.priceUsd)

    const requirements: PaymentRequirements = {
      scheme: 'exact',
      network: NETWORK,
      maxAmountRequired: atomicAmount.toString(),
      resource: 'https://pay2text.xyz/api/messages',
      description: `${intent.label} for @${creator.handle}`,
      mimeType: 'application/json',
      payTo: creator.walletAddress,
      maxTimeoutSeconds: 60,
      asset: USDC_BASE_SEPOLIA,
      extra: {
        name: 'USDC',
        version: '2',
      },
    }

    const paymentHeader = req.headers['x-payment']
    if (!paymentHeader || typeof paymentHeader !== 'string') {
      return res.status(402).json({
        x402Version: 1,
        accepts: [requirements],
        error: 'payment_required',
      })
    }

    let payload
    try {
      payload = decodePayment(paymentHeader)
    } catch {
      return res.status(400).json({ error: 'invalid_payment_header' })
    }

    const verifyResult = await facilitator.verify(payload, requirements)
    if (!verifyResult.isValid) {
      return res.status(402).json({
        x402Version: 1,
        accepts: [requirements],
        error: 'payment_invalid',
        reason: verifyResult.invalidReason,
      })
    }

    const settleResult = await facilitator.settle(payload, requirements)
    if (!settleResult.success) {
      return res.status(402).json({
        x402Version: 1,
        accepts: [requirements],
        error: 'payment_settle_failed',
        reason: settleResult.errorReason,
      })
    }

    const senderAddress =
      'authorization' in payload.payload && payload.payload.authorization?.from
        ? String(payload.payload.authorization.from)
        : ''

    const messageRecord: StoredMessage = {
      id: crypto.randomUUID(),
      recipientHandle: creator.handle,
      senderAddress,
      intentId: intent.id,
      intentLabel: intent.label,
      amountAtomic: atomicAmount.toString(),
      priceUsd: intent.priceUsd,
      messageText: trimmedMessage,
      txHash: settleResult.transaction,
      timestamp: new Date().toISOString(),
    }

    await redis.lpush(`messages:${creator.handle}`, JSON.stringify(messageRecord))

    res.setHeader('X-PAYMENT-RESPONSE', settleResponseHeader(settleResult))
    return res.status(200).json({ ok: true, messageId: messageRecord.id })
  } catch (err) {
    console.error('messages handler error:', err)
    return res.status(500).json({ error: 'server_error' })
  }
}
