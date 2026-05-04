import { useAccount, useConnect, useDisconnect } from "wagmi"

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
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const tempoConnector = connectors[0]

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

  return (
    <button
      type="button"
      onClick={() => tempoConnector && connect({ connector: tempoConnector })}
      disabled={isPending || !tempoConnector}
      style={buttonStyle(variant, isPending)}
    >
      {isPending ? "Connecting…" : label}
    </button>
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
