import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  // The wagmi/tempo `tempoWallet()` connector lazy-imports `accounts` via
  // `await import('accounts')` inside its connect handler. Vite's dev server
  // only pre-bundles deps it can discover from static imports in source —
  // and we never import `accounts` directly. Without this hint, the runtime
  // import resolves through Vite's on-the-fly path which fails on packages
  // with non-trivial export maps. Pre-bundling sidesteps the problem.
  optimizeDeps: {
    include: ["accounts"],
  },
})
