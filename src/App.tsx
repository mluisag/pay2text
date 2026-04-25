import { useIsInitialized } from "@coinbase/cdp-hooks"
import { Outlet } from "react-router-dom"

import Loading from "./Loading"

function App() {
  const { isInitialized } = useIsInitialized()

  if (!isInitialized) return <Loading />

  return <Outlet />
}

export default App
