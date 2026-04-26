import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Navigate } from "react-router-dom"

import Lumo from "../components/Lumo"
import Loading from "../Loading"
import SendFlow from "../components/SendFlow"
import { useCreatorProfile } from "../hooks/useCreatorProfile"
import { useMessages, type Message } from "../hooks/useMessages"

type Mode = "receive" | "send"
type SortMode = "intent" | "recent" | "paid"

function DashboardPage() {
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress()
  const { creator, isLoading } = useCreatorProfile()
  const { messages, isLoading: messagesLoading } = useMessages(creator?.handle)
  const [copiedField, setCopiedField] = useState<"link" | "address" | null>(null)

  // Send/Receive toggle and Send-mode handle entry
  const [mode, setMode] = useState<Mode>("receive")
  const [sendHandleInput, setSendHandleInput] = useState("")
  const [sendTarget, setSendTarget] = useState<string | null>(null)

  // Background follows the active mode — peach for Receive, lavender for Send.
  useEffect(() => {
    if (mode === "send") {
      document.body.classList.add("sender-bg")
    } else {
      document.body.classList.remove("sender-bg")
    }
    return () => {
      document.body.classList.remove("sender-bg")
    }
  }, [mode])

  const switchMode = (next: Mode) => {
    if (next === "receive") {
      setSendTarget(null)
      setSendHandleInput("")
    }
    setMode(next)
  }

  const onSendHandleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = sendHandleInput.trim().toLowerCase().replace(/^@/, "")
    if (trimmed.length >= 3) setSendTarget(trimmed)
  }

  // Inbox view controls
  const [sortMode, setSortMode] = useState<SortMode>("intent")
  const [dollarOnly, setDollarOnly] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const filteredMessages = useMemo(
    () => (dollarOnly ? messages.filter((m) => Number(m.priceUsd) >= 1) : messages),
    [messages, dollarOnly],
  )

  const sortedFlatMessages = useMemo(() => {
    if (sortMode === "paid") {
      return [...filteredMessages].sort((a, b) => Number(b.priceUsd) - Number(a.priceUsd))
    }
    return [...filteredMessages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
  }, [filteredMessages, sortMode])

  const groupedMessages = useMemo(() => {
    const groups = new Map<string, { label: string; items: Message[] }>()
    for (const m of filteredMessages) {
      const existing = groups.get(m.intentId)
      if (existing) existing.items.push(m)
      else groups.set(m.intentId, { label: m.intentLabel, items: [m] })
    }
    for (const g of groups.values()) {
      g.items.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].items.length - a[1].items.length)
  }, [filteredMessages])

  // Repeat-sender count across the FULL inbox (not the filtered view) so
  // someone with 4 cheap pings still gets flagged when the $1+ filter is on.
  const senderCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of messages) {
      counts.set(m.senderAddress, (counts.get(m.senderAddress) ?? 0) + 1)
    }
    return counts
  }, [messages])

  const toggleGroup = (intentId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(intentId)) next.delete(intentId)
      else next.add(intentId)
      return next
    })
  }

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
  const displayName = deriveDisplayName(creator.email, creator.handle)

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
              {displayName}'s inbox
            </h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              pay2text.xyz/{creator.handle}
            </p>
          </div>
        </div>
        <AuthButton />
      </header>

      <div role="tablist" aria-label="Send or receive" style={tabsRowStyle}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "receive"}
          onClick={() => switchMode("receive")}
          style={tabButtonStyle(mode === "receive")}
        >
          Receive
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "send"}
          onClick={() => switchMode("send")}
          style={tabButtonStyle(mode === "send")}
        >
          Send
        </button>
      </div>

      {mode === "send" ? (
        <section style={{ width: "100%" }}>
          {!sendTarget ? (
            <form onSubmit={onSendHandleSubmit} className="surface" style={sendHandleCardStyle}>
              <p style={{ ...fieldLabelStyle, marginBottom: "0.4rem" }}>Send a message to</p>
              <div style={sendHandleRow}>
                <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  pay2text.xyz/
                </span>
                <input
                  type="text"
                  value={sendHandleInput}
                  onChange={(e) =>
                    setSendHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))
                  }
                  placeholder="theirhandle"
                  maxLength={32}
                  autoFocus
                  style={sendHandleInputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={sendHandleInput.trim().length < 3}
                style={openSendButton(sendHandleInput.trim().length < 3)}
              >
                Knock on their door →
              </button>
            </form>
          ) : (
            <div style={{ width: "100%" }}>
              <button
                type="button"
                onClick={() => setSendTarget(null)}
                style={changeRecipientLink}
              >
                ← change recipient
              </button>
              <SendFlow handle={sendTarget} compact />
            </div>
          )}
        </section>
      ) : (
        <ReceiveContent />
      )}
    </main>
  )

  function ReceiveContent() {
    return (
      <>

      <section className="surface" style={shareCardStyle}>
        <p style={fieldLabelStyle}>Your shareable link</p>
        <div style={shareRowStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--accent)",
                wordBreak: "break-all",
                lineHeight: 1.35,
              }}
            >
              {link}
            </a>
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.85rem" }}>
              <button
                onClick={() => copy(link, "link")}
                style={ghostButton(copiedField === "link")}
              >
                {copiedField === "link" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div style={qrWrapStyle}>
            <QRCodeSVG
              value={link}
              size={92}
              bgColor="#ffffff"
              fgColor="#1f1b16"
              level="M"
              marginSize={1}
            />
          </div>
        </div>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-subtle)",
            margin: "0.85rem 0 0",
            letterSpacing: "0.01em",
          }}
        >
          Scan or copy to share
        </p>
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
              href={`https://sepolia.basescan.org/address/${walletAddress}#tokentxns`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View live transactions on BaseScan ↗
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
            flexWrap: "wrap",
            gap: "0.5rem",
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

        {messages.length > 0 && (
          <div style={inboxControlsStyle}>
            <div style={sortPillsStyle}>
              {(["intent", "recent", "paid"] as SortMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSortMode(m)}
                  style={sortPillStyle(sortMode === m)}
                >
                  {m === "intent" ? "By intent" : m === "recent" ? "Recent" : "Most paid"}
                </button>
              ))}
            </div>
            <label style={filterLabelStyle}>
              <input
                type="checkbox"
                checked={dollarOnly}
                onChange={(e) => setDollarOnly(e.target.checked)}
                style={{ accentColor: "var(--accent)", marginRight: "0.4rem" }}
              />
              <span>$1+ only</span>
            </label>
          </div>
        )}

        {filteredMessages.length === 0 ? (
          <div className="surface" style={emptyStateStyle}>
            <Lumo size={56} state="dim" />
            <p style={{ color: "var(--text-muted)", margin: "1rem 0 0" }}>
              {messages.length === 0
                ? "Lumo is on duty. Quiet for now."
                : "Nothing matches that filter. Loosen up?"}
            </p>
          </div>
        ) : sortMode === "intent" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {groupedMessages.map(([intentId, group]) => {
              const isCollapsed = collapsedGroups.has(intentId)
              return (
                <section key={intentId} className="surface" style={groupCardStyle}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(intentId)}
                    style={groupHeaderStyle}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-block",
                          transition: "transform 0.15s ease",
                          transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                          color: "var(--text-subtle)",
                          fontSize: "0.8rem",
                        }}
                      >
                        ▼
                      </span>
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>
                        {group.label}
                      </span>
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      {group.items.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <ul style={groupListStyle}>
                      {group.items.map((m) => (
                        <li key={m.id} style={groupListItemStyle}>
                          <MessageBody
                            m={m}
                            senderCount={senderCounts.get(m.senderAddress) ?? 1}
                            truncate={truncate}
                            hideIntentLabel
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {sortedFlatMessages.map((m) => (
              <li key={m.id} className="surface" style={messageCard}>
                <MessageBody
                  m={m}
                  senderCount={senderCounts.get(m.senderAddress) ?? 1}
                  truncate={truncate}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      </>
    )
  }
}

interface MessageBodyProps {
  m: Message
  senderCount: number
  truncate: (addr: string) => string
  /** When grouped by intent, the intent label appears in the section header — skip it on each item. */
  hideIntentLabel?: boolean
}

function MessageBody({ m, senderCount, truncate, hideIntentLabel }: MessageBodyProps) {
  return (
    <>
      <div style={messageHeaderRow}>
        <span style={{ fontSize: "0.95rem", color: "var(--text)", fontWeight: 600 }}>
          {hideIntentLabel ? formatRelative(m.timestamp) : m.intentLabel}
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
      {m.replyTo && (
        <p
          style={{
            margin: "0 0 0.6rem",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ color: "var(--text-subtle)" }}>reply to: </span>
          <span style={{ color: "var(--text)", fontWeight: 500 }}>{m.replyTo}</span>
        </p>
      )}
      <div style={messageMetaRow}>
        <span
          title={m.senderAddress}
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          from {truncate(m.senderAddress)}
        </span>
        {senderCount > 1 && <span style={repeatBadgeStyle}>knocked {senderCount}×</span>}
        {!hideIntentLabel && (
          <>
            <span aria-hidden="true">·</span>
            <span>{formatRelative(m.timestamp)}</span>
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
    </>
  )
}

/**
 * Derives a friendly display name. Prefers email's local part (the bit
 * before @), splits on a dot to grab the first segment, and capitalizes
 * it. Falls back to "@handle" when no email is saved.
 *
 *   "mluisa.garduno@gmail.com" -> "Mluisa"
 *   "raj@example.com"          -> "Raj"
 *   undefined                  -> "@laluy"
 */
function deriveDisplayName(email: string | undefined, handle: string): string {
  if (email) {
    const localPart = email.split("@")[0] ?? ""
    const firstSegment = localPart.split(/[.+_-]/)[0]
    if (firstSegment) {
      return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1)
    }
  }
  return `@${handle}`
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

// --- Inbox: sort + filter controls, grouped + flat layouts ---

const inboxControlsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  flexWrap: "wrap",
  marginBottom: "0.85rem",
  padding: "0 0.25rem",
}

const sortPillsStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: "0.2rem",
  padding: "0.2rem",
  borderRadius: "999px",
  background: "rgba(255, 252, 247, 0.7)",
  border: "1px solid var(--line)",
}

function sortPillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0.35rem 0.75rem",
    borderRadius: "999px",
    border: "none",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--accent-on)" : "var(--text-muted)",
    fontWeight: active ? 600 : 500,
    fontSize: "0.8rem",
    cursor: "pointer",
    transition: "background 0.15s ease, color 0.15s ease",
  }
}

const filterLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: "0.82rem",
  color: "var(--text-muted)",
  cursor: "pointer",
  userSelect: "none",
}

const emptyStateStyle: React.CSSProperties = {
  padding: "3rem 1.5rem",
  textAlign: "center",
}

const groupCardStyle: React.CSSProperties = {
  padding: 0,
  overflow: "hidden",
}

const groupHeaderStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0.95rem 1.25rem",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  fontSize: "0.95rem",
}

const groupListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  borderTop: "1px solid var(--line)",
}

const groupListItemStyle: React.CSSProperties = {
  padding: "1rem 1.25rem",
  borderBottom: "1px solid var(--line)",
}

const repeatBadgeStyle: React.CSSProperties = {
  padding: "0.1rem 0.5rem",
  borderRadius: "999px",
  background: "var(--accent-soft)",
  color: "var(--accent-hover)",
  fontWeight: 600,
  fontSize: "0.7rem",
  letterSpacing: "0.02em",
}

// --- Send/Receive toggle + Send composer ---

const tabsRowStyle: React.CSSProperties = {
  display: "inline-flex",
  alignSelf: "flex-start",
  gap: "0.25rem",
  padding: "0.25rem",
  marginBottom: "1.25rem",
  borderRadius: "999px",
  background: "rgba(255, 252, 247, 0.7)",
  border: "1px solid var(--line)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
}

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0.5rem 1.1rem",
    borderRadius: "999px",
    border: "none",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--accent-on)" : "var(--text-muted)",
    fontWeight: active ? 600 : 500,
    fontSize: "0.9rem",
    cursor: "pointer",
    minWidth: "84px",
    transition: "background 0.15s ease, color 0.15s ease",
  }
}

const sendHandleCardStyle: React.CSSProperties = {
  padding: "1.5rem 1.4rem",
  textAlign: "left",
  marginBottom: "1rem",
}

const sendHandleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.1rem",
  padding: "0.55rem 0.75rem",
  border: "1px solid var(--line-strong)",
  borderRadius: "var(--radius)",
  marginBottom: "1rem",
  background: "var(--card-solid)",
}

const sendHandleInputStyle: React.CSSProperties = {
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: "1rem",
  color: "var(--text)",
  padding: "0.4rem 0",
}

function openSendButton(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "0.85rem",
    borderRadius: "var(--radius)",
    border: "none",
    background: disabled ? "var(--text-subtle)" : "var(--accent)",
    color: "var(--accent-on)",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    minHeight: "48px",
    boxShadow: disabled ? "none" : "var(--shadow)",
  }
}

const changeRecipientLink: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  marginBottom: "0.75rem",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: "0.85rem",
}

const shareCardStyle: React.CSSProperties = {
  padding: "1.25rem 1.4rem",
  border: "2px solid var(--accent)",
  boxShadow: "0 6px 22px rgba(232, 119, 91, 0.16)",
}

const shareRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1.25rem",
  flexWrap: "wrap",
}

const qrWrapStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: "0.55rem",
  background: "#ffffff",
  borderRadius: "0.65rem",
  border: "1px solid var(--line-strong)",
  boxShadow: "0 2px 6px rgba(31, 27, 22, 0.05)",
}

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
