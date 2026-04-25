export type Intent = {
  id: string
  label: string
  priceUsd: number | null
  displayPrice: string
}

export const INTENTS: Intent[] = [
  {
    id: 'just-saying-hi',
    label: 'Just saying hi',
    priceUsd: 0.013,
    displayPrice: '1.3¢',
  },
  {
    id: 'want-to-meet',
    label: 'Want to meet you',
    priceUsd: 0.13,
    displayPrice: '13¢',
  },
  {
    id: 'pitching',
    label: 'Pitching you something',
    priceUsd: 0.13,
    displayPrice: '13¢',
  },
  {
    id: 'hoping-reply',
    label: "Hoping you'll reply",
    priceUsd: 1.30,
    displayPrice: '$1.30',
  },
  {
    id: 'something-else',
    label: 'Something else',
    priceUsd: null,
    displayPrice: 'you choose',
  },
]
