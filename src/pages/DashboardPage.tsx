import { useIsSignedIn } from "@coinbase/cdp-hooks"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { useState } from "react"
import { Navigate } from "react-router-dom"

import Loading from "../Loading"
import { useCreatorProfile } from "../hooks/useCreatorProfile"

function DashboardPage() {
  const { isSignedIn } = useIsSignedIn()
  const { creator, isLoading } = useCreatorProfile()
  const [copied, setCopied] = useState(false)

  if (!isSignedIn) return <Navigate to="/" replace />
  if (isLoading) return <Loading />
  if (!creator) return <Navigate to="/onboard" replace />

  const link = `https://pay2text.xyz/${creator.handle}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable on http or in some browsers
    }
  }

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

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 0.5rem" }}>
          Your shareable link
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "1.05rem", fontFamily: "monospace", wordBreak: "break-all" }}
          >
            {link}
          </a>
          <button
            onClick={copyLink}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "0.5rem",
              border: "1px solid #ccc",
              background: copied ? "#e0f5e0" : "#f5f5f5",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      <section
        style={{
          border: "1px dashed #ccc",
          borderRadius: "0.75rem",
          padding: "3rem 1.5rem",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#666", margin: 0 }}>Lumo is on duty. No messages yet.</p>
      </section>
    </main>
  )
}

export default DashboardPage
