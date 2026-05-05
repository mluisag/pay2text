# Lumo

> Inboxes are loud. Lumo is quiet.

Lumo guards a creator's inbox. Anyone gets a personal link —
`pay2text.xyz/{handle}` — that lets people pay a small toll to send a
message. The price tells you who actually means it.

**Live:** [pay2text.xyz](https://pay2text.xyz) · [tempo.pay2text.xyz](https://tempo.pay2text.xyz)

This repo ships Lumo on two chains side-by-side: Base + x402 on `main`,
Tempo + mppx on `tempo`. Same product, different rails — see [Two parallel
builds](#two-parallel-builds) below for the technical fork.

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
1. Sign in (no seed phrase, no crypto knowledge needed)
2. Pick your handle: `pay2text.xyz/yourname`
3. Add an email so messages can reach you
4. Share your link anywhere
5. When someone pays to message you, you get an email and see it
   in your dashboard. Lumo already read it and left a take.

**For senders (people paying to message):**
1. Visit someone's Lumo page
2. Lumo asks: *"Why are you reaching out?"*
3. Pick a reason — each has a price
4. Sign in, pay, write your message
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

## Built without writing a line of code

I'm a Chief of Staff at Mastercard. I am not a developer.

I built Lumo as a solo non-technical PM using Claude Code as my
engineering partner. I wrote the PRD, made every product decision,
handled all external account setup, debugged by reading logs and
screenshots, and directed the build phase by phase.

Claude Code wrote the code.

The original Base build took approximately 8 hours during a hackathon.
The Tempo branch — fork the repo, swap chain, swap payments, swap auth,
parallel deploy — took half a day on top of that.

What I learned: the bottleneck in building is no longer technical
skill. It's clarity of thought. The clearer your vision, the better
the output.

---

## Two parallel builds

| Branch  | Live URL                                              | Wallet                            | Payments       | Chain                            |
| ------- | ----------------------------------------------------- | --------------------------------- | -------------- | -------------------------------- |
| `main`  | [pay2text.xyz](https://pay2text.xyz)                  | Coinbase CDP (email/SMS)          | x402 + USDC    | Base Sepolia (84532)             |
| `tempo` | [tempo.pay2text.xyz](https://tempo.pay2text.xyz)      | Tempo Wallet (passkey via wagmi)  | mppx + pathUSD | Tempo testnet "Moderato" (42431) |

Switch branches to work on a build:

```bash
git checkout main    # Base / CDP / x402
git checkout tempo   # Tempo / Wagmi / mppx
```

Both deploys are independent Vercel projects sharing one Upstash Redis
(the `tempo` branch namespaces all keys so the data is isolated).

---

## Architecture

A few decisions worth calling out:

**HTTP 402 micropayments.** Both branches implement the same protocol —
`WWW-Authenticate: Payment` challenge → wallet signs → `Authorization:
Payment` retry → server verifies. `main` uses [x402](https://x402.org)
on Base; `tempo` uses [mppx](https://mpp.dev) on Tempo. Same conceptual
shape, swappable libraries.

**Built-in fee sponsorship (Tempo).** mppx co-signs the charge transaction
as fee-payer. The sender doesn't need a separate gas-token balance —
they just need pathUSD. On `main`, senders need both ETH (for gas) +
USDC, which is real friction the Tempo branch removes.

**Vercel runtime adapter (`api/_lib/web-handler.ts`, tempo branch).**
Vercel's `@vercel/node` invokes default exports with Node
`IncomingMessage` / `ServerResponse`, but mppx and our handlers are
written against the Web `Request → Response` shape. A small `wrap()`
function bridges them. Authoring style stays clean; runtime stays
compatible.

**Dev API plugin (`vite.config.ts`, tempo branch).** A ~50-line Vite
plugin mounts `api/*.ts` as middleware in `npm run dev`. Same
`fetch('/api/...')` calls work locally and in prod — no `vercel dev`
required.

**Redis namespacing.** Both branches share one Upstash KV. The Tempo
branch namespaces every key under `tempo:` (`tempo:creator:*`,
`tempo:messages:*`, `tempo:wallet:*`) so onboarding on the Tempo build
never clobbers a Base creator record on the live site.

**On-chain verification.** The browser cannot fake a payment. The
server verifies the payment credential and on-chain settlement before
saving the message. Either the payment happened or it didn't.

---

## Stack

| Layer             | `main` (Base build)                          | `tempo` (Tempo build)                                  |
| ----------------- | -------------------------------------------- | ------------------------------------------------------ |
| Sender experience | Holds USDC + ETH (for gas)                   | Holds pathUSD only (server sponsors gas)               |
| Auth              | `@coinbase/cdp-react` (email + SMS)          | `wagmi/tempo` `tempoWallet()` connector (passkey)      |
| Payments          | `x402` + `x402-fetch` (Coinbase facilitator) | `mppx` (built-in fee sponsorship, no facilitator)      |
| Chain             | Base Sepolia, USDC                           | Tempo testnet "Moderato", pathUSD                      |
| Explorer          | [BaseScan](https://sepolia.basescan.org)     | [Tempo Explorer](https://explore.testnet.tempo.xyz)    |

**Shared across branches:** React 19, Vite 7, TypeScript, viem 2.48,
react-router-dom, qrcode.react, Vercel functions, Upstash Redis, Resend,
Anthropic Claude Haiku. Vanilla CSS with custom-property design tokens.
Inter Tight typography.

### Tools & APIs

| Tool                                                      | Used for                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| [Claude Code](https://claude.ai/code)                     | My entire engineering team. Wrote every line of code.      |
| [Anthropic API](https://console.anthropic.com)            | Claude Haiku for "Lumo's take" — one-line read on each msg |
| [Vercel](https://vercel.com)                              | Hosting + serverless functions + custom domain             |
| [Upstash Redis](https://upstash.com)                      | Creator profiles + messages                                |
| [Resend](https://resend.com)                              | Email forwarding (`Lumo let someone in`)                   |

Branch-specific:

| Branch  | Tools                                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `main`  | [x402](https://x402.org) · [Coinbase Developer Platform](https://portal.cdp.coinbase.com) · [BaseScan](https://sepolia.basescan.org)         |
| `tempo` | [mppx](https://mpp.dev) · [Tempo Wallet](https://wallet.tempo.xyz) · [wagmi/tempo](https://wagmi.sh) · [Tempo Explorer](https://explore.testnet.tempo.xyz) |

---

## Project structure

> The tree below shows the **`tempo`** branch. The `main` branch differs
> only in the files listed under "Files unique to `main`" below.

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

**Files unique to `tempo`:**
- `src/wagmi.ts` — Wagmi config; single Tempo chain + tempoWallet connector
- `src/chain.ts` — Tempo testnet chain object (id, RPC, explorer, pathUSD)
- `src/components/ConnectButton.tsx` — Tempo Wallet sign in / out
- `api/_lib/mppx.ts` — server `Mppx.create({ tempo.charge })` instance
- `api/_lib/web-handler.ts` — Node↔Web Request adapter for Vercel
- `vite.config.ts` dev plugin that mounts `api/*` as middleware locally

**Files unique to `main`:**
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

Local dev: `vercel dev` (serves both Vite and `/api/*`).

### `tempo` branch (Tempo) — env vars

| Variable                                  | Where to get it                                | Required |
| ----------------------------------------- | ---------------------------------------------- | -------- |
| `MPP_SECRET_KEY`                          | `openssl rand -hex 32`                         | ✅       |
| `MPPX_PRIVATE_KEY`                        | Fresh wallet, funded at `wallet.tempo.xyz`     | ✅       |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN`   | Upstash dashboard                              | ✅       |
| `ANTHROPIC_API_KEY`                       | console.anthropic.com                          | optional |
| `RESEND_API_KEY`                          | resend.com/api-keys                            | optional |
| `AGENT_WALLET_PRIVATE_KEY`                | Fresh wallet, funded with pathUSD              | optional |

Local dev: `npm run dev -- --port 5174`. The Vite dev plugin mounts
`/api/*` directly — no `vercel dev` needed.

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

## Recently shipped

- Reply-to field on the sender flow
- Categorized inbox (group by intent + sort + filter)
- Tempo branch: full passkey-based sign-in, mppx payments, parallel deploy
- Single repo / unified README covering both builds

## Roadmap

**V1.5**
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

The `main` build was built at the **x402 + CDP Hackathon — April 2026**
(Base + Coinbase Developer Platform + x402).

The `tempo` branch is a follow-up experiment: same product, different
rails, parallel deploy.

Built by [Laluy Garduno](https://www.linkedin.com/in/laluy/) —
Program Manager, Blockchain & Digital Assets, Mastercard, non-technical PM, first-time builder.

Powered by [Claude Code](https://claude.ai/code).

---

## Demo
<img width="1042" height="600" alt="image" src="https://github.com/user-attachments/assets/4195b217-2c5b-43eb-95fb-ee5ee99a6f73" />

<img width="687" height="723" alt="image" src="https://github.com/user-attachments/assets/40a0a857-0691-4843-b2a1-9cbd4e43513c" />

<img width="577" height="607" alt="image" src="https://github.com/user-attachments/assets/81b111a8-32be-43f3-a73f-0349abbcf355" />


## License

MIT
