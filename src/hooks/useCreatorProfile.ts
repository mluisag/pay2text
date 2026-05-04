import { useCallback, useEffect, useState } from "react"
import { useAccount } from "wagmi"

export type Creator = {
  handle: string
  walletAddress: string
  email?: string
  createdAt: string
}

export function useCreatorProfile() {
  const { address } = useAccount()
  const [creator, setCreator] = useState<Creator | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!address) {
      setCreator(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/creators?walletAddress=${address}`)
      if (res.status === 404) {
        setCreator(null)
      } else if (res.ok) {
        setCreator(await res.json())
      } else {
        setCreator(null)
      }
    } catch {
      setCreator(null)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { creator, isLoading, refresh }
}
