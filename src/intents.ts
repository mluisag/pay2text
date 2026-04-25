export type Intent = {
  id: string
  label: string
  priceUsd: number
  displayPrice: string
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
