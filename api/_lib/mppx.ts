import { Mppx, tempo } from 'mppx/server'

import { PATHUSD_TESTNET, TEMPO_TESTNET_DECIMALS } from './tempo-constants.js'

/**
 * Server-side MPP handler for Tempo testnet charges.
 *
 * Env vars (both required, auto-resolved by mppx):
 *   - MPP_SECRET_KEY: HMAC secret for stateless credential verification
 *     (any random ≥32-byte hex string). mppx throws at first call if unset.
 *   - MPPX_PRIVATE_KEY: server fee-payer key. Funds gas (in pathUSD) when
 *     co-signing client charges. Must hold pathUSD on Tempo testnet.
 *
 * We register only `tempo.charge` (not the full `tempo()` shorthand) because
 * the shorthand also wires the session method, which requires a `viem Account`
 * and is unused on this build.
 *
 * Per-call we pass `recipient` since each @handle has a different payee.
 */
export const mppx = Mppx.create({
  methods: [
    tempo.charge({
      testnet: true,
      currency: PATHUSD_TESTNET,
      decimals: TEMPO_TESTNET_DECIMALS,
    }),
  ],
})
