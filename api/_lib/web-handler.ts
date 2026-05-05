import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Vercel's @vercel/node runtime passes Node IncomingMessage/ServerResponse,
 * not Web Request/Response — even when the source file is written with the
 * Web shape. This wrapper lets each handler stay authored against
 * `(request: Request) => Promise<Response>` while exporting a Node-style
 * default that Vercel actually invokes.
 *
 * The dev API plugin in vite.config.ts does the same conversion in its own
 * middleware path; both paths import the same handler body so the runtimes
 * stay in lockstep.
 */
export type WebHandler = (request: Request) => Promise<Response>

export function wrap(handler: WebHandler) {
  return async function nodeHandler(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const request = await nodeToWebRequest(req)
      const response = await handler(request)

      res.statusCode = response.status
      response.headers.forEach((val, key) => {
        res.setHeader(key, val)
      })

      if (response.body) {
        const reader = response.body.getReader()
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          res.write(value)
        }
      }
      res.end()
    } catch (err) {
      console.error('[web-handler] adapter failed:', err)
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
      }
      res.end(JSON.stringify({ error: 'server_error' }))
    }
  }
}

async function nodeToWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? 'localhost'
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const url = `${proto}://${host}${req.url ?? '/'}`

  const headers = new Headers()
  for (const [key, val] of Object.entries(req.headers)) {
    if (Array.isArray(val)) headers.set(key, val.join(', '))
    else if (val !== undefined) headers.set(key, val)
  }

  let body: Buffer | undefined
  const method = req.method ?? 'GET'
  if (method !== 'GET' && method !== 'HEAD') {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    body = Buffer.concat(chunks)
  }

  return new Request(url, {
    method,
    headers,
    body: body && body.length > 0 ? body : undefined,
    duplex: 'half',
  } as RequestInit & { duplex?: 'half' })
}
