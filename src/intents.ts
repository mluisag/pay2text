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
    label: 'just saying hi',
    priceUsd: 0.001,
    displayPrice: '0.1¢',
  },
  {
    id: 'got-a-minute',
    label: 'got a minute?',
    priceUsd: 0.01,
    displayPrice: '1¢',
  },
  {
    id: 'have-an-idea',
    label: 'have an idea',
    priceUsd: 0.10,
    displayPrice: '10¢',
  },
  {
    id: 'kind-of-important',
    label: 'kind of important',
    priceUsd: 1.00,
    displayPrice: '$1',
  },
  {
    id: 'i-love-you',
    label: 'I love you',
    priceUsd: 10.00,
    displayPrice: '$10',
  },
]
