export type Intent = {
  id: string
  label: string
  priceUsd: number
  displayPrice: string
}

/**
 * Converts a USD price to USDC atomic units (6 decimals).
 * Uses string arithmetic to avoid floating-point rounding errors at sub-cent amounts.
 * Example: 0.001 -> 1000n, 0.013 -> 13000n, 10 -> 10000000n.
 */
export function priceUsdToAtomicUsdc(priceUsd: number): bigint {
  const padded = priceUsd.toFixed(6).replace('.', '')
  return BigInt(padded)
}

export const INTENTS: Intent[] = [
  {
    id: 'just-saying-hi',
    label: 'Request warm intro',
    priceUsd: 0.001,
    displayPrice: '0.1¢',
  },
  {
    id: 'got-a-minute',
    label: 'Deck review',
    priceUsd: 0.01,
    displayPrice: '1¢',
  },
  {
    id: 'have-an-idea',
    label: 'Fund raising advice',
    priceUsd: 0.10,
    displayPrice: '10¢',
  },
  {
    id: 'kind-of-important',
    label: 'Initial discovery. 15 min',
    priceUsd: 1.00,
    displayPrice: '$1',
  },
  {
    id: 'i-love-you',
    label: 'Strategic partnership',
    priceUsd: 10.00,
    displayPrice: '$10',
  },
]
