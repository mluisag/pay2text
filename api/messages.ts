import { Credential, Receipt } from 'mppx'

import { keys, redis, type Creator } from './_lib/redis.js'
import { sendMessageEmail } from './_lib/email.js'
import { generateLumoTake } from './_lib/lumo-take.js'
import { mppx } from './_lib/mppx.js'
import { wrap } from './_lib/web-handler.js'
import { INTENTS } from '../src/intents.js'

type StoredMessage = {
  id: string
  recipientHandle: string
  senderAddress: string
  intentId: string
  intentLabel: string
  amountAtomic: string
  priceUsd: number
  messageText: string
  replyTo?: string
  lumoTake?: string
  txHash?: string
  timestamp: string
}

export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url)

  if (request.method === 'GET') {
    try {
      const handle = url.searchParams.get('handle')
      if (!handle) return Response.json({ error: 'missing_handle' }, { status: 400 })

      const items = await redis.lrange(keys.messages(handle), 0, -1)
      const messages = items.map((it) =>
        typeof it === 'string' ? JSON.parse(it) : it,
      )
      return Response.json({ messages })
    } catch (err) {
      console.error('messages GET error:', err)
      return Response.json({ error: 'server_error' }, { status: 500 })
    }
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { Allow: 'GET, POST', 'Content-Type': 'application/json' },
    })
  }

  try {
    const bodyText = await request.text()
    let body: { handle?: unknown; intentId?: unknown; message?: unknown; replyTo?: unknown }
    try {
      body = JSON.parse(bodyText)
    } catch {
      return Response.json({ error: 'invalid_body' }, { status: 400 })
    }
    const { handle, intentId, message, replyTo } = body

    if (
      typeof handle !== 'string' ||
      typeof intentId !== 'string' ||
      typeof message !== 'string'
    ) {
      return Response.json({ error: 'invalid_body' }, { status: 400 })
    }

    const trimmedReplyTo =
      typeof replyTo === 'string' && replyTo.trim().length > 0 && replyTo.trim().length <= 200
        ? replyTo.trim()
        : undefined

    const trimmedMessage = message.trim()
    if (trimmedMessage.length === 0 || trimmedMessage.length > 1000) {
      return Response.json({ error: 'invalid_message_length' }, { status: 400 })
    }

    const creator = await redis.get<Creator>(keys.creator(handle))
    if (!creator) return Response.json({ error: 'recipient_not_found' }, { status: 404 })

    const intent = INTENTS.find((i) => i.id === intentId)
    if (!intent) return Response.json({ error: 'invalid_intent' }, { status: 400 })

    // Reconstruct a Request for mppx (mppx may consume the body internally;
    // safer to give it a fresh one with the bytes we already buffered).
    const mppxRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: bodyText,
    })

    const result = await mppx.tempo.charge({
      amount: intent.priceUsd.toFixed(2),
      recipient: creator.walletAddress,
      description: `${intent.label} for @${creator.handle}`,
    })(mppxRequest)

    if (result.status === 402) {
      // Client hasn't paid yet — return the WWW-Authenticate challenge.
      return result.challenge
    }

    // Payment verified. Pull sender + tx hash from the credential and receipt.
    let senderAddress = ''
    try {
      const cred = Credential.fromRequest(request)
      // source is a DID like "did:pkh:eip155:42431:0xabc..."
      const m = cred?.source?.match(/0x[a-fA-F0-9]{40}/)
      if (m) senderAddress = m[0]
    } catch (e) {
      console.warn('[messages] failed to read credential source:', e)
    }

    let txHash: string | undefined
    try {
      // Probe the withReceipt response to read the Payment-Receipt header,
      // which carries the on-chain reference. We'll re-call withReceipt
      // below on the real success response.
      const probe = result.withReceipt(new Response())
      const receiptHeader = probe.headers.get('Payment-Receipt')
      if (receiptHeader) {
        const receipt = Receipt.deserialize(receiptHeader)
        if (receipt.reference) txHash = receipt.reference
      }
    } catch (e) {
      console.warn('[messages] failed to extract receipt:', e)
    }

    const atomicAmount = BigInt(Math.round(intent.priceUsd * 1_000_000))

    const lumoTake = await generateLumoTake({
      intentLabel: intent.label,
      messageText: trimmedMessage,
      replyTo: trimmedReplyTo,
    })
    if (lumoTake) {
      console.log(`[messages] Lumo take generated (${lumoTake.length} chars)`)
    }

    const messageRecord: StoredMessage = {
      id: crypto.randomUUID(),
      recipientHandle: creator.handle,
      senderAddress,
      intentId: intent.id,
      intentLabel: intent.label,
      amountAtomic: atomicAmount.toString(),
      priceUsd: intent.priceUsd,
      messageText: trimmedMessage,
      replyTo: trimmedReplyTo,
      lumoTake: lumoTake ?? undefined,
      txHash,
      timestamp: new Date().toISOString(),
    }

    await redis.lpush(keys.messages(creator.handle), JSON.stringify(messageRecord))
    console.log(
      `[messages] saved id=${messageRecord.id} for @${creator.handle}, intent=${intent.id}, amount=${intent.displayPrice}`,
    )

    if (!creator.email) {
      console.warn(
        `[messages] no email saved for @${creator.handle} — skipping email forward`,
      )
    } else {
      const emailResult = await sendMessageEmail({
        toEmail: creator.email,
        recipientHandle: creator.handle,
        intentLabel: intent.label,
        amountDisplay: intent.displayPrice,
        senderAddress: messageRecord.senderAddress,
        messageText: messageRecord.messageText,
        replyTo: messageRecord.replyTo,
        lumoTake: messageRecord.lumoTake,
      })
      if (!emailResult.sent) {
        console.warn(
          `[messages] email forward to ${creator.email} FAILED:`,
          emailResult.reason,
        )
      }
    }

    return result.withReceipt(
      Response.json({ ok: true, messageId: messageRecord.id, txHash: messageRecord.txHash }),
    )
  } catch (err) {
    console.error('messages handler error:', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}

export default wrap(handle)
