import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { Navigate } from "react-router-dom"

import Lumo from "../components/Lumo"
import Loading from "../Loading"
import { useCreatorProfile } from "../hooks/useCreatorProfile"

function HomePage() {
  const { isSignedIn } = useIsSignedIn()
  const { evmAddress } = useEvmAddress()
  const { creator, isLoading } = useCreatorProfile()

  if (isSignedIn) {
    if (!evmAddress || isLoading) return <Loading />
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
          fontSize: "2.1rem",
          lineHeight: 1.15,
          letterSpacing: "-0.018em",
          fontWeight: 600,
          margin: "0 0 0.75rem",
          color: "var(--text)",
        }}
      >
        Get paid to receive messages.
      </h1>

      <p
        style={{
          fontSize: "1.05rem",
          color: "var(--text-muted)",
          margin: "0 0 2.25rem",
          maxWidth: "26rem",
        }}
      >
        Inboxes are loud. Pay2Text is quiet. The price is the filter.
      </p>

      <AuthButton />

      <p
        style={{
          marginTop: "2.5rem",
          fontSize: "0.85rem",
          color: "var(--text-subtle)",
          maxWidth: "24rem",
          lineHeight: 1.55,
        }}
      >
        We'll create a wallet for you automatically. Sign in with your phone or email.
      </p>
    </main>
  )
}

export default HomePage
