import { useEvmAddress, useIsSignedIn, useX402 } from "@coinbase/cdp-hooks"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { useState } from "react"
import { useParams } from "react-router-dom"

import Loading from "../Loading"
import { useCreatorByHandle } from "../hooks/useCreatorByHandle"
import { INTENTS, type Intent } from "../intents"

type Step = "pick" | "compose" | "sent"

const MAX_MESSAGE_LENGTH = 1000
// Max value the user could possibly need to pay (the most expensive intent
// is "I love you" at $10 = 10_000_000 USDC atomic units). Set to 11 USDC
// to give a little headroom without ever silently approving more than expected.
const MAX_PAYMENT_ATOMIC = 11_000_000n

function HandlePage() {
  const { handle } = useParams()
  const { creator, isLoading, notFound } = useCreatorByHandle(handle)
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress()
  const { fetchWithPayment } = useX402({
    address: evmAddress ?? undefined,
    maxValue: MAX_PAYMENT_ATOMIC,
  })

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
    if (!intent || !creator) return
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
        const reason =
          body?.reason || body?.error || `Send failed (status ${res.status}).`
        setError(String(reason))
        setSending(false)
        return
      }

      setStep("sent")
      setSending(false)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Check your wallet and try again.",
      )
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
    const canSend = isSignedIn && message.trim().length > 0 && !sending

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
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "#999" }}>
            for @{creator.handle}
          </span>
          <span style={{ fontSize: "0.8rem", color: "#999" }}>
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>

        {!isSignedIn && (
          <div
            style={{
              padding: "1rem",
              background: "#f5f5f5",
              borderRadius: "0.65rem",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 0.6rem", fontSize: "0.9rem", color: "#555" }}>
              Sign in to pay the toll. Your wallet will be created automatically.
            </p>
            <AuthButton />
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

// --- styles (inline for Phase 3a/3b; design pass is Phase 5) ---

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

export default HandlePage
