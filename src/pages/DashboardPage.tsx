import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { useMemo, useState } from "react"
import { Navigate } from "react-router-dom"

import Loading from "../Loading"
import { useCreatorProfile } from "../hooks/useCreatorProfile"
import { DEMO_MESSAGES, useMessages, type Message } from "../hooks/useMessages"

function DashboardPage() {
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress()
  const { creator, isLoading } = useCreatorProfile()
  const { messages, isLoading: messagesLoading } = useMessages(creator?.handle)
  const [copiedField, setCopiedField] = useState<"link" | "address" | null>(null)

  const displayMessages = useMemo<Message[]>(() => {
    if (!creator) return []
    if (messages.length > 0) return messages
    // Show demo content only when there are no real messages so a brand-new
    // dashboard doesn't look empty during the demo.
    return DEMO_MESSAGES.map((m) => ({ ...m, recipientHandle: creator.handle }))
  }, [messages, creator])

  const totalEarnedUsd = useMemo(() => {
    return messages.reduce((sum, m) => sum + (Number(m.priceUsd) || 0), 0)
  }, [messages])

  if (!isSignedIn) return <Navigate to="/" replace />
  if (isLoading) return <Loading />
  if (!creator) return <Navigate to="/onboard" replace />

  const link = `https://pay2text.xyz/${creator.handle}`
  const walletAddress = evmAddress ?? creator.walletAddress

  const copy = async (value: string, field: "link" | "address") => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // clipboard may be unavailable on http or in some browsers
    }
  }

  const truncate = (addr: string) =>
    addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr

  return (
    <main style={{ padding: "2rem 1.5rem", maxWidth: "40rem", margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 500, margin: 0 }}>Your inbox</h1>
        <AuthButton />
      </header>

      <section style={cardStyle}>
        <p style={fieldLabelStyle}>Your shareable link</p>
        <div style={fieldRowStyle}>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "1.05rem", fontFamily: "monospace", wordBreak: "break-all" }}
          >
            {link}
          </a>
          <button
            onClick={() => copy(link, "link")}
            style={{
              ...copyButtonStyle,
              background: copiedField === "link" ? "#e0f5e0" : "#f5f5f5",
            }}
          >
            {copiedField === "link" ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <section style={{ ...cardStyle, marginBottom: 0 }}>
          <p style={fieldLabelStyle}>Wallet (Base Sepolia)</p>
          <div style={{ ...fieldRowStyle, gap: "0.5rem" }}>
            <span
              style={{ fontSize: "0.95rem", fontFamily: "monospace" }}
              title={walletAddress}
            >
              {truncate(walletAddress)}
            </span>
            <button
              onClick={() => copy(walletAddress, "address")}
              style={{
                ...copyButtonStyle,
                background: copiedField === "address" ? "#e0f5e0" : "#f5f5f5",
                padding: "0.3rem 0.65rem",
                fontSize: "0.8rem",
              }}
            >
              {copiedField === "address" ? "✓" : "Copy"}
            </button>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#888", margin: "0.6rem 0 0" }}>
            <a
              href={`https://sepolia.basescan.org/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Basescan ↗
            </a>
          </p>
        </section>

        <section style={{ ...cardStyle, marginBottom: 0 }}>
          <p style={fieldLabelStyle}>Total earned</p>
          <p style={{ fontSize: "1.5rem", fontWeight: 500, margin: 0, color: "#111" }}>
            {formatUsd(totalEarnedUsd)}
          </p>
          <p style={{ fontSize: "0.75rem", color: "#888", margin: "0.6rem 0 0" }}>
            from {messages.length} {messages.length === 1 ? "message" : "messages"}
          </p>
        </section>
      </div>

      <section style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "0.85rem",
          }}
        >
          <h2 style={{ fontSize: "1.05rem", fontWeight: 500, margin: 0 }}>Messages</h2>
          {messagesLoading && (
            <span style={{ fontSize: "0.75rem", color: "#999" }}>Lumo is checking…</span>
          )}
        </div>

        {displayMessages.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ color: "#666", margin: 0 }}>Lumo is on duty. No messages yet.</p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {displayMessages.map((m) => (
              <li key={m.id} style={messageCardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "0.95rem", color: "#222", fontWeight: 500 }}>
                    {m.intentLabel}
                  </span>
                  <span style={{ fontSize: "0.95rem", color: "#222" }}>
                    {formatUsd(m.priceUsd)}
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 0.6rem",
                    color: "#222",
                    lineHeight: 1.55,
                    fontSize: "1rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.messageText}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    fontSize: "0.75rem",
                    color: "#888",
                    flexWrap: "wrap",
                  }}
                >
                  <span title={m.senderAddress} style={{ fontFamily: "monospace" }}>
                    from {truncate(m.senderAddress)}
                  </span>
                  <span>·</span>
                  <span>{formatRelative(m.timestamp)}</span>
                  {m.isDemo && (
                    <>
                      <span>·</span>
                      <span style={{ color: "#b88800", fontWeight: 500 }}>demo</span>
                    </>
                  )}
                  {m.txHash && (
                    <>
                      <span>·</span>
                      <a
                        href={`https://sepolia.basescan.org/tx/${m.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        tx ↗
                      </a>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function formatUsd(value: number): string {
  if (value === 0) return "$0"
  if (value < 0.01) return `${(value * 100).toFixed(1)}¢`
  if (value < 1) return `${Math.round(value * 100)}¢`
  if (Number.isInteger(value)) return `$${value}`
  return `$${value.toFixed(2)}`
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diffSec = Math.floor((Date.now() - then) / 1000)
  if (diffSec < 60) return "just now"
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "0.75rem",
  padding: "1.5rem",
  marginBottom: "1.5rem",
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#666",
  margin: "0 0 0.5rem",
}

const fieldRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  flexWrap: "wrap",
}

const copyButtonStyle: React.CSSProperties = {
  padding: "0.4rem 0.9rem",
  borderRadius: "0.5rem",
  border: "1px solid #ccc",
  cursor: "pointer",
  fontSize: "0.85rem",
}

const messageCardStyle: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: "0.75rem",
  padding: "1.1rem 1.25rem",
  marginBottom: "0.85rem",
  background: "#fff",
}

const emptyStateStyle: React.CSSProperties = {
  border: "1px dashed #ccc",
  borderRadius: "0.75rem",
  padding: "3rem 1.5rem",
  textAlign: "center",
}

export default DashboardPage
