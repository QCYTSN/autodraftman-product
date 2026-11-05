// Browser-test fixture only. Vite's production entry never imports this module.
import React from "react";
import ReactDOM from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "@fontsource-variable/noto-sans-sc";
import "@radix-ui/themes/layout.css";
import "../../tokens.css";
import "../../src/base.css";
import App from "../../src/App";
import { ReconstructionContext, type ReconstructionSnapshot, type ReconstructionClient } from "../../src/features/product/reconstructionTask";

const control = {
  snapshot: null as ReconstructionSnapshot | null,
  submitted: 0, reads: 0, readFailure: false, submitFailure: false,
  input: null as { name: string; prompt: string; draftId: string } | null,
};
Object.assign(window, { reconstructionFixture: control });
const client: ReconstructionClient = {
  async submit(input) {
    control.submitted++;
    if (control.submitFailure) throw new Error("Test submission error");
    control.input = { name: input.image.name, prompt: input.prompt, draftId: input.draftId };
    control.snapshot = { id: `fixture-${control.submitted}`, revision: 1, status: "queued", stage: null };
    return structuredClone(control.snapshot);
  },
  async read() {
    control.reads++;
    if (control.readFailure) throw new Error("Test connection interruption");
    return structuredClone(control.snapshot!);
  },
};
history.replaceState({}, "", "/workspace?view=task");
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode>
  <Theme hasBackground={false} scaling="95%"><ReconstructionContext value={client}><App /></ReconstructionContext></Theme>
  <div style={{ position:"fixed", bottom:8, right:12, zIndex:200, padding:"6px 10px", background:"#fff", color:"#62697b", fontSize:12 }}>交互验证夹具 · 非真实生成 / Test fixture</div>
</React.StrictMode>);
