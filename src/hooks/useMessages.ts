import { useCallback, useEffect, useState } from "react"

export type Message = {
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
  isDemo?: boolean
}

const POLL_INTERVAL_MS = 3000

export function useMessages(handle: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!handle) {
      setMessages([])
      setIsLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/messages?handle=${encodeURIComponent(handle)}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data?.messages) ? data.messages : [])
      }
    } catch {
      // Network blip — keep last known list.
    } finally {
      setIsLoading(false)
    }
  }, [handle])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  return { messages, isLoading, refresh }
}

// Demo seed messages — only shown when the inbox is otherwise empty so
// the dashboard doesn't look broken on a brand-new account.
export const DEMO_MESSAGES: Message[] = [
  {
    id: "demo-1",
    recipientHandle: "",
    senderAddress: "0xDe3a1f8B79c0b58Be11A6b9c7E2F4F0B5c2D1e8A",
    intentId: "have-an-idea",
    intentLabel: "have an idea",
    amountAtomic: "100000",
    priceUsd: 0.1,
    messageText:
      "Loved your essay on stablecoin remittances. Would love to chat about a project I'm working on in Mexico City. Quick 15-min call?",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isDemo: true,
  },
  {
    id: "demo-2",
    recipientHandle: "",
    senderAddress: "0x8a2C5E91d4B3F7Cd6F4A1E0e8c7d6b5A4F3E2d1C",
    intentId: "kind-of-important",
    intentLabel: "kind of important",
    amountAtomic: "1000000",
    priceUsd: 1,
    messageText:
      "Saw your LinkedIn post. Are you angel investing? Have a fintech raise that might fit.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isDemo: true,
  },
]
