import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export type Creator = {
  handle: string
  walletAddress: string
  email?: string
  createdAt: string
}
