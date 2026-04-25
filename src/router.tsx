import { createBrowserRouter } from "react-router-dom"

import App from "./App"
import AgentPage from "./pages/AgentPage"
import DashboardPage from "./pages/DashboardPage"
import HandlePage from "./pages/HandlePage"
import HomePage from "./pages/HomePage"
import NotFoundPage from "./pages/NotFoundPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "agent", element: <AgentPage /> },
      { path: ":handle", element: <HandlePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
