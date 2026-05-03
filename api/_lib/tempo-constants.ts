/**
 * Backend mirrors of the Tempo constants in src/chain.ts.
 * Duplicated (not re-exported) because api/ files compile as Node ESM
 * via Vercel and importing from src/ pulls in viem/React surface.
 */
export const PATHUSD_TESTNET = '0x20c0000000000000000000000000000000000000'
export const TEMPO_TESTNET_DECIMALS = 6
export const TEMPO_TESTNET_CHAIN_ID = 42431
