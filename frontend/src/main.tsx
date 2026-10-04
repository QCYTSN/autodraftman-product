import React from "react";
import ReactDOM from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "@fontsource-variable/noto-sans-sc";
import "@radix-ui/themes/layout.css";
import "../tokens.css";
import "./editorial-redesign.css";
import "./figfox-redesign.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme hasBackground={false} scaling="95%">
      <App />
    </Theme>
  </React.StrictMode>,
);
