import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks"
import { AuthButton, type AuthButtonProps } from "@coinbase/cdp-react/components/AuthButton"
import {
  SignInModal,
  SignInModalTrigger,
} from "@coinbase/cdp-react/components/SignInModal"
import { Navigate } from "react-router-dom"

import Lumo from "../components/Lumo"
import Loading from "../Loading"
import { useCreatorProfile } from "../hooks/useCreatorProfile"

const SignInWithCustomLabel: AuthButtonProps["signInModal"] = (props) => (
  <SignInModal {...props}>
    <SignInModalTrigger label="Get my link" />
  </SignInModal>
)

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

      <AuthButton signInModal={SignInWithCustomLabel} />

      <p
        style={{
          marginTop: "2rem",
          fontSize: "0.85rem",
          color: "var(--text-subtle)",
          maxWidth: "24rem",
          lineHeight: 1.55,
        }}
      >
        No crypto knowledge needed. Sign in with your phone or email.
      </p>
    </main>
  )
}

export default HomePage
