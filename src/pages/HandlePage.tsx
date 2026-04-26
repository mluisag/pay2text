import { useEvmAddress, useIsSignedIn, useX402 } from "@coinbase/cdp-hooks"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { createWalletClient, custom, publicActions } from "viem"
import { baseSepolia } from "viem/chains"
import { wrapFetchWithPayment } from "x402-fetch"

import Loading from "../Loading"
import { useCreatorByHandle } from "../hooks/useCreatorByHandle"
import { useExternalWallet } from "../hooks/useExternalWallet"
import { INTENTS, type Intent } from "../intents"

type Step = "pick" | "compose" | "sent"

const MAX_MESSAGE_LENGTH = 1000
const MAX_PAYMENT_ATOMIC = 11_000_000n // 11 USDC ceiling

function HandlePage() {
  const { handle } = useParams()
  const { creator, isLoading, notFound } = useCreatorByHandle(handle)

  const { isSignedIn: cdpSignedIn } = useIsSignedIn()
  const { evmAddress: cdpAddress } = useEvmAddress()
  const { fetchWithPayment: cdpFetchWithPayment } = useX402({
    address: cdpAddress ?? undefined,
    maxValue: MAX_PAYMENT_ATOMIC,
  })

  const ext = useExternalWallet()

  // External wins if both are connected — the visitor explicitly opted in.
  const activeWallet: { source: "cdp" | "external"; address: string } | null = ext.address
    ? { source: "external", address: ext.address }
    : cdpAddress
      ? { source: "cdp", address: cdpAddress }
      : null

  const fetchWithPayment = useMemo(() => {
    if (activeWallet?.source === "external" && typeof window !== "undefined" && window.ethereum) {
      const client = createWalletClient({
        account: activeWallet.address as `0x${string}`,
        chain: baseSepolia,
        transport: custom(window.ethereum as Parameters<typeof custom>[0]),
      }).extend(publicActions)
      // x402's Signer typing is stricter than viem's WalletClient<base-sepolia>
      // because of how baseSepolia widens the transaction type union. Cast is
      // safe at runtime — the client implements every method x402 calls.
      return wrapFetchWithPayment(
        fetch,
        client as unknown as Parameters<typeof wrapFetchWithPayment>[1],
        MAX_PAYMENT_ATOMIC,
      )
    }
    if (activeWallet?.source === "cdp") {
      return cdpFetchWithPayment
    }
    return null
  }, [activeWallet?.source, activeWallet?.address, cdpFetchWithPayment])

  const [step, setStep] = useState<Step>("pick")
  const [intent, setIntent] = useState<Intent | null>(null)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  if (isLoading) return <Loading />

  if (notFound || !creator) {
    return (
      <main style={pageStyle}>
        <p style={{ color: "#444", fontSize: "1.05rem" }}>
          Lumo couldn't find that door.
        </p>
      </main>
    )
  }

  const handleSend = async () => {
    if (!intent || !creator || !fetchWithPayment) return
    setSending(true)
    setError("")

    try {
      const res = await fetchWithPayment("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: creator.handle,
          intentId: intent.id,
          message: message.trim(),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const reason = String(body?.reason || body?.error || `status ${res.status}`)
        setError(friendlyPaymentError(reason))
        setSending(false)
        return
      }

      setStep("sent")
      setSending(false)
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown"
      setError(friendlyPaymentError(reason))
      setSending(false)
    }
  }

  if (step === "sent") {
    return (
      <main style={pageStyle}>
        <p style={{ fontSize: "1.1rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          Thanks for stopping by. I'll make sure this lands.
        </p>
        <button
          type="button"
          onClick={() => {
            setStep("pick")
            setIntent(null)
            setMessage("")
            setError("")
          }}
          style={ghostButtonStyle}
        >
          Send another
        </button>
      </main>
    )
  }

  if (step === "compose" && intent) {
    const canSend = !!activeWallet && message.trim().length > 0 && !sending
    const senderShort = activeWallet
      ? `${activeWallet.address.slice(0, 6)}…${activeWallet.address.slice(-4)}`
      : null

    return (
      <main style={pageStyle}>
        <button
          type="button"
          onClick={() => {
            setStep("pick")
            setMessage("")
            setError("")
          }}
          style={backLinkStyle}
        >
          ← change reason
        </button>

        <p style={lumoLineStyle}>
          Got it. The toll is {intent.displayPrice}. What do you want to say?
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          autoFocus
          rows={6}
          placeholder="Write your message…"
          disabled={sending}
          style={textareaStyle}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.5rem",
            marginBottom: "1.25rem",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "#999" }}>
            {activeWallet && senderShort ? (
              <>
                paying from {senderShort}
                {activeWallet.source === "external" ? " (extension)" : ""} → @{creator.handle}
              </>
            ) : (
              <>for @{creator.handle}</>
            )}
          </span>
          <span style={{ fontSize: "0.8rem", color: "#999" }}>
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>

        {!activeWallet && (
          <div style={authBlockStyle}>
            <p style={{ margin: "0 0 0.6rem", fontSize: "0.95rem", color: "#222" }}>
              Sign in to pay the toll
            </p>
            <p style={{ margin: "0 0 0.85rem", fontSize: "0.85rem", color: "#666" }}>
              We'll create a wallet for you automatically.
            </p>
            <AuthButton />

            <div style={dividerStyle}>
              <span style={dividerTextStyle}>or</span>
            </div>

            <p style={{ margin: "0 0 0.6rem", fontSize: "0.85rem", color: "#666" }}>
              Already have a crypto wallet?
            </p>
            <button
              type="button"
              onClick={() => ext.connect()}
              disabled={ext.isConnecting}
              style={connectWalletButtonStyle}
            >
              {ext.isConnecting ? "Connecting…" : "Connect my wallet"}
            </button>
            {ext.error && (
              <p style={{ color: "#c00", marginTop: "0.6rem", fontSize: "0.8rem" }}>
                {ext.error}
              </p>
            )}
            {!ext.isAvailable && !ext.error && (
              <p style={{ color: "#888", marginTop: "0.6rem", fontSize: "0.75rem" }}>
                Coinbase Wallet (or another browser-extension wallet) needs to be installed.
              </p>
            )}
          </div>
        )}

        {activeWallet && (
          <div style={{ marginBottom: "0.85rem", textAlign: "right" }}>
            {activeWallet.source === "external" ? (
              <button
                type="button"
                onClick={() => ext.disconnect()}
                style={tinyLinkStyle}
              >
                disconnect wallet
              </button>
            ) : cdpSignedIn ? (
              <span style={{ fontSize: "0.75rem", color: "#888" }}>
                signed in via Lumo wallet
              </span>
            ) : null}
          </div>
        )}

        {error && (
          <p
            style={{
              color: "#c00",
              marginBottom: "1rem",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            {error}
            {error.includes("faucet") && (
              <>
                {" "}
                <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">
                  Open faucet ↗
                </a>
              </>
            )}
          </p>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          style={{
            ...primaryButtonStyle,
            background: canSend ? "#111" : "#999",
            cursor: sending ? "wait" : canSend ? "pointer" : "not-allowed",
          }}
        >
          {sending ? "Sending…" : `Send for ${intent.displayPrice}`}
        </button>
      </main>
    )
  }

  // step === 'pick'
  return (
    <main style={pageStyle}>
      <p style={lumoIntroStyle}>
        Hi. I'm Lumo. I look after @{creator.handle}'s inbox.
      </p>
      <p style={lumoLineStyle}>Why are you reaching out?</p>

      <ul style={listStyle}>
        {INTENTS.map((it) => (
          <li key={it.id} style={{ marginBottom: "0.65rem" }}>
            <button
              type="button"
              onClick={() => {
                setIntent(it)
                setStep("compose")
                setError("")
              }}
              style={intentButtonStyle}
            >
              <span>{it.label}</span>
              <span style={{ color: "#666", fontVariantNumeric: "tabular-nums" }}>
                {it.displayPrice}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

function friendlyPaymentError(reason: string): string {
  const r = reason.toLowerCase()
  if (r.includes("insufficient_balance") || r.includes("insufficient funds")) {
    return "Your wallet needs a little USDC. Get some at faucet.circle.com (Base Sepolia, USDC). Lumo will wait."
  }
  if (r.includes("user rejected") || r.includes("user denied") || r.includes("rejected the request")) {
    return "Signature cancelled. Try again when you're ready."
  }
  if (r.includes("invalid_payment") || r.includes("invalid_signature")) {
    return "Lumo couldn't verify the payment. Try sending again."
  }
  if (r.includes("network") || r.includes("fetch")) {
    return "Network hiccup. Check your connection and try again."
  }
  return `Couldn't send: ${reason}`
}

// --- styles (inline; design pass is Phase 5) ---

const pageStyle: React.CSSProperties = {
  padding: "2.5rem 1.25rem",
  maxWidth: "30rem",
  margin: "0 auto",
  minHeight: "100vh",
  boxSizing: "border-box",
}

const lumoIntroStyle: React.CSSProperties = {
  fontSize: "1.15rem",
  lineHeight: 1.5,
  marginBottom: "1.5rem",
  color: "#222",
}

const lumoLineStyle: React.CSSProperties = {
  fontSize: "1.05rem",
  lineHeight: 1.5,
  marginBottom: "1.5rem",
  color: "#222",
}

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
}

const intentButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  padding: "0.95rem 1.1rem",
  borderRadius: "0.65rem",
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: "1rem",
  color: "#222",
  cursor: "pointer",
  textAlign: "left",
  minHeight: "48px",
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #ccc",
  borderRadius: "0.65rem",
  padding: "0.85rem",
  fontSize: "1rem",
  fontFamily: "inherit",
  lineHeight: 1.5,
  resize: "vertical",
  boxSizing: "border-box",
  outline: "none",
}

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.95rem",
  borderRadius: "0.65rem",
  border: "none",
  color: "#fff",
  fontSize: "1rem",
  minHeight: "48px",
}

const ghostButtonStyle: React.CSSProperties = {
  padding: "0.65rem 1.1rem",
  borderRadius: "0.65rem",
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.95rem",
}

const backLinkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  marginBottom: "1.25rem",
  color: "#666",
  cursor: "pointer",
  fontSize: "0.9rem",
}

const authBlockStyle: React.CSSProperties = {
  padding: "1.25rem",
  background: "#f7f7f7",
  borderRadius: "0.75rem",
  marginBottom: "1rem",
}

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  textAlign: "center",
  margin: "1.25rem 0",
  color: "#bbb",
  fontSize: "0.8rem",
}

const dividerTextStyle: React.CSSProperties = {
  flex: "0 0 auto",
  margin: "0 auto",
  padding: "0 0.75rem",
  background: "#f7f7f7",
  position: "relative",
}

const connectWalletButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "0.65rem",
  border: "1px solid #222",
  background: "#fff",
  color: "#222",
  fontSize: "0.95rem",
  cursor: "pointer",
  minHeight: "44px",
}

const tinyLinkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  fontSize: "0.75rem",
  color: "#888",
  cursor: "pointer",
  textDecoration: "underline",
}

export default HandlePage
