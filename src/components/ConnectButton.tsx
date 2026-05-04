import { useEffect } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"

/**
 * Probe import: forces Vite to discover `accounts` via static analysis so
 * its dev server pre-bundles it. The wagmi connector's runtime
 * `await import('accounts')` swallows the real reason on failure (it
 * always reports `dependency "accounts" not found`), so we also load it
 * here ourselves once on mount to surface any real load error in the
 * console. Safe to leave in production — it's a no-op after first load.
 */
const accountsProbe = () =>
  import("accounts").catch((e) => {
    console.error("[ConnectButton] failed to load accounts SDK:", e)
    return null
  })

interface Props {
  /** Label when not connected. */
  label?: string
  /** Visual variant — "primary" matches the orange Lumo CTA, "ghost" is muted. */
  variant?: "primary" | "ghost"
}

/**
 * Sign-in / sign-out button backed by the Tempo Wallet connector.
 * Replaces CDP's `<AuthButton>`. When disconnected, clicking opens
 * Tempo Wallet (wallet.tempo.xyz) via the wagmi/tempo dialog adapter.
 */
function ConnectButton({ label = "Sign in", variant = "primary" }: Props) {
  useEffect(() => {
    accountsProbe()
  }, [])

  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()

  const tempoConnector = connectors[0]

  // Surface failed connect attempts in dev — the dialog connector can fail
  // silently (e.g. when its peer SDK is missing), and useConnect's error is
  // the only signal we get short of a debugger.
  if (error) console.error("[ConnectButton] connect error:", error)

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        style={buttonStyle(variant === "primary" ? "ghost" : variant)}
      >
        {short} · Sign out
      </button>
    )
  }

  const onClick = () => {
    if (!tempoConnector) {
      console.error("[ConnectButton] no connector configured")
      return
    }
    connect({ connector: tempoConnector })
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={isPending || !tempoConnector}
        style={buttonStyle(variant, isPending)}
      >
        {isPending ? "Connecting…" : label}
      </button>
      {error && (
        <p
          style={{
            marginTop: "0.85rem",
            fontSize: "0.82rem",
            color: "var(--accent-hover)",
            maxWidth: "24rem",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {error.message || "Couldn't connect. See console for details."}
        </p>
      )}
    </>
  )
}

function buttonStyle(
  variant: "primary" | "ghost",
  loading: boolean = false,
): React.CSSProperties {
  if (variant === "ghost") {
    return {
      padding: "0.55rem 1.1rem",
      borderRadius: "999px",
      border: "1px solid var(--line-strong)",
      background: "var(--card-solid)",
      color: "var(--text)",
      fontSize: "0.85rem",
      fontWeight: 500,
      cursor: loading ? "wait" : "pointer",
      fontFamily: "inherit",
    }
  }
  return {
    padding: "0.85rem 1.5rem",
    borderRadius: "var(--radius)",
    border: "none",
    background: "var(--accent)",
    color: "var(--accent-on)",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: loading ? "wait" : "pointer",
    minHeight: "48px",
    boxShadow: "var(--shadow)",
    fontFamily: "inherit",
  }
}

export default ConnectButton
