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
 * Per-call we still pass `recipient` (the creator's wallet) since each
 * @handle has a different payee.
 */
export const mppx = Mppx.create({
  methods: [
    tempo({
      testnet: true,
      currency: PATHUSD_TESTNET,
      decimals: TEMPO_TESTNET_DECIMALS,
    }),
  ],
})
