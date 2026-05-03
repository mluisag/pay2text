import { defineChain } from "viem"

/**
 * Tempo testnet ("Moderato"). Defaults pulled from mppx 0.6.14
 * (tempo/internal/defaults.ts). Single source of truth for the
 * Tempo build — every chain reference imports from here.
 *
 * Tempo has no native gas token; fees are paid in TIP-20 stablecoins
 * (default pathUSD on testnet). The `nativeCurrency` block here is a
 * placeholder for EIP-1193 wallets that require it — wallet UIs will
 * display 0 since `eth_getBalance` returns an inflated sentinel value.
 */
export const TEMPO_TESTNET_CHAIN_ID = 42431
export const TEMPO_TESTNET_CHAIN_HEX = "0xa57f"
export const TEMPO_TESTNET_RPC = "https://rpc.moderato.tempo.xyz"
export const TEMPO_TESTNET_EXPLORER = "https://explore.testnet.tempo.xyz"
export const TEMPO_FAUCET_URL = "https://wallet.tempo.xyz"

/** pathUSD on Tempo testnet (TIP-20, 6 decimals). */
export const PATHUSD_TESTNET = "0x20c0000000000000000000000000000000000000"

export const tempoTestnet = defineChain({
  id: TEMPO_TESTNET_CHAIN_ID,
  name: "Tempo Testnet",
  nativeCurrency: { name: "Tempo Gas", symbol: "TEMPO", decimals: 18 },
  rpcUrls: {
    default: { http: [TEMPO_TESTNET_RPC] },
  },
  blockExplorers: {
    default: { name: "Tempo Explorer", url: TEMPO_TESTNET_EXPLORER },
  },
  testnet: true,
})

export const explorerTxUrl = (hash: string) => `${TEMPO_TESTNET_EXPLORER}/tx/${hash}`
export const explorerAddressUrl = (addr: string) =>
  `${TEMPO_TESTNET_EXPLORER}/address/${addr}`
