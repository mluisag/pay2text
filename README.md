# Lumo

> Inboxes are loud. Lumo is quiet.

Lumo is a calm presence that guards your inbox. Anyone gets a personal
link — `tempo.pay2text.xyz/{handle}` — that lets people pay a small toll
to send them a message. The price tells you who actually means it.

> This is the **Tempo build** of Lumo, running on Tempo testnet alongside
> the original [pay2text.xyz](https://pay2text.xyz) (Base + CDP + x402).
> Same product, different chain — for side-by-side comparison.

---

## The idea

Cold DMs are free. That's the problem.

Stripe charges a minimum of 30 cents per transaction — making true
micropayments economically impossible. Stablecoin-native chains and the
HTTP 402 payment standard change that. Lumo charges a tenth of a cent
to say hi, and ten dollars to say *I love you*. Every price in between
is a reason to reach out.

The price isn't the point. The price is the filter.

---

## How it works

**For creators (people receiving messages):**
1. Sign in with Tempo Wallet (passkey-secured, no seed phrase)
2. Pick your handle: `tempo.pay2text.xyz/yourname`
3. Add an email so messages can reach you
4. Share your link anywhere
5. When someone pays to message you, you get an email and see it
   in your dashboard. Lumo already read it and left a take.

**For senders (people paying to message):**
1. Visit someone's Lumo page
2. Lumo asks: *"Why are you reaching out?"*
3. Pick a reason — each has a price
4. Sign in with Tempo Wallet, pay in pathUSD, write your message
5. Lumo confirms: *"Thanks for stopping by. I'll make sure
   this lands."*

---

## Intent menu

| Intent             | Price |
| ------------------ | ----- |
| just saying hi     | 0.1¢  |
| got a minute?      | 1¢    |
| have an idea       | 10¢   |
| kind of important  | $1    |
| I love you         | $10   |

Prices live in one file — `src/intents.ts` — and nowhere else.
The displayed price and the on-chain charge amount always match.

---

## Why micropayments?

The **Machine Payments Protocol** (mppx) implements the HTTP 402
"Payment Required" standard — same shape as x402, same idea: pay
inline as part of an HTTP request, settle on-chain, no platform
account, no minimum fee. Stripe's 30¢ floor makes "just saying hi
for a penny" impossible. HTTP 402 makes it trivial.

On Tempo specifically, two things tighten the experience:

1. **Fee sponsorship is built in.** The server co-signs the payment
   transaction as fee-payer, so the sender doesn't need a separate
   gas-token balance. Sender holds pathUSD, server holds pathUSD,
   that's it.
2. **~500ms finality.** Tempo uses Simplex BFT consensus —
   deterministic finality, ~500ms blocks — so the message lands
   essentially as fast as a normal API request.

Payments go directly from the sender's wallet to the creator's wallet.
No platform escrow. No middleman. The browser cannot fake a payment;
mppx verifies the on-chain settlement before the message is saved.
Either the payment happened or it didn't.

---

## What changed from pay2text

This is the same product on a different chain. Three layers swapped:

| Layer    | pay2text.xyz (Base)        | tempo.pay2text.xyz (Tempo)        |
| -------- | -------------------------- | --------------------------------- |
| Auth     | Coinbase CDP (email/SMS)   | Tempo Wallet (passkey via wagmi)  |
| Payments | x402 + USDC                | mppx + pathUSD                    |
| Chain    | Base Sepolia (ID 84532)    | Tempo testnet "Moderato" (42431)  |

Everything else — Lumo's take, the inbox UI, intent pricing,
QR codes, Resend forwarding — ports unchanged.

---

## Features

- **Intent-based pricing** — senders pick a reason, not an amount
- **Passkey wallets** — Tempo Wallet via wagmi/tempo, no seed phrase,
  no extension to install
- **Direct settlement** — pathUSD goes straight to the creator's wallet
- **Built-in fee sponsorship** — server co-signs as fee-payer; senders
  don't need a separate gas-token balance
- **On-chain verification** — mppx verifies the payment credential and
  on-chain settlement before saving the message
- **Email forwarding** — every message forwarded to creator's email
  via Resend
- **AI screening** — Claude Haiku reads each message and leaves a
  one-line "Lumo's take"
- **Tempo Explorer link** — every payment links to the real on-chain tx
- **QR code** — creators show their QR anywhere for instant payments
- **Mobile-first** — designed for 375px, works beautifully on phone

---

## Tools & APIs used

### AI & Development

| Tool                                              | What I used it for                                              |
| ------------------------------------------------- | --------------------------------------------------------------- |
| [Claude Code](https://claude.ai/code)             | My entire engineering team. Wrote every line of code.           |
| [Claude Haiku](https://anthropic.com)             | "Lumo's take" — a one-line read on every incoming message       |
| [Anthropic API](https://console.anthropic.com)    | Powers the in-app AI features                                   |

### Payments & Blockchain

| Tool                                                            | What I used it for                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Machine Payments Protocol (mppx)](https://mpp.dev)             | HTTP 402 inline micropayments — sub-cent stablecoin payments                      |
| [Tempo testnet (Moderato)](https://docs.tempo.xyz)              | Payments-focused L1 by Stripe + Paradigm; ~500ms finality, no native gas token    |
| [Tempo Wallet](https://wallet.tempo.xyz)                        | Passkey-secured embedded wallet (via the `accounts` SDK + wagmi connector)        |
| [wagmi 3.6 + wagmi/tempo](https://wagmi.sh)                     | React hooks + first-class Tempo connector                                         |
| [viem 2.48](https://viem.sh)                                    | Signing, transports, EIP-712 typed data                                           |
| [Tempo Explorer](https://explore.testnet.tempo.xyz)             | On-chain transaction explorer                                                     |

### Infrastructure

| Tool                                       | What I used it for                                          |
| ------------------------------------------ | ----------------------------------------------------------- |
| [Vercel](https://vercel.com)               | Hosting + serverless API functions + custom domain          |
| [Upstash Redis](https://upstash.com)       | Database — creator profiles + messages, `tempo:` namespaced |
| [Resend](https://resend.com)               | Email forwarding — "Lumo let someone in" emails             |

### Frontend

| Tool                                            | What I used it for                          |
| ----------------------------------------------- | ------------------------------------------- |
| [Vite 7](https://vitejs.dev)                    | Build tool, dev server, custom api plugin   |
| [React 19](https://react.dev)                   | UI framework                                |
| [TypeScript](https://typescriptlang.org)        | Type safety                                 |
| Vanilla CSS + custom properties                 | Styling — no Tailwind; design tokens in `index.css` |
| [react-router-dom](https://reactrouter.com)     | Page routing                                |
| [qrcode.react](https://npmjs.com/package/qrcode.react) | QR code on the dashboard                |

### Design

| Tool                                                                           | What I used it for                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| [Inter Tight](https://fonts.google.com/specimen/Inter+Tight)                   | Typography                                               |
| Pinterest                                                                      | Mood board — gradient orbs, glassmorphism, soft palettes |

### Accounts & services created

| Service               | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| Tempo Wallet          | Passkey-secured user wallets                       |
| Upstash               | Redis database (free tier, shared with pay2text)   |
| Resend                | Transactional email (free tier — 3,000/month)      |
| Anthropic             | API access for Claude Haiku                        |
| Vercel                | Deployment + domain (`tempo.pay2text.xyz`)         |

---

## How I built this (without writing code)

I'm a Chief of Staff at Mastercard. I am not a developer.

I built Lumo as a solo non-technical PM using Claude Code as my
engineering partner. I wrote the PRD, made every product decision,
handled all external account setup, debugged by reading logs and
screenshots, and directed the build phase by phase.

Claude Code wrote the code.

The original Base/CDP build took approximately 8 hours during a
hackathon. The Tempo migration — a fresh codebase fork, three layer
swaps (chain, payments, auth), parallel deploy — took about half a day
on top of that.

What I learned: the bottleneck in building is no longer technical
skill. It's clarity of thought. The clearer your vision, the better
the output.

---

## Project structure

```
/
├── src/
│   ├── intents.ts            # Single source of truth — labels + prices
│   ├── chain.ts              # Tempo testnet chain config (id, RPC, explorer, pathUSD)
│   ├── wagmi.ts              # Wagmi config — single chain + tempoWallet connector
│   ├── App.tsx               # Root — just renders <Outlet/>
│   ├── main.tsx              # Provider stack: Wagmi → QueryClient → Router
│   ├── pages/
│   │   ├── HomePage.tsx      # "Hi. I'm Lumo." + Connect button
│   │   ├── OnboardPage.tsx   # Handle picker + email (required)
│   │   ├── DashboardPage.tsx # Creator inbox + share link + QR + send tab
│   │   ├── HandlePage.tsx    # /:handle — the public paying page
│   │   ├── AgentPage.tsx     # /agent — autonomous Claude sender demo
│   │   └── NotFoundPage.tsx
│   ├── components/
│   │   ├── ConnectButton.tsx # Tempo Wallet sign in / out
│   │   ├── SendFlow.tsx      # Pick intent → compose → mppx pay → sent
│   │   └── Lumo.tsx          # The glowing orb (CSS)
│   └── hooks/
│       ├── useCreatorProfile.ts   # /api/creators ?walletAddress
│       ├── useCreatorByHandle.ts  # /api/creators ?handle
│       └── useMessages.ts         # /api/messages ?handle
├── api/
│   ├── creators.ts           # GET/POST/PATCH creator profiles
│   ├── messages.ts           # GET inbox / POST = mppx-charge + save + email
│   ├── agent/run.ts          # /agent endpoint — Claude picks intent + pays
│   └── _lib/
│       ├── mppx.ts           # Server Mppx instance — tempo.charge handler
│       ├── web-handler.ts    # Node↔Web Request adapter (Vercel runtime)
│       ├── redis.ts          # Upstash + tempo: namespaced key helpers
│       ├── email.ts          # Resend forwarding
│       └── lumo-take.ts      # Claude Haiku one-liner
├── vite.config.ts            # Inline plugin serves api/* in `npm run dev`
└── vercel.json               # SPA rewrite — everything non-/api → index.html
```

---

## Getting started

### Prerequisites

- Node.js 22+
- A [Tempo Wallet](https://wallet.tempo.xyz) for testing (passkey)
- An [Upstash](https://upstash.com) Redis database
- An [Anthropic](https://console.anthropic.com) API key (optional — Lumo's take falls back gracefully)
- A [Resend](https://resend.com) account (optional — for email forwarding)
- The Vercel CLI (only needed for deploying)

### Setup

```bash
git clone https://github.com/mluisag/pay2text
cd lumo-tempo
npm install
cp env.example .env.local   # then edit
```

Fill in `.env.local`:

```
# mppx (required)
MPP_SECRET_KEY=        # openssl rand -hex 32
MPPX_PRIVATE_KEY=      # server fee-payer; fund with pathUSD at wallet.tempo.xyz

# Upstash (required)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Optional
ANTHROPIC_API_KEY=
RESEND_API_KEY=
AGENT_WALLET_PRIVATE_KEY=    # only if you want /agent to work
```

```bash
npm run dev -- --port 5174
open http://localhost:5174
```

The Vite dev server has a custom plugin (`vite.config.ts`) that mounts
each `api/*.ts` file as middleware, so `fetch('/api/...')` works locally
the same way it does on Vercel — no `vercel dev` needed.

### Deploy

```bash
npx vercel link --yes --project lumo-tempo
npx vercel env add MPP_SECRET_KEY production
npx vercel env add MPPX_PRIVATE_KEY production
npx vercel env add KV_REST_API_URL production
npx vercel env add KV_REST_API_TOKEN production
npx vercel env add ANTHROPIC_API_KEY production    # optional
npx vercel env add RESEND_API_KEY production       # optional
npx vercel deploy --prod --yes
```

---

## Environment variables

| Variable                   | Where to get it                                   | Required |
| -------------------------- | ------------------------------------------------- | -------- |
| `MPP_SECRET_KEY`           | `openssl rand -hex 32`                            | ✅       |
| `MPPX_PRIVATE_KEY`         | Fresh wallet, funded at `wallet.tempo.xyz`        | ✅       |
| `KV_REST_API_URL`          | Upstash dashboard                                 | ✅       |
| `KV_REST_API_TOKEN`        | Upstash dashboard                                 | ✅       |
| `ANTHROPIC_API_KEY`        | console.anthropic.com                             | optional |
| `RESEND_API_KEY`           | resend.com/api-keys                               | optional |
| `AGENT_WALLET_PRIVATE_KEY` | Fresh wallet, funded at `wallet.tempo.xyz`        | optional |

---

## Lumo's voice

Lumo is calm, warm, and slightly wry. Like a wise older bartender
who's seen everything. Short sentences. No exclamation marks.
Sentence case throughout.

- *"Hi. I'm Lumo. I look after Laluy's inbox."*
- *"Got it. The toll is 1¢. What do you want to say?"*
- *"Thanks for stopping by. I'll make sure this lands."*
- *"Lumo couldn't find that door."* — 404
- *"Lumo is on duty. Quiet for now."* — empty inbox

Lumo's belief: *"Your time is precious. Everyone says they respect
that. The toll is how we find out who actually does."*

---

## Roadmap

**V1.5**
- [ ] Custom domain email (`lumo@pay2text.xyz`)
- [ ] Reply-to field on sender flow ✓ (already shipped)
- [ ] Categorized inbox dashboard ✓ (already shipped)

**V2**
- [ ] Customizable intent menus per creator
- [ ] Role-based packs (VCs, founders, journalists, creators)
- [ ] Calendly integration on premium intents
- [ ] On-ramp from card → pathUSD for non-crypto senders
- [ ] Cross-chain pay (Tempo creator can receive Base USDC, vice versa)

**V3**
- [ ] Agent-to-agent payments
- [ ] Lumo negotiates on your behalf
- [ ] AI assistants pay each other for human attention
- [ ] Mainnet launch

---

## Built at

The original `pay2text.xyz` was built at the **x402 + CDP Hackathon —
April 2026** (Base + Coinbase Developer Platform + x402).

This Tempo build is a follow-up experiment: same product, different
rails, parallel deploy. Built with Claude Code over half a day.

Built by [Laluy Garduno](https://www.linkedin.com/in/laluy/) —
Chief of Staff at Mastercard, non-technical PM, first-time builder.

Powered by [Claude Code](https://claude.ai/code).

---

## License

MIT
