import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import "./login-transition.css";

export function useLoginTransition() {
  const active = useRef<ViewTransition | null>(null);
  const sequence = useRef(0);

  useEffect(() => () => {
    sequence.current++;
    active.current?.skipTransition();
    delete document.documentElement.dataset.figfoxNavigation;
  }, []);

  return useCallback((from: string, to: string, update: () => void) => {
    const current = ++sequence.current;
    active.current?.skipTransition();
    active.current = null;
    const root = document.documentElement;
    delete root.dataset.figfoxNavigation;
    const loginNavigation = from !== to && (from === "/login" || to === "/login");
    if (!loginNavigation || !document.startViewTransition || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      update();
      return;
    }

    root.dataset.figfoxNavigation = to === "/login" ? "login-in" : "login-out";
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
