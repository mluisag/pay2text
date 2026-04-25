import { createBrowserRouter } from "react-router-dom"

import App from "./App"
import AgentPage from "./pages/AgentPage"
import DashboardPage from "./pages/DashboardPage"
import HandlePage from "./pages/HandlePage"
import HomePage from "./pages/HomePage"
import NotFoundPage from "./pages/NotFoundPage"
import OnboardPage from "./pages/OnboardPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "onboard", element: <OnboardPage /> },
      { path: "agent", element: <AgentPage /> },
      { path: ":handle", element: <HandlePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
