function Loading() {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
      }}
    >
      <h1 className="sr-only">Loading</h1>
      <div className="lumo-spinner" aria-hidden="true" />
    </main>
  )
}

export default Loading
