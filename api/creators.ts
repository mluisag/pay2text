import type { VercelRequest, VercelResponse } from '@vercel/node'

import { redis, type Creator } from './_lib/redis.js'

const HANDLE_REGEX = /^[a-z0-9]{3,32}$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const handle = typeof req.query.handle === 'string' ? req.query.handle : null
      const walletAddress =
        typeof req.query.walletAddress === 'string' ? req.query.walletAddress : null

      if (handle) {
        const creator = await redis.get<Creator>(`creator:${handle.toLowerCase()}`)
        if (!creator) return res.status(404).json({ error: 'not_found' })
        return res.status(200).json(creator)
      }

      if (walletAddress) {
        const handleForWallet = await redis.get<string>(`wallet:${walletAddress.toLowerCase()}`)
        if (!handleForWallet) return res.status(404).json({ error: 'not_found' })
        const creator = await redis.get<Creator>(`creator:${handleForWallet}`)
        if (!creator) return res.status(404).json({ error: 'not_found' })
        return res.status(200).json(creator)
      }

      return res.status(400).json({ error: 'missing_query_param' })
    }

    if (req.method === 'POST') {
      const { handle, walletAddress, email } = req.body ?? {}

      if (typeof handle !== 'string' || typeof walletAddress !== 'string') {
        return res.status(400).json({ error: 'invalid_body' })
      }

      const normalizedHandle = handle.toLowerCase().trim()
      const normalizedAddress = walletAddress.toLowerCase()

      if (!HANDLE_REGEX.test(normalizedHandle)) {
        return res.status(400).json({ error: 'invalid_handle' })
      }

      const existingHandle = await redis.get(`creator:${normalizedHandle}`)
      if (existingHandle) return res.status(409).json({ error: 'handle_taken' })

      const existingWallet = await redis.get(`wallet:${normalizedAddress}`)
      if (existingWallet) return res.status(409).json({ error: 'wallet_already_registered' })

      const creator: Creator = {
        handle: normalizedHandle,
        walletAddress: normalizedAddress,
        email: typeof email === 'string' && email.trim() !== '' ? email.trim() : undefined,
        createdAt: new Date().toISOString(),
      }

      await redis.set(`creator:${normalizedHandle}`, creator)
      await redis.set(`wallet:${normalizedAddress}`, normalizedHandle)

      return res.status(201).json(creator)
    }

    if (req.method === 'PATCH') {
      const { walletAddress, email } = req.body ?? {}
      if (typeof walletAddress !== 'string') {
        return res.status(400).json({ error: 'invalid_body' })
      }
      const normalizedAddress = walletAddress.toLowerCase()
      const handleForWallet = await redis.get<string>(`wallet:${normalizedAddress}`)
      if (!handleForWallet) return res.status(404).json({ error: 'not_found' })

      const existing = await redis.get<Creator>(`creator:${handleForWallet}`)
      if (!existing) return res.status(404).json({ error: 'not_found' })

      // Only fields we currently allow editing.
      const nextEmail =
        typeof email === 'string'
          ? email.trim() === ''
            ? undefined
            : email.trim()
          : existing.email

      const updated: Creator = { ...existing, email: nextEmail }
      await redis.set(`creator:${handleForWallet}`, updated)
      return res.status(200).json(updated)
    }

    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ error: 'method_not_allowed' })
  } catch (err) {
    console.error('creators handler error:', err)
    return res.status(500).json({ error: 'server_error' })
  }
}
