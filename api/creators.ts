import { keys, redis, type Creator } from './_lib/redis.js'

const HANDLE_REGEX = /^[a-z0-9]{3,32}$/

export default async function handler(request: Request): Promise<Response> {
  try {
    // request.url is relative on Vercel ('/api/...?...') and absolute in
    // the local dev plugin. Provide a base so URL() handles both shapes.
    const url = new URL(
      request.url,
      `http://${request.headers.get('host') ?? 'localhost'}`,
    )

    if (request.method === 'GET') {
      const handle = url.searchParams.get('handle')
      const walletAddress = url.searchParams.get('walletAddress')

      if (handle) {
        const creator = await redis.get<Creator>(keys.creator(handle))
        if (!creator) return Response.json({ error: 'not_found' }, { status: 404 })
        return Response.json(creator)
      }

      if (walletAddress) {
        const handleForWallet = await redis.get<string>(keys.wallet(walletAddress))
        if (!handleForWallet) return Response.json({ error: 'not_found' }, { status: 404 })
        const creator = await redis.get<Creator>(keys.creator(handleForWallet))
        if (!creator) return Response.json({ error: 'not_found' }, { status: 404 })
        return Response.json(creator)
      }

      return Response.json({ error: 'missing_query_param' }, { status: 400 })
    }

    if (request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as
        | { handle?: unknown; walletAddress?: unknown; email?: unknown }
        | null
      if (!body) return Response.json({ error: 'invalid_body' }, { status: 400 })
      const { handle, walletAddress, email } = body

      if (typeof handle !== 'string' || typeof walletAddress !== 'string') {
        return Response.json({ error: 'invalid_body' }, { status: 400 })
      }

      const normalizedHandle = handle.toLowerCase().trim()
      const normalizedAddress = walletAddress.toLowerCase()

      if (!HANDLE_REGEX.test(normalizedHandle)) {
        return Response.json({ error: 'invalid_handle' }, { status: 400 })
      }

      const existingHandle = await redis.get(keys.creator(normalizedHandle))
      if (existingHandle) return Response.json({ error: 'handle_taken' }, { status: 409 })

      const existingWallet = await redis.get(keys.wallet(normalizedAddress))
      if (existingWallet) {
        return Response.json({ error: 'wallet_already_registered' }, { status: 409 })
      }

      const creator: Creator = {
        handle: normalizedHandle,
        walletAddress: normalizedAddress,
        email: typeof email === 'string' && email.trim() !== '' ? email.trim() : undefined,
        createdAt: new Date().toISOString(),
      }

      await redis.set(keys.creator(normalizedHandle), creator)
      await redis.set(keys.wallet(normalizedAddress), normalizedHandle)

      return Response.json(creator, { status: 201 })
    }

    if (request.method === 'PATCH') {
      const body = (await request.json().catch(() => null)) as
        | { walletAddress?: unknown; email?: unknown }
        | null
      if (!body || typeof body.walletAddress !== 'string') {
        return Response.json({ error: 'invalid_body' }, { status: 400 })
      }

      const normalizedAddress = body.walletAddress.toLowerCase()
      const handleForWallet = await redis.get<string>(keys.wallet(normalizedAddress))
      if (!handleForWallet) return Response.json({ error: 'not_found' }, { status: 404 })

      const existing = await redis.get<Creator>(keys.creator(handleForWallet))
      if (!existing) return Response.json({ error: 'not_found' }, { status: 404 })

      const nextEmail =
        typeof body.email === 'string'
          ? body.email.trim() === ''
            ? undefined
            : body.email.trim()
          : existing.email

      const updated: Creator = { ...existing, email: nextEmail }
      await redis.set(keys.creator(handleForWallet), updated)
      return Response.json(updated)
    }

    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { Allow: 'GET, POST, PATCH', 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('creators handler error:', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
