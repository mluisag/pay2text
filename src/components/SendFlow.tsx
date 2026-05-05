import { Mppx, tempo } from "mppx/client"
import { useMemo, useState } from "react"
import { toAccount } from "viem/accounts"
import { useAccount, useDisconnect, useWalletClient } from "wagmi"

import { explorerTxUrl } from "../chain"
import Loading from "../Loading"
import ConnectButton from "./ConnectButton"
import { useCreatorByHandle } from "../hooks/useCreatorByHandle"
import { INTENTS, type Intent } from "../intents"
import Lumo from "./Lumo"

type Step = "pick" | "compose" | "sent"

const MAX_MESSAGE_LENGTH = 1000

interface Props {
  handle: string | undefined
  /** Hide the large top-of-page Lumo orb (use when embedded — host already shows Lumo). */
  compact?: boolean
  /** Called when a payment settles — host can record recents. */
  onSent?: (handle: string) => void
}

/**
 * Sender flow: pick intent → compose → pay via mppx → sent.
 * Single wallet path now: Tempo Wallet via wagmi.
 */
function SendFlow({ handle, compact = false, onSent }: Props) {
  const { creator, isLoading, notFound } = useCreatorByHandle(handle)

  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { disconnect } = useDisconnect()

  const fetchWithPayment = useMemo(() => {
    if (!walletClient?.account) return null

    // Wrap the wagmi-backed walletClient as a viem Account whose signing
    // methods route through the connector (Tempo Wallet dialog). Without
    // this, mppx builds its own client with the chain's default HTTP RPC
    // transport and tries to sign via eth_signTypedData_v4 over RPC —
    // which fails because RPC nodes don't sign.
    const account = toAccount({
      address: walletClient.account.address,
      async signMessage({ message }) {
        return walletClient.signMessage({ message })
      },
      async signTransaction(transaction) {
        return walletClient.signTransaction(
          transaction as Parameters<typeof walletClient.signTransaction>[0],
        )
      },
      async signTypedData(typedData) {
        return walletClient.signTypedData(
          typedData as Parameters<typeof walletClient.signTypedData>[0],
        )
      },
    })

    const mppx = Mppx.create({
      methods: [tempo({ account })],
      polyfill: false,
    })
    return mppx.fetch
  }, [walletClient])

  const [step, setStep] = useState<Step>("pick")
  const [intent, setIntent] = useState<Intent | null>(null)
  const [message, setMessage] = useState("")
  const [replyTo, setReplyTo] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [sentTx, setSentTx] = useState<string | null>(null)

  if (isLoading) return <Loading />

  if (notFound || !creator) {
    return (
      <main style={pageContainer}>
        <Lumo size={88} state="dim" />
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", marginTop: "1.5rem" }}>
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
          replyTo: replyTo.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const reason = String(body?.reason || body?.error || `status ${res.status}`)
        setError(friendlyPaymentError(reason))
        setSending(false)
        return
      }

      const body = await res.json().catch(() => ({}))
      setSentTx(typeof body?.txHash === "string" ? body.txHash : null)
      onSent?.(creator.handle)
      setStep("sent")
      setSending(false)
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown"
      setError(friendlyPaymentError(reason))
      setSending(false)
    }
  }

  // Sent state ----------------------------------------------------------
  if (step === "sent") {
    return (
      <main style={pageContainer}>
        <Lumo size={108} state="bright" />
        <p
          style={{
            fontSize: "1.2rem",
            margin: "1.75rem 0 0.85rem",
            lineHeight: 1.5,
            color: "var(--text)",
            textAlign: "center",
            maxWidth: "26rem",
          }}
        >
          Thanks for stopping by. I'll make sure this lands.
        </p>

        {intent && (
          <p
            style={{
              fontSize: "0.95rem",
              margin: "0 0 0.4rem",
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>
              {intent.displayPrice}
            </span>{" "}
            landed in{" "}
            <strong style={{ color: "var(--text)" }}>@{creator.handle}</strong>
            's wallet
          </p>
        )}

        {sentTx && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-subtle)",
              margin: "0 0 1.75rem",
              textAlign: "center",
            }}
          >
            <a
              href={explorerTxUrl(sentTx)}
              target="_blank"
              rel="noopener noreferrer"
            >
              tx confirmed on Tempo testnet ↗
            </a>
          </p>
        )}

        {!sentTx && <div style={{ height: "1.5rem" }} />}

        <button
          type="button"
          onClick={() => {
            setStep("pick")
            setIntent(null)
            setMessage("")
            setReplyTo("")
            setError("")
            setSentTx(null)
          }}
          style={ghostButton}
        >
          Send another
        </button>

        {isConnected && address && (
          <SenderIdentityBar address={address} onSignOut={() => disconnect()} />
        )}
      </main>
    )
  }

  // Compose state -------------------------------------------------------
  if (step === "compose" && intent) {
    const canSend = isConnected && message.trim().length > 0 && !sending
    const senderShort = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null

    return (
      <main style={pageContainer}>
        {!compact && <Lumo size={64} state={sending ? "thinking" : "idle"} />}

        <button
          type="button"
          onClick={() => {
            setStep("pick")
            setMessage("")
            setError("")
          }}
          style={{ ...backLink, marginTop: compact ? 0 : "1.25rem" }}
        >
          ← change reason
        </button>

        <p style={lumoLine}>
          Got it. The toll for{" "}
          <strong style={{ color: "var(--text)" }}>@{creator.handle}</strong> is{" "}
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>{intent.displayPrice}</span>.
          What do you want to say?
        </p>

        {isConnected && address ? (
          <div style={inlineSignedInBar}>
            Connected{" "}
            <span
              style={{
                color: "var(--text)",
                fontWeight: 500,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {senderShort}
            </span>
            <span aria-hidden="true"> · </span>
            <button type="button" onClick={() => disconnect()} style={tinyLink}>
              Sign out
            </button>
          </div>
        ) : (
          <div style={compactAuthBlock}>
            <p
              style={{
                margin: "0 0 0.7rem",
                fontSize: "0.9rem",
                color: "var(--text)",
                fontWeight: 600,
              }}
            >
              Sign in to pay the toll
            </p>
            <ConnectButton label="Sign in with Tempo Wallet" />
          </div>
        )}

        <div className="surface" style={{ padding: "0.85rem", width: "100%", marginBottom: "0.6rem" }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            rows={6}
            placeholder="Write your message…"
            disabled={sending}
            style={textareaStyle}
          />
        </div>

        <div className="surface" style={{ padding: "0.7rem 0.95rem", width: "100%", marginBottom: "0.6rem" }}>
          <label style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                marginBottom: "0.25rem",
                letterSpacing: "0.01em",
              }}
            >
              Reply to (optional)
            </span>
            <input
              type="text"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value.slice(0, 200))}
              placeholder="email or phone — so they can reach you back"
              disabled={sending}
              style={replyToInput}
            />
          </label>
        </div>

        <div style={metaRow}>
          <span>
            {senderShort ? <>paying from {senderShort}</> : <>not signed in yet</>}
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>

        {error && (
          <p style={errorText}>
            {error}
            {error.includes("faucet") && (
              <>
                {" "}
                <a href="https://wallet.tempo.xyz" target="_blank" rel="noopener noreferrer">
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
          style={primaryButton(!canSend, sending)}
        >
          {sending ? "Lumo is checking…" : `Send for ${intent.displayPrice}`}
        </button>
      </main>
    )
  }

  // Pick state ----------------------------------------------------------
  return (
    <main style={pageContainer}>
      {!compact && <Lumo size={88} />}

      <p style={{ ...lumoLine, marginTop: compact ? 0 : "1.5rem", textAlign: "center" }}>
        Hi. I'm Lumo. I look after <strong>@{creator.handle}</strong>'s inbox.
      </p>
      <p style={{ ...lumoLine, color: "var(--text-muted)", textAlign: "center" }}>
        Why are you reaching out?
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0", width: "100%" }}>
        {INTENTS.map((it) => (
          <li key={it.id} style={{ marginBottom: "0.65rem" }}>
            <button
              type="button"
              onClick={() => {
                setIntent(it)
                setStep("compose")
                setError("")
              }}
              className="surface"
              style={intentButton}
            >
              <span style={{ color: "var(--text)" }}>{it.label}</span>
              <span
                style={{
                  color: "var(--accent)",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {it.displayPrice}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

function SenderIdentityBar({
  address,
  onSignOut,
}: {
  address: string
  onSignOut: () => void
}) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`
  return (
    <p
      style={{
        marginTop: "2rem",
        fontSize: "0.78rem",
        color: "var(--text-subtle)",
        textAlign: "center",
        lineHeight: 1.5,
      }}
    >
      Sending as{" "}
      <span
        style={{
          color: "var(--text-muted)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {short}
      </span>
      <span aria-hidden="true"> · </span>
      <button
        type="button"
        onClick={onSignOut}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: "var(--text-subtle)",
          textDecoration: "underline",
          cursor: "pointer",
          fontSize: "inherit",
          fontFamily: "inherit",
        }}
      >
        Not you? Sign out
      </button>
    </p>
  )
}

function friendlyPaymentError(reason: string): string {
  const r = reason.toLowerCase()
  if (r.includes("insufficient_balance") || r.includes("insufficient funds")) {
    return "Your wallet needs a little pathUSD. Get some at wallet.tempo.xyz (Tempo testnet). Lumo will wait."
  }
  if (
    r.includes("user rejected") ||
    r.includes("user denied") ||
    r.includes("rejected the request")
  ) {
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

const pageContainer: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "2rem 1.25rem 4rem",
  maxWidth: "30rem",
  margin: "0 auto",
  width: "100%",
}

const lumoLine: React.CSSProperties = {
  fontSize: "1.05rem",
  lineHeight: 1.55,
  margin: "0.85rem 0",
  color: "var(--text)",
  width: "100%",
}

const intentButton: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  padding: "1rem 1.15rem",
  fontSize: "1rem",
  cursor: "pointer",
  textAlign: "left",
  minHeight: "52px",
  fontFamily: "inherit",
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: "1rem",
  color: "var(--text)",
  fontFamily: "inherit",
  lineHeight: 1.55,
  resize: "vertical",
  minHeight: "120px",
}

const metaRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: "1rem",
  gap: "0.75rem",
  flexWrap: "wrap",
  fontSize: "0.78rem",
  color: "var(--text-subtle)",
}

const compactAuthBlock: React.CSSProperties = {
  width: "100%",
  padding: "0.95rem 1.1rem",
  marginBottom: "0.85rem",
  textAlign: "left",
  border: "1.5px solid var(--accent)",
  borderRadius: "var(--radius)",
  background: "var(--card)",
  backdropFilter: "blur(14px) saturate(1.05)",
  WebkitBackdropFilter: "blur(14px) saturate(1.05)",
  boxShadow: "0 3px 12px rgba(232, 119, 91, 0.12)",
}

const inlineSignedInBar: React.CSSProperties = {
  width: "100%",
  marginBottom: "0.85rem",
  padding: "0.55rem 0.85rem",
  fontSize: "0.82rem",
  color: "var(--text-muted)",
  background: "rgba(255, 252, 247, 0.65)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  textAlign: "center",
}

function primaryButton(disabled: boolean, loading: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "0.95rem",
    borderRadius: "var(--radius)",
    border: "none",
    background: disabled ? "var(--text-subtle)" : "var(--accent)",
    color: "var(--accent-on)",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: loading ? "wait" : disabled ? "not-allowed" : "pointer",
    minHeight: "52px",
    boxShadow: disabled ? "none" : "var(--shadow)",
    transition: "background 0.15s ease",
  }
}

const ghostButton: React.CSSProperties = {
  padding: "0.7rem 1.25rem",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line-strong)",
  background: "var(--card-solid)",
  cursor: "pointer",
  fontSize: "0.95rem",
  color: "var(--text)",
  fontWeight: 500,
}

const backLink: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: "0.85rem",
  alignSelf: "flex-start",
  marginBottom: "1rem",
}

const tinyLink: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  fontSize: "0.75rem",
  color: "var(--text-subtle)",
  cursor: "pointer",
  textDecoration: "underline",
}

const replyToInput: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: "0.95rem",
  color: "var(--text)",
  fontFamily: "inherit",
  padding: "0.2rem 0",
}

const errorText: React.CSSProperties = {
  color: "var(--accent-hover)",
  marginBottom: "1rem",
  fontSize: "0.9rem",
  lineHeight: 1.5,
  width: "100%",
}

export default SendFlow
