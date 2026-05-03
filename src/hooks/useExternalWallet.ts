import { useEffect, useState } from "react"

const BASE_SEPOLIA_CHAIN_HEX = "0x14a34" // 84532

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider
  }
}

/**
 * Connects to a browser wallet extension (Coinbase Wallet, MetaMask, etc.)
 * via the EIP-1193 provider exposed at window.ethereum. Switches the wallet
 * to Base Sepolia (adding the chain if the wallet doesn't know it).
 */
export function useExternalWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAvailable = typeof window !== "undefined" && !!window.ethereum

  const connect = async () => {
    if (!window.ethereum) {
      setError(
        "No browser wallet detected. Install Coinbase Wallet (or another extension) and refresh.",
      )
      return
    }
    setIsConnecting(true)
    setError(null)

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[]

      if (!accounts || accounts.length === 0) {
        setError("No accounts returned by wallet.")
        setIsConnecting(false)
        return
      }

      const chainId = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string

      if (chainId !== BASE_SEPOLIA_CHAIN_HEX) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BASE_SEPOLIA_CHAIN_HEX }],
          })
        } catch (switchErr) {
          // 4902 = unrecognized chain — add it
          if ((switchErr as { code?: number })?.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: BASE_SEPOLIA_CHAIN_HEX,
                  chainName: "Base Sepolia",
                  nativeCurrency: {
                    name: "Sepolia Ether",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["https://sepolia.base.org"],
                  blockExplorerUrls: ["https://sepolia.basescan.org"],
                },
              ],
            })
          } else {
            throw switchErr
          }
        }
      }

      setAddress(accounts[0])
    } catch (e) {
      const err = e as { message?: string; code?: number }
      if (err?.code === 4001) {
        setError("Connection cancelled.")
      } else {
        setError(err?.message || "Couldn't connect wallet.")
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setAddress(null)
    setError(null)
  }

  useEffect(() => {
    if (!window.ethereum?.on) return
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      setAddress(accounts.length > 0 ? accounts[0] : null)
    }
    window.ethereum.on("accountsChanged", onAccountsChanged)
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccountsChanged)
    }
  }, [])

  return { address, connect, disconnect, isConnecting, error, isAvailable }
}
