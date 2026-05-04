import { useState } from "react"

import Lumo from "../components/Lumo"

type AgentStep = {
  label: string
  detail?: string
  state: "thinking" | "done" | "error"
}

type AgentResult = {
  intent: { id: string; label: string; displayPrice: string; priceUsd: number }
  message: string
  reasoning: string
  agentAddress: string
  recipient: { handle: string; walletAddress: string }
  txHash?: string
}

function AgentPage() {
  const [handle, setHandle] = useState("")
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState("")

  const lumoState = result ? "bright" : running ? "thinking" : "idle"

  const run = async () => {
    if (!handle.trim()) return
    setRunning(true)
    setError("")
    setResult(null)
    setSteps([])

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim().toLowerCase() }),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(body?.detail ?? body?.error ?? `status ${res.status}`)
        if (Array.isArray(body?.steps)) setSteps(body.steps)
        setRunning(false)
        return
      }

      setSteps(body.steps ?? [])
      setResult(body.result ?? null)
      setRunning(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown")
      setRunning(false)
    }
  }

  const reset = () => {
    setRunning(false)
    setSteps([])
    setResult(null)
    setError("")
  }

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2.5rem 1.25rem 4rem",
        maxWidth: "34rem",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <Lumo size={88} state={lumoState} />

      <h1
        style={{
          fontSize: "1.6rem",
          fontWeight: 600,
          letterSpacing: "-0.012em",
          margin: "1.25rem 0 0.4rem",
          textAlign: "center",
        }}
      >
        An AI agent uses pay2text
      </h1>
      <p
        style={{
          color: "var(--text-muted)",
          textAlign: "center",
          margin: "0 0 2rem",
          maxWidth: "26rem",
          lineHeight: 1.5,
        }}
      >
        The agent picks an intent, writes its own message, signs the USDC payment, and Lumo
        lets it through.
      </p>

      <div className="surface" style={{ width: "100%", padding: "1.25rem", marginBottom: "1rem" }}>
        <label style={{ display: "block" }}>
          <span
            style={{
              display: "block",
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              marginBottom: "0.4rem",
              letterSpacing: "0.01em",
            }}
          >
            Send the agent to which handle?
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.1rem",
              minHeight: "44px",
            }}
          >
            <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              tempo.pay2text.xyz/
            </span>
            <input
              type="text"
              value={handle}
              onChange={(e) =>
                setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))
              }
              placeholder="yourname"
              disabled={running}
              maxLength={32}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "1rem",
                color: "var(--text)",
                padding: "0.4rem 0",
              }}
            />
          </div>
        </label>
      </div>

      <button
        type="button"
        onClick={result || error ? reset : run}
        disabled={running || (!result && !error && handle.trim().length < 3)}
        style={{
          width: "100%",
          padding: "0.95rem",
          borderRadius: "var(--radius)",
          border: "none",
          background:
            running || (!result && !error && handle.trim().length < 3)
              ? "var(--text-subtle)"
              : "var(--accent)",
          color: "var(--accent-on)",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: running ? "wait" : "pointer",
          minHeight: "52px",
          marginBottom: "1.5rem",
          boxShadow: running ? "none" : "var(--shadow)",
        }}
      >
        {running
          ? "Lumo is watching the agent…"
          : result || error
            ? "Run again"
            : "Run agent"}
      </button>

      {steps.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, width: "100%" }}>
          {steps.map((step, i) => (
            <li key={i} className="surface" style={stepCard}>
              <div style={stepHeader}>
                <span style={stepDot(step.state)} aria-hidden="true">
                  {step.state === "done" ? "✓" : step.state === "error" ? "!" : "·"}
                </span>
                <span
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    color: step.state === "error" ? "var(--accent-hover)" : "var(--text)",
                  }}
                >
                  {step.label}
                </span>
              </div>
              {step.detail && (
                <p
                  style={{
                    margin: "0.4rem 0 0 1.6rem",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                >
                  {step.detail}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p
          style={{
            color: "var(--accent-hover)",
            fontSize: "0.9rem",
            marginTop: "0.5rem",
            width: "100%",
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>
      )}

      {result && (
        <section className="surface" style={{ width: "100%", padding: "1.25rem", marginTop: "1rem" }}>
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              margin: "0 0 0.4rem",
              letterSpacing: "0.01em",
            }}
          >
            The agent said
          </p>
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.55,
              margin: "0 0 0.85rem",
              color: "var(--text)",
              whiteSpace: "pre-wrap",
            }}
          >
            “{result.message}”
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-subtle)", margin: 0 }}>
            paid <span style={{ color: "var(--accent)", fontWeight: 600 }}>{result.intent.displayPrice}</span>{" "}
            → @{result.recipient.handle}
            {result.txHash && (
              <>
                {" · "}
                <a
                  href={`https://explore.testnet.tempo.xyz/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  view tx ↗
                </a>
              </>
            )}
          </p>
        </section>
      )}
    </main>
  )
}

const stepCard: React.CSSProperties = {
  padding: "0.85rem 1rem",
  marginBottom: "0.55rem",
}

const stepHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
}

function stepDot(state: AgentStep["state"]): React.CSSProperties {
  const bg =
    state === "done"
      ? "var(--accent-soft)"
      : state === "error"
        ? "rgba(232, 92, 65, 0.18)"
        : "rgba(255, 197, 130, 0.4)"
  const color =
    state === "done"
      ? "var(--accent-hover)"
      : state === "error"
        ? "var(--accent-hover)"
        : "var(--warm)"
  return {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: bg,
    color,
    fontSize: "0.75rem",
    fontWeight: 700,
    flexShrink: 0,
    animation: state === "thinking" ? "lumo-breathe 1.6s ease-in-out infinite" : undefined,
  }
}

export default AgentPage
