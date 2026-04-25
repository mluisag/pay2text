import { useParams } from "react-router-dom"

function HandlePage() {
  const { handle } = useParams()
  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>pay2text.xyz/{handle}</h1>
      <p>Public sender page — Phase 3</p>
    </main>
  )
}

export default HandlePage
