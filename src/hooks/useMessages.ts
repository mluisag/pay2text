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
  replyTo?: string
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
