import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

/**
 * Namespaced Redis keys for the Tempo build. The `tempo:` prefix isolates
 * us from the live pay2text.xyz site, which shares the same Upstash
 * instance but uses unprefixed `creator:` / `messages:` / `wallet:` keys.
 * Single source of truth — every handler uses these helpers.
 */
export const keys = {
  creator: (handle: string) => `tempo:creator:${handle.toLowerCase()}`,
  messages: (handle: string) => `tempo:messages:${handle.toLowerCase()}`,
  wallet: (address: string) => `tempo:wallet:${address.toLowerCase()}`,
}

export type Creator = {
  handle: string
  walletAddress: string
  email?: string
  createdAt: string
}
