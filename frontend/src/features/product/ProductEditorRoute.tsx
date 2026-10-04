import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import type { UiCopy } from "../../App";
import type { ProductNavigation } from "./ProductHeader";
import { EditorLoadingScreen, type EditorLoadPhase } from "./EditorLoadingScreen";

const Editor = lazy(() => import("./ProductSvgEditorPage").then(module => ({ default: module.ProductSvgEditorPage })));
class EditorModuleBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function ProductEditorRoute(props: ProductNavigation & { ui: UiCopy; onLanguageChange: () => void }) {
  const [phase, setPhase] = useState<EditorLoadPhase>("opening");
  const [cover, setCover] = useState<"loading" | "leaving" | "hidden">("loading");
  const started = useRef(performance.now());
  const revealed = useRef(false);
  useEffect(() => {
    if (phase !== "ready" || revealed.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Keep a fast local load from flashing a single frame of the cover.
    const reveal = window.setTimeout(() => {
      revealed.current = true;
      setCover(reduced ? "hidden" : "leaving");
    }, reduced ? 0 : Math.max(0, 420 - (performance.now() - started.current)));
    return () => window.clearTimeout(reveal);
  }, [phase]);
  useEffect(() => {
    if (cover === "loading") return;
    const timer = window.setTimeout(() => {
      if (cover === "leaving") setCover("hidden");
      else document.querySelector<HTMLElement>(".product-editor-route #editor-canvas")?.focus({ preventScroll: true });
    }, cover === "leaving" ? 180 : 0);
    return () => window.clearTimeout(timer);
  }, [cover]);

  return <div className="product-editor-route" data-covered={cover !== "hidden"}>
    <div className="product-editor-route-content" data-visible={cover !== "loading"} aria-hidden={cover === "loading" ? true : undefined} inert={cover !== "hidden" ? true : undefined}>
      <EditorModuleBoundary onError={() => { setPhase("failed"); setCover("loading"); }}><Suspense fallback={null}><Editor {...props} onLoadingPhaseChange={setPhase} /></Suspense></EditorModuleBoundary>
    </div>
    {cover !== "hidden" && <EditorLoadingScreen {...props} phase={phase} leaving={cover === "leaving"} />}
  </div>;
}
