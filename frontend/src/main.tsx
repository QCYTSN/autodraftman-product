import React from "react";
import ReactDOM from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "@fontsource-variable/noto-sans-sc";
import "@radix-ui/themes/layout.css";
import "../tokens.css";
import "./base.css";
import SiteEntry from "./SiteEntry";
import { LocalReconstructionProvider } from "./features/product/LocalReconstructionProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme hasBackground={false} scaling="95%">
      <LocalReconstructionProvider><SiteEntry /></LocalReconstructionProvider>
    </Theme>
  </React.StrictMode>,
);
