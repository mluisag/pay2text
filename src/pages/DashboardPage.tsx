import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { useState } from "react"
import { Navigate } from "react-router-dom"

import Loading from "../Loading"
import { useCreatorProfile } from "../hooks/useCreatorProfile"

function DashboardPage() {
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress()
  const { creator, isLoading } = useCreatorProfile()
  const [copiedField, setCopiedField] = useState<"link" | "address" | null>(null)

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

      <section style={cardStyle}>
        <p style={fieldLabelStyle}>Your wallet (Base Sepolia)</p>
        <div style={fieldRowStyle}>
          <span
            style={{ fontSize: "1.05rem", fontFamily: "monospace", wordBreak: "break-all" }}
            title={walletAddress}
          >
            {truncate(walletAddress)}
          </span>
          <button
            onClick={() => copy(walletAddress, "address")}
            style={{
              ...copyButtonStyle,
              background: copiedField === "address" ? "#e0f5e0" : "#f5f5f5",
            }}
          >
            {copiedField === "address" ? "Copied" : "Copy"}
          </button>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#888", margin: "0.85rem 0 0" }}>
          USDC payments land here.{" "}
          <a
            href={`https://sepolia.basescan.org/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Basescan ↗
          </a>
        </p>
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

export default DashboardPage
