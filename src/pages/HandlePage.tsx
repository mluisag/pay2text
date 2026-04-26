import { useEffect } from "react"
import { useParams } from "react-router-dom"

import SendFlow from "../components/SendFlow"

function HandlePage() {
  const { handle } = useParams()

  // Standalone visitor page uses the cooler lavender background.
  useEffect(() => {
    document.body.classList.add("sender-bg")
    return () => {
      document.body.classList.remove("sender-bg")
    }
  }, [])

  return <SendFlow handle={handle} />
}

export default HandlePage
