import { Navigate } from "react-router-dom"
import { useAccount } from "wagmi"

import ConnectButton from "../components/ConnectButton"
import Lumo from "../components/Lumo"
import Loading from "../Loading"
import { useCreatorProfile } from "../hooks/useCreatorProfile"

function HomePage() {
  const { isConnected, address } = useAccount()
  const { creator, isLoading } = useCreatorProfile()

  if (isConnected) {
    if (!address || isLoading) return <Loading />
    if (creator) return <Navigate to="/dashboard" replace />
    return <Navigate to="/onboard" replace />
  }

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem 4rem",
        textAlign: "center",
        maxWidth: "32rem",
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: "2.25rem" }}>
        <Lumo size={120} />
      </div>

      <h1
        style={{
          fontSize: "2.4rem",
          lineHeight: 1.1,
          letterSpacing: "-0.022em",
          fontWeight: 600,
          margin: "0 0 0.85rem",
          color: "var(--text)",
        }}
      >
        Hi. I'm Lumo.
      </h1>

      <p
        style={{
          fontSize: "1.05rem",
          color: "var(--text-muted)",
          margin: "0 0 2.25rem",
          maxWidth: "28rem",
          lineHeight: 1.55,
        }}
      >
        I look after inboxes. People pay a small toll to send a message and ask for
        favors… the price tells you who actually means it.
      </p>

      <ConnectButton label="Get my link" />

      <p
        style={{
          marginTop: "2rem",
          fontSize: "0.85rem",
          color: "var(--text-subtle)",
          maxWidth: "24rem",
          lineHeight: 1.55,
        }}
      >
        Sign in with Tempo Wallet — passkey-secured, no seed phrase.
      </p>
    </main>
  )
}

export default HomePage
