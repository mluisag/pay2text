import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { Navigate } from "react-router-dom"

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
        padding: "4rem 1.5rem",
        textAlign: "center",
        maxWidth: "32rem",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 500, marginBottom: "0.75rem" }}>
        Get paid to receive messages.
      </h1>
      <p style={{ marginBottom: "2.5rem", color: "#666", fontSize: "1.05rem" }}>
        The price is the filter.
      </p>
      <AuthButton />
    </main>
  )
}

export default HomePage
