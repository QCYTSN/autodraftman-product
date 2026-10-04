import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import "./FigFoxCursor.css";

type CursorMode = "idle" | "link" | "zoom";
const nativeTargets = '.demo-canvas-stage, .demo-comparison, .product-editor-main, iframe, dialog, [role="dialog"], [role="alertdialog"], input, textarea, select, [role="slider"], [contenteditable]:not([contenteditable="false"]), [data-demo-cursor="native"], [data-figfox-cursor="native"], :disabled, [aria-disabled="true"]';
const interactiveTargets = 'a, button, summary, label, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"]';

export function FigFoxCursor({ site, route }: { site: RefObject<HTMLDivElement | null>; route: string }) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const pointRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const refreshRef = useRef<(() => void) | null>(null);

  // Recheck a stationary mouse when navigation replaces the content beneath it.
  useLayoutEffect(() => { refreshRef.current?.(); }, [route]);

  useEffect(() => {
    const root = site.current;
    const cursor = cursorRef.current;
    const point = pointRef.current;
    const shape = shapeRef.current;
    const label = labelRef.current;
    if (!root || !cursor || !point || !shape || !label) return;

    const finePointer = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const forcedColors = window.matchMedia("(forced-colors: active)");
    let frame = 0;
    let lastFrame = 0;
    let visible = false;
    let hasPosition = false;
    let selecting = false;
    let mode: CursorMode = "idle";
    const pointer = { x: 0, y: 0, time: 0 };
    const motion = { rotation: 0, stretch: 1, press: 1, targetRotation: 0, targetStretch: 1, targetPress: 1 };
    const enabled = () => finePointer.matches && !reducedMotion.matches && !forcedColors.matches;

    function tick(time: number) {
      frame = 0;
      if (!visible) return;
      const elapsed = Math.min(32, lastFrame ? time - lastFrame : 16);
      lastFrame = time;
      const follow = 1 - Math.exp(-elapsed * .055);
      const settle = 1 - Math.exp(-elapsed * .014);
      motion.rotation += (motion.targetRotation - motion.rotation) * follow;
      motion.stretch += (motion.targetStretch - motion.stretch) * follow;
      motion.press += (motion.targetPress - motion.press) * follow;
      motion.targetRotation *= 1 - settle;
      motion.targetStretch += (1 - motion.targetStretch) * settle;
      // The pointer position stays exact; only its shape has elasticity.
      const stretch = mode === "zoom" ? 1 + (motion.stretch - 1) * .12 : motion.stretch;
      const rotation = mode === "zoom" ? 0 : motion.rotation;
      shape!.style.transform = `translate(-50%,-50%) rotate(${rotation.toFixed(3)}deg) scale(${(stretch * motion.press).toFixed(4)},${(motion.press / stretch).toFixed(4)})`;
      if (Math.abs(motion.stretch - 1) > .001 || Math.abs(motion.rotation) > .01 || Math.abs(motion.press - motion.targetPress) > .001) {
        frame = requestAnimationFrame(tick);
      } else lastFrame = 0;
    }

    function animate() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function hide() {
      visible = false;
      cursor!.removeAttribute("data-visible");
      root!.removeAttribute("data-figfox-cursor-active");
      cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
    }

    function updateTarget(target: Element | null) {
      if (!enabled() || selecting || !target || !root!.contains(target) || target.closest(nativeTargets)) {
        hide();
        return false;
      }
      const nextMode: CursorMode = target.closest('[data-demo-cursor="zoom"], [data-figfox-cursor="zoom"]') ? "zoom" : target.closest(interactiveTargets) ? "link" : "idle";
      mode = nextMode;
      cursor!.dataset.mode = mode;
      label!.textContent = mode === "zoom" ? root!.lang.startsWith("zh") ? "放大" : "Zoom" : "";
      visible = true;
      point!.style.transform = `translate3d(${pointer.x}px,${pointer.y}px,0)`;
      cursor!.setAttribute("data-visible", "");
      root!.setAttribute("data-figfox-cursor-active", "");
      animate();
      return true;
    }

    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse" || !enabled()) { hasPosition = false; hide(); return; }
      const elapsed = event.timeStamp - pointer.time;
      const dx = hasPosition && elapsed < 80 ? event.clientX - pointer.x : 0;
      const dy = hasPosition && elapsed < 80 ? event.clientY - pointer.y : 0;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.time = event.timeStamp;
      hasPosition = true;
      // Hit-test the real position even while another element captures the pointer.
      const target = document.elementFromPoint(pointer.x, pointer.y);
      if (!updateTarget(target)) return;
      const speed = Math.min(1, Math.hypot(dx, dy) / Math.max(8, elapsed) / 2.2);
      motion.targetStretch = 1 + speed * .14;
      motion.targetRotation = Math.max(-8, Math.min(8, Math.atan2(dy, dx) * 180 / Math.PI * .1)) * speed;
    }

    function press(event: PointerEvent) {
      if (event.pointerType !== "mouse" || event.button !== 0 || !enabled()) { hide(); return; }
      const target = event.target instanceof Element ? event.target : null;
      selecting = !target?.closest(interactiveTargets);
      if (!updateTarget(target)) return;
      motion.targetPress = .86;
      animate();
    }

    function release(event: PointerEvent) {
      selecting = false;
      motion.targetPress = 1;
      if (event.pointerType === "mouse" && hasPosition) updateTarget(document.elementFromPoint(pointer.x, pointer.y));
      else hide();
    }

    function refreshTarget() {
      if (hasPosition) updateTarget(document.elementFromPoint(pointer.x, pointer.y));
    }

    function suspend() {
      selecting = false;
      hasPosition = false;
      motion.targetPress = 1;
      hide();
    }

    function changePreference() {
      if (!enabled()) suspend();
    }

    function focus(event: FocusEvent) {
      if (event.target instanceof Element && event.target.closest(nativeTargets)) hide();
    }

    function visibility() {
      if (document.hidden) suspend();
    }

    refreshRef.current = refreshTarget;
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", move, { passive: true });
    window.addEventListener("pointerdown", press, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", suspend);
    window.addEventListener("scroll", refreshTarget, { passive: true });
    window.addEventListener("resize", refreshTarget);
    window.addEventListener("blur", suspend);
    window.addEventListener("keydown", suspend);
    document.addEventListener("focusin", focus);
    document.addEventListener("visibilitychange", visibility);
    document.documentElement.addEventListener("mouseleave", suspend);
    for (const preference of [finePointer, reducedMotion, forcedColors]) preference.addEventListener("change", changePreference);
    return () => {
      refreshRef.current = null;
      hide();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", suspend);
      window.removeEventListener("scroll", refreshTarget);
      window.removeEventListener("resize", refreshTarget);
      window.removeEventListener("blur", suspend);
      window.removeEventListener("keydown", suspend);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("visibilitychange", visibility);
      document.documentElement.removeEventListener("mouseleave", suspend);
      for (const preference of [finePointer, reducedMotion, forcedColors]) preference.removeEventListener("change", changePreference);
    };
  }, [site]);

  return <div className="figfox-cursor" ref={cursorRef} aria-hidden="true">
    <div className="figfox-cursor-point" ref={pointRef}><div className="figfox-cursor-shape" ref={shapeRef}><span ref={labelRef} /></div></div>
  </div>;
}
