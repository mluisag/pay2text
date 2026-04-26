import Lumo from "../components/Lumo"

function NotFoundPage() {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: "1.75rem" }}>
        <Lumo size={88} state="dim" />
      </div>
      <p style={{ fontSize: "1.15rem", color: "var(--text-muted)" }}>
        Lumo couldn't find that door.
      </p>
    </main>
  )
}

export default NotFoundPage
