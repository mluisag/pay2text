import type { CSSProperties } from "react"

type LumoState = "idle" | "dim" | "bright" | "thinking"

interface Props {
  size?: number
  state?: LumoState
  className?: string
  style?: CSSProperties
}

/**
 * Lumo — the gradient orb. A presence, not a mascot.
 * Warm peach → amber → coral → ember. Pulses gently.
 */
function Lumo({ size = 88, state = "idle", className, style }: Props) {
  const cssVars = { ["--lumo-size" as string]: `${size}px` } as CSSProperties
  return (
    <span
      className={["lumo", className].filter(Boolean).join(" ")}
      data-state={state === "idle" ? undefined : state}
      style={{ ...cssVars, ...style }}
      aria-hidden="true"
    />
  )
}

export default Lumo
