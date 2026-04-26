import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { useMemo, useState } from "react"
import { Navigate } from "react-router-dom"

import Lumo from "../components/Lumo"
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
    return DEMO_MESSAGES.map((m) => ({ ...m, recipientHandle: creator.handle }))
  }, [messages, creator])

  const totalEarnedUsd = useMemo(
    () => messages.reduce((sum, m) => sum + (Number(m.priceUsd) || 0), 0),
    [messages],
  )

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
      /* clipboard unavailable */
    }
  }

  const truncate = (addr: string) =>
    addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr

  const hasRealMessages = messages.length > 0

  return (
    <main
      style={{
        flex: 1,
        padding: "2rem 1.25rem 4rem",
        maxWidth: "42rem",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.75rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <Lumo size={36} state={hasRealMessages ? "idle" : "dim"} />
          <div>
            <h1
              style={{
                fontSize: "1.35rem",
                fontWeight: 600,
                letterSpacing: "-0.012em",
                margin: 0,
              }}
            >
              Your inbox
            </h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              @{creator.handle}
            </p>
          </div>
        </div>
        <AuthButton />
      </header>

      <section className="surface" style={cardPadding}>
        <p style={fieldLabelStyle}>Your shareable link</p>
        <div style={fieldRowStyle}>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "1.05rem",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              wordBreak: "break-all",
              color: "var(--text)",
            }}
          >
            {link}
          </a>
          <button
            onClick={() => copy(link, "link")}
            style={ghostButton(copiedField === "link")}
          >
            {copiedField === "link" ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.85rem",
          margin: "1rem 0",
        }}
      >
        <section className="surface" style={cardPadding}>
          <p style={fieldLabelStyle}>Wallet</p>
          <div style={{ ...fieldRowStyle, gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.95rem",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "var(--text)",
              }}
              title={walletAddress}
            >
              {truncate(walletAddress)}
            </span>
            <button
              onClick={() => copy(walletAddress, "address")}
              style={{
                ...ghostButton(copiedField === "address"),
                padding: "0.3rem 0.7rem",
                fontSize: "0.78rem",
              }}
            >
              {copiedField === "address" ? "✓" : "Copy"}
            </button>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", margin: 0 }}>
            <a
              href={`https://sepolia.basescan.org/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Basescan ↗
            </a>
          </p>
        </section>

        <section className="surface" style={cardPadding}>
          <p style={fieldLabelStyle}>Total earned</p>
          <p
            style={{
              fontSize: "1.6rem",
              fontWeight: 600,
              margin: 0,
              color: "var(--text)",
              letterSpacing: "-0.012em",
            }}
          >
            {formatUsd(totalEarnedUsd)}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", margin: "0.4rem 0 0" }}>
            from {messages.length} {messages.length === 1 ? "message" : "messages"}
          </p>
        </section>
      </div>

      <section style={{ marginTop: "0.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "0.85rem",
            padding: "0 0.25rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, letterSpacing: "-0.005em" }}>
            Messages
          </h2>
          {messagesLoading && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
              Lumo is checking…
            </span>
          )}
        </div>

        {displayMessages.length === 0 ? (
          <div
            className="surface"
            style={{
              padding: "3rem 1.5rem",
              textAlign: "center",
            }}
          >
            <Lumo size={56} state="dim" />
            <p style={{ color: "var(--text-muted)", margin: "1rem 0 0" }}>
              Lumo is on duty. No messages yet.
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {displayMessages.map((m) => (
              <li key={m.id} className="surface" style={messageCard}>
                <div style={messageHeaderRow}>
                  <span
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--text)",
                      fontWeight: 600,
                    }}
                  >
                    {m.intentLabel}
                  </span>
                  <span style={{ fontSize: "0.95rem", color: "var(--accent)", fontWeight: 600 }}>
                    {formatUsd(m.priceUsd)}
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 0.6rem",
                    color: "var(--text)",
                    lineHeight: 1.55,
                    fontSize: "1rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.messageText}
                </p>
                <div style={messageMetaRow}>
                  <span
                    title={m.senderAddress}
                    style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                  >
                    from {truncate(m.senderAddress)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatRelative(m.timestamp)}</span>
                  {m.isDemo && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span style={{ color: "var(--warm)", fontWeight: 600 }}>demo</span>
                    </>
                  )}
                  {m.txHash && (
                    <>
                      <span aria-hidden="true">·</span>
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

const cardPadding: React.CSSProperties = { padding: "1.1rem 1.25rem" }

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--text-muted)",
  margin: "0 0 0.5rem",
  letterSpacing: "0.01em",
}

const fieldRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  flexWrap: "wrap",
}

function ghostButton(active: boolean): React.CSSProperties {
  return {
    padding: "0.4rem 0.85rem",
    borderRadius: "0.55rem",
    border: "1px solid var(--line-strong)",
    background: active ? "var(--accent-soft)" : "var(--card-solid)",
    color: "var(--text)",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 500,
    transition: "background 0.15s ease",
  }
}

const messageCard: React.CSSProperties = {
  padding: "1.15rem 1.25rem",
  marginBottom: "0.85rem",
  display: "block",
}

const messageHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: "0.5rem",
  marginBottom: "0.5rem",
}

const messageMetaRow: React.CSSProperties = {
  display: "flex",
  gap: "0.55rem",
  fontSize: "0.75rem",
  color: "var(--text-subtle)",
  flexWrap: "wrap",
  alignItems: "center",
}

export default DashboardPage
