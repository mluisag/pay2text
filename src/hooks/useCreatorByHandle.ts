import { useEffect, useState } from "react"

import type { Creator } from "./useCreatorProfile"

export function useCreatorByHandle(handle: string | undefined) {
  const [creator, setCreator] = useState<Creator | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!handle) {
      setIsLoading(false)
      setNotFound(true)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setNotFound(false)

    fetch(`/api/creators?handle=${encodeURIComponent(handle)}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setNotFound(true)
          setCreator(null)
        } else if (res.ok) {
          setCreator(await res.json())
          setNotFound(false)
        } else {
          setNotFound(true)
          setCreator(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true)
          setCreator(null)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [handle])

  return { creator, isLoading, notFound }
}
