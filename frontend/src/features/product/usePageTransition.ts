import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import "./login-transition.css";
import "./page-transition.css";

export type PageTransitionScope = "login-in" | "login-out" | "workspace" | "editor-in" | "editor-out";

export function usePageTransition() {
  const active = useRef<ViewTransition | null>(null);
  const sequence = useRef(0);

  useEffect(() => () => {
    sequence.current++;
    active.current?.skipTransition();
    delete document.documentElement.dataset.figfoxNavigation;
  }, []);

  return useCallback((scope: PageTransitionScope | null, update: () => void) => {
    const current = ++sequence.current;
    active.current?.skipTransition();
    active.current = null;
    const root = document.documentElement;
    delete root.dataset.figfoxNavigation;
    if (!scope || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      update();
      return;
    }
    if (!document.startViewTransition) {
      flushSync(update);
      if (scope === "workspace") document.querySelector(".workspace-layout")?.animate([
        { opacity: .35, transform: "translateY(5px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 230, easing: "cubic-bezier(.22,1,.36,1)" });
      return;
    }

    root.dataset.figfoxNavigation = scope;
    try {
      const transition = document.startViewTransition(() => {
        // A newer navigation must win even if an older snapshot is still pending.
        if (current === sequence.current) flushSync(update);
      });
      active.current = transition;
      void transition.ready.catch(() => undefined);
      void transition.finished.catch(() => undefined).finally(() => {
        if (current !== sequence.current) return;
        active.current = null;
        delete root.dataset.figfoxNavigation;
      });
    } catch {
      delete root.dataset.figfoxNavigation;
      update();
    }
  }, []);
}
