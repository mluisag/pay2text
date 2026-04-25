import { useEvmAddress } from "@coinbase/cdp-hooks"
import { useCallback, useEffect, useState } from "react"

export type Creator = {
  handle: string
  walletAddress: string
  email?: string
  createdAt: string
}

export function useCreatorProfile() {
  const { evmAddress } = useEvmAddress()
  const [creator, setCreator] = useState<Creator | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!evmAddress) {
      setCreator(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/creators?walletAddress=${evmAddress}`)
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
  }, [evmAddress])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { creator, isLoading, refresh }
}
