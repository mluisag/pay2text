# Lumo

> Inboxes are loud. Lumo is quiet.

Lumo is a calm presence that guards an inbox. Anyone gets a personal
link — `pay2text.xyz/{handle}` — that lets people pay a small toll to
send a message. The price tells you who actually means it.

---

## Two parallel builds, one repo

This repo ships Lumo on two chains side-by-side, on two branches:

| Branch  | Live URL                                              | Wallet                            | Payments       | Chain                            |
| ------- | ----------------------------------------------------- | --------------------------------- | -------------- | -------------------------------- |
| `main`  | [pay2text.xyz](https://pay2text.xyz)                  | Coinbase CDP (email/SMS)          | x402 + USDC    | Base Sepolia (84532)             |
| `tempo` | [tempo.pay2text.xyz](https://tempo.pay2text.xyz)      | Tempo Wallet (passkey via wagmi)  | mppx + pathUSD | Tempo testnet "Moderato" (42431) |

Same product, different rails. Switch branches to work on a build:

```bash
git checkout main    # Base / CDP / x402 build
git checkout tempo   # Tempo / Wagmi / mppx build
```

Both deploys are independent Vercel projects sharing one Upstash Redis
(the `tempo` branch namespaces all keys with `tempo:` so the data is
isolated).

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
1. Sign in (email/SMS on `main`, passkey on `tempo`)
2. A wallet is created for you — no seed phrase, no crypto knowledge needed
3. Pick your handle: `pay2text.xyz/yourname`
4. Add an email so messages can reach you
5. Share your link anywhere
6. When someone pays to message you, you get an email and see it
   in your dashboard. Lumo already read it and left a take.

**For senders (people paying to message):**
1. Visit someone's Lumo page
2. Lumo asks: *"Why are you reaching out?"*
3. Pick a reason — each has a price
4. Sign in, pay (USDC on `main`, pathUSD on `tempo`), write your message
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

The HTTP 402 "Payment Required" standard lets a server demand payment
inline as part of a request. Two implementations of it sit under Lumo's
hood, one per branch:

- **`main` uses [x402](https://x402.org)** — Coinbase's HTTP 402 stack
  on Base, paying in USDC.
- **`tempo` uses [mppx](https://mpp.dev)** — the Machine Payments
  Protocol on Tempo, paying in pathUSD.

Both protocols are conceptually identical (same `WWW-Authenticate:
Payment` challenge, same `Authorization: Payment` retry). The product
code that consumes them — pick intent → 402 challenge → wallet signs →
server verifies → message saved — is the same shape on both branches.

Tempo adds **built-in fee sponsorship**: the server co-signs as
fee-payer, so the sender doesn't need a separate gas-token balance.
Sender holds pathUSD, server holds pathUSD, that's it.

The browser cannot fake a payment. The server verifies on-chain
settlement before saving the message. Either the payment happened or
it didn't.

---

## Features

- **Intent-based pricing** — senders pick a reason, not an amount
- **Invisible wallets** — embedded on `main` (CDP), passkey on `tempo`;
  no seed phrase either way
- **Direct settlement** — payment goes straight from sender's wallet
  to creator's wallet
- **On-chain verification** — server verifies the payment credential
  + on-chain settlement before saving the message
- **Email forwarding** — every message forwarded to creator's email
  via Resend
- **AI screening** — Claude Haiku reads each message and leaves a
  one-line "Lumo's take"
- **Explorer link** — every payment links to the real on-chain tx
  (BaseScan on `main`, Tempo Explorer on `tempo`)
- **QR code** — creators show their QR anywhere for instant payments
- **Mobile-first** — designed for 375px, works beautifully on phone

---

## Stack

| Layer    | `main` (Base build)                          | `tempo` (Tempo build)                                 |
| -------- | -------------------------------------------- | ----------------------------------------------------- |
| Auth     | `@coinbase/cdp-react` (email + SMS)          | `wagmi/tempo` `tempoWallet()` connector (passkey)     |
| Payments | `x402` + `x402-fetch` (Coinbase facilitator) | `mppx` (built-in fee sponsorship, no facilitator)     |
| Chain    | Base Sepolia, USDC                           | Tempo testnet "Moderato", pathUSD                     |
| Common   | React 19, Vite 7, viem 2.48, Vercel functions, Upstash Redis, Resend, Anthropic Claude Haiku |  |

### Tools & APIs

| Tool                                              | Used for                                              |
| ------------------------------------------------- | ----------------------------------------------------- |
| [Claude Code](https://claude.ai/code)             | My entire engineering team. Wrote every line of code. |
| [Claude Haiku](https://anthropic.com)             | "Lumo's take" — one-line read on each message         |
| [Vercel](https://vercel.com)                      | Hosting + serverless functions + custom domain        |
| [Upstash Redis](https://upstash.com)              | Creator profiles + messages                           |
| [Resend](https://resend.com)                      | Email forwarding (`Lumo let someone in`)              |
| [Anthropic API](https://console.anthropic.com)    | Claude Haiku for in-app screening                     |
| [x402](https://x402.org) (`main`)                 | HTTP 402 micropayments on Base                        |
| [Coinbase Developer Platform](https://portal.cdp.coinbase.com) (`main`) | Embedded wallets + facilitator    |
| [BaseScan](https://sepolia.basescan.org) (`main`) | On-chain transaction explorer                         |
| [mppx](https://mpp.dev) (`tempo`)                 | HTTP 402 inline payments on Tempo                     |
| [Tempo Wallet](https://wallet.tempo.xyz) (`tempo`) | Passkey-secured embedded wallet                      |
| [wagmi 3.6 / `wagmi/tempo`](https://wagmi.sh) (`tempo`) | React hooks + first-class Tempo connector       |
| [Tempo Explorer](https://explore.testnet.tempo.xyz) (`tempo`) | On-chain transaction explorer             |

### Frontend (both branches)

Vite 7 + React 19 + TypeScript + react-router-dom + qrcode.react.
Vanilla CSS with custom-property design tokens — no Tailwind. Inter Tight
typography.

---

## Project structure

```
/
├── src/
│   ├── intents.ts            # Single source of truth — labels + prices
│   ├── App.tsx               # Root — auth state + routing
│   ├── main.tsx              # Provider stack
│   ├── pages/
│   │   ├── HomePage.tsx      # "Hi. I'm Lumo." + sign in
│   │   ├── OnboardPage.tsx   # Handle picker + email
│   │   ├── DashboardPage.tsx # Creator inbox + share link + QR + send tab
│   │   ├── HandlePage.tsx    # /:handle — the public paying page
│   │   ├── AgentPage.tsx     # /agent — autonomous Claude sender demo
│   │   └── NotFoundPage.tsx
│   ├── components/
│   │   ├── SendFlow.tsx      # Pick intent → compose → 402 pay → sent
│   │   └── Lumo.tsx          # The glowing orb (CSS)
│   └── hooks/                # useCreatorProfile, useCreatorByHandle, useMessages
├── api/
│   ├── creators.ts           # GET/POST/PATCH creator profiles
│   ├── messages.ts           # GET inbox / POST = 402 challenge + verify + save + email
│   ├── agent/run.ts          # /agent — Claude picks an intent and pays
│   └── _lib/                 # redis, email, lumo-take, plus chain-specific glue
└── vercel.json               # SPA rewrite — everything non-/api → index.html
```

Files unique to the **`tempo`** branch:
- `src/wagmi.ts` — Wagmi config, single Tempo chain + tempoWallet connector
- `src/chain.ts` — Tempo testnet chain object (id, RPC, explorer, pathUSD)
- `src/components/ConnectButton.tsx` — Tempo Wallet sign in / out
- `api/_lib/mppx.ts` — Server `Mppx.create({ tempo.charge })` instance
- `api/_lib/web-handler.ts` — Node↔Web Request adapter for Vercel runtime
- `vite.config.ts` dev plugin that mounts `api/*` as middleware locally

Files unique to the **`main`** branch:
- `src/config.ts` — CDP configuration
- `src/theme.ts` — CDP theme overrides

---

## Getting started

```bash
git clone https://github.com/mluisag/pay2text
cd pay2text
git checkout main    # or: git checkout tempo
npm install
cp env.example .env.local   # then edit
```

### `main` branch (Base) — env vars

| Variable                                  | Where to get it                  | Required |
| ----------------------------------------- | -------------------------------- | -------- |
| `VITE_CDP_PROJECT_ID`                     | portal.cdp.coinbase.com          | ✅       |
| `VITE_CDP_CREATE_ETHEREUM_ACCOUNT_TYPE`   | set to `eoa`                     | ✅       |
| `VITE_CDP_CREATE_SOLANA_ACCOUNT`          | set to `false`                   | ✅       |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN`   | Upstash dashboard                | ✅       |
| `ANTHROPIC_API_KEY`                       | console.anthropic.com            | optional |
| `RESEND_API_KEY`                          | resend.com/api-keys              | optional |
| `AGENT_WALLET_PRIVATE_KEY`                | Fresh wallet, funded with USDC   | optional |

```bash
vercel dev   # Vercel CLI is required to serve /api/* alongside Vite
```

### `tempo` branch (Tempo) — env vars

| Variable                                  | Where to get it                                | Required |
| ----------------------------------------- | ---------------------------------------------- | -------- |
| `MPP_SECRET_KEY`                          | `openssl rand -hex 32`                         | ✅       |
| `MPPX_PRIVATE_KEY`                        | Fresh wallet, funded at `wallet.tempo.xyz`     | ✅       |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN`   | Upstash dashboard                              | ✅       |
| `ANTHROPIC_API_KEY`                       | console.anthropic.com                          | optional |
| `RESEND_API_KEY`                          | resend.com/api-keys                            | optional |
| `AGENT_WALLET_PRIVATE_KEY`                | Fresh wallet, funded with pathUSD              | optional |

```bash
npm run dev -- --port 5174   # Vite dev plugin serves /api/* — no vercel dev needed
```

### Deploy (either branch)

```bash
npx vercel link --yes
# add env vars with: npx vercel env add NAME production
npx vercel deploy --prod --yes
```

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

## How I built this (without writing code)

I'm a Chief of Staff at Mastercard. I am not a developer.

I built Lumo as a solo non-technical PM using Claude Code as my
engineering partner. I wrote the PRD, made every product decision,
handled all external account setup, debugged by reading logs and
screenshots, and directed the build phase by phase.

Claude Code wrote the code.

The original Base build took approximately 8 hours during a hackathon.
The Tempo migration — fork, swap chain layer, swap payments layer,
swap auth layer, parallel deploy — took about half a day on top of that.

What I learned: the bottleneck in building is no longer technical
skill. It's clarity of thought. The clearer your vision, the better
the output.

---

## Roadmap

**V1.5**
- [x] Reply-to field on sender flow
- [x] Categorized inbox dashboard
- [ ] Custom domain email (`lumo@pay2text.xyz`)

**V2**
- [ ] Customizable intent menus per creator
- [ ] Role-based packs (VCs, founders, journalists, creators)
- [ ] Calendly integration on premium intents
- [ ] On-ramp from card → stablecoin for non-crypto senders
- [ ] Cross-chain pay (Tempo creator can receive Base USDC, vice versa)

**V3**
- [ ] Agent-to-agent payments
- [ ] Lumo negotiates on your behalf
- [ ] AI assistants pay each other for human attention
- [ ] Mainnet launch

---

## Built at

The original `main` build was built at the **x402 + CDP Hackathon —
April 2026** (Base + Coinbase Developer Platform + x402).

The `tempo` branch is a follow-up experiment: same product, different
rails, parallel deploy.

Built by [Laluy Garduno](https://www.linkedin.com/in/laluy/) —
Chief of Staff at Mastercard, non-technical PM, first-time builder.

Powered by [Claude Code](https://claude.ai/code).

---

## License

MIT
