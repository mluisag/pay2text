import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useAccount } from "wagmi"

import Lumo from "../components/Lumo"
import Loading from "../Loading"
import { useCreatorProfile } from "../hooks/useCreatorProfile"

const HANDLE_REGEX = /^[a-z0-9]{3,32}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function OnboardPage() {
  const { isConnected, address } = useAccount()
  const { creator, isLoading, refresh } = useCreatorProfile()
  const navigate = useNavigate()

  const [handle, setHandle] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (!isConnected) return <Navigate to="/" replace />
  if (isLoading || !address) return <Loading />
  if (creator) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const normalized = handle.toLowerCase().trim()
    const trimmedEmail = email.trim()

    if (!HANDLE_REGEX.test(normalized)) {
      setError("Handle must be 3–32 lowercase letters or numbers, no spaces.")
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("Lumo needs a valid email so messages can reach you.")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: normalized,
          walletAddress: address,
          email: trimmedEmail,
        }),
      })

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        if (data.error === "handle_taken") {
          setError(`tempo.pay2text.xyz/${normalized} is already taken. Try another.`)
        } else if (data.error === "wallet_already_registered") {
          await refresh()
          navigate("/dashboard")
          return
        } else {
          setError("Couldn't save. Try again.")
        }
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        setError("Something went wrong. Try again.")
        setSubmitting(false)
        return
      }

      await refresh()
      navigate("/dashboard")
    } catch {
      setError("Network hiccup. Check your connection and try again.")
      setSubmitting(false)
    }
  }

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "3rem 1.5rem 4rem",
        maxWidth: "32rem",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <Lumo size={64} />

      <div style={{ width: "100%", marginTop: "1.5rem", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            letterSpacing: "-0.012em",
            margin: "0 0 0.5rem",
          }}
        >
          Choose your link
        </h1>
        <p style={{ color: "var(--text-muted)", margin: "0 0 2rem" }}>
          This is the URL you'll share. Letters and numbers only.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ width: "100%" }}>
        <div className="surface" style={{ padding: "0.5rem 0.85rem", marginBottom: "1rem" }}>
          <label
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
              maxLength={32}
              autoFocus
              required
              placeholder="yourname"
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
          </label>
        </div>

        <div className="surface" style={{ padding: "0.85rem", marginBottom: "1.25rem" }}>
          <label style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                marginBottom: "0.35rem",
                letterSpacing: "0.01em",
              }}
            >
              Email for forwarded messages
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "1rem",
                color: "var(--text)",
                padding: "0.2rem 0",
              }}
            />
          </label>
        </div>

        {error && (
          <p
            style={{
              color: "var(--accent-hover)",
              marginBottom: "1rem",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || handle.length < 3 || email.trim().length === 0}
          style={primaryButton(submitting || handle.length < 3 || email.trim().length === 0, submitting)}
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  )
}

function primaryButton(disabled: boolean, loading: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "0.9rem",
    borderRadius: "var(--radius)",
    border: "none",
    background: disabled ? "var(--text-subtle)" : "var(--accent)",
    color: "var(--accent-on)",
    fontSize: "1rem",
    fontWeight: 500,
    cursor: loading ? "wait" : disabled ? "not-allowed" : "pointer",
    minHeight: "48px",
    boxShadow: disabled ? "none" : "var(--shadow)",
    transition: "transform 0.1s ease, box-shadow 0.15s ease, background 0.15s ease",
  }
}

export default OnboardPage
