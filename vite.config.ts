import react from "@vitejs/plugin-react"
import dotenv from "dotenv"
import { resolve } from "node:path"
import { defineConfig, type Plugin, type ViteDevServer } from "vite"

// Load env files for the dev server's Node process so api/ handlers can
// read KV / Anthropic / Resend / mppx credentials. (Vite normally only
// exposes VITE_* vars; these are server-side.)
dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config({ path: resolve(process.cwd(), ".env") })

/**
 * Routes that exist as Vercel-style files under api/. In production Vercel
 * mounts each as a serverless function; in `vite dev` we mount them as
 * middleware here so the same fetch('/api/...') calls work locally.
 *
 * All handlers must use the Web Request → Response signature (not the
 * legacy `(req, res) => ...` Vercel shape) — the plugin doesn't adapt.
 */
const API_ROUTES: Record<string, string> = {
  "/api/creators": "/api/creators.ts",
  "/api/messages": "/api/messages.ts",
  "/api/agent/run": "/api/agent/run.ts",
}

function devApiPlugin(): Plugin {
  return {
    name: "lumo-tempo:dev-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ""
        const path = url.split("?")[0]
        const handlerPath = API_ROUTES[path]
        if (!handlerPath) return next()

        try {
          const mod = await server.ssrLoadModule(handlerPath)
          const handler = mod.default as (request: Request) => Promise<Response>
          if (typeof handler !== "function") return next()

          // Buffer the request body (Web Request needs it as bytes).
          let body: Buffer | undefined
          if (req.method && req.method !== "GET" && req.method !== "HEAD") {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            body = Buffer.concat(chunks)
          }

          const headers = new Headers()
          for (const [key, val] of Object.entries(req.headers)) {
            if (Array.isArray(val)) headers.set(key, val.join(", "))
            else if (val) headers.set(key, val)
          }

          const fullUrl = `http://${req.headers.host ?? "localhost"}${url}`
          const request = new Request(fullUrl, {
            method: req.method,
            headers,
            body: body && body.length > 0 ? body : undefined,
            duplex: "half",
          } as RequestInit & { duplex?: "half" })

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
        } catch (e) {
          console.error(`[dev-api] ${path} failed:`, e)
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(
            JSON.stringify({
              error: "dev_api_error",
              detail: e instanceof Error ? e.message : String(e),
            }),
          )
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  server: {
    port: 3000,
  },
  // The wagmi/tempo `tempoWallet()` connector lazy-imports `accounts` via
  // `await import('accounts')` inside its connect handler. Pre-bundling
  // sidesteps Vite's on-the-fly resolver, which chokes on the package's
  // export map.
  optimizeDeps: {
    include: ["accounts"],
  },
})
