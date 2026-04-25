import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks"
import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"

import Loading from "../Loading"
import { useCreatorProfile } from "../hooks/useCreatorProfile"

const HANDLE_REGEX = /^[a-z0-9]{3,32}$/

function OnboardPage() {
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress()
  const { creator, isLoading, refresh } = useCreatorProfile()
  const navigate = useNavigate()

  const [handle, setHandle] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (!isSignedIn) return <Navigate to="/" replace />
  if (isLoading || !evmAddress) return <Loading />
  if (creator) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const normalized = handle.toLowerCase().trim()

    if (!HANDLE_REGEX.test(normalized)) {
      setError("Handle must be 3–32 lowercase letters or numbers, no spaces.")
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
          walletAddress: evmAddress,
          email: email.trim() || undefined,
        }),
      })

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        if (data.error === "handle_taken") {
          setError(`pay2text.xyz/${normalized} is already taken. Try another.`)
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
      setError("Network error. Check your connection and try again.")
      setSubmitting(false)
    }
  }

  return (
    <main style={{ padding: "3rem 1.5rem", maxWidth: "32rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: "0.5rem" }}>
        Choose your link
      </h1>
      <p style={{ marginBottom: "2rem", color: "#666" }}>
        This is the URL you'll share. Letters and numbers only.
      </p>

      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid #ccc",
              borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem",
            }}
          >
            <span style={{ color: "#666" }}>pay2text.xyz/</span>
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
                padding: "0.25rem",
                fontSize: "1rem",
                background: "transparent",
              }}
            />
          </div>
        </label>

        <label style={{ display: "block", marginBottom: "1.5rem" }}>
          <span
            style={{
              display: "block",
              marginBottom: "0.4rem",
              fontSize: "0.9rem",
              color: "#666",
            }}
          >
            Email for forwarded messages (optional)
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              border: "1px solid #ccc",
              borderRadius: "0.5rem",
              padding: "0.625rem 0.75rem",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
        </label>

        {error && (
          <p style={{ color: "#c00", marginBottom: "1rem", fontSize: "0.95rem" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || handle.length < 3}
          style={{
            width: "100%",
            padding: "0.85rem",
            borderRadius: "0.5rem",
            border: "none",
            background: submitting || handle.length < 3 ? "#999" : "#111",
            color: "#fff",
            fontSize: "1rem",
            cursor: submitting ? "wait" : handle.length < 3 ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </main>
  )
}

export default OnboardPage
