import { tempoWallet } from "wagmi/tempo"
import { createConfig, http } from "wagmi"

import { tempoTestnet } from "./chain"

/**
 * Wagmi config for the Tempo build. Single chain (Tempo testnet),
 * single connector (Tempo Wallet via dialog/iframe to wallet.tempo.xyz).
 *
 * Adds the `webAuthn` connector later if we want a non-dialog passkey
 * flow on the same domain.
 */
export const wagmiConfig = createConfig({
  chains: [tempoTestnet],
  connectors: [tempoWallet()],
  transports: {
    [tempoTestnet.id]: http(),
  },
})
