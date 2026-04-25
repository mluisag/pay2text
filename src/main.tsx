import { CDPReactProvider } from "@coinbase/cdp-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { CDP_CONFIG } from "./config.ts";
import { router } from "./router.tsx";
import { theme } from "./theme.ts";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CDPReactProvider config={CDP_CONFIG} theme={theme}>
      <RouterProvider router={router} />
    </CDPReactProvider>
  </StrictMode>,
);
