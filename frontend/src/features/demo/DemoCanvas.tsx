import {
  ArrowsOut, ArrowsClockwise, DownloadSimple, Eye,
  MagnifyingGlassMinus, MagnifyingGlassPlus, PencilSimple,
} from "@phosphor-icons/react";
import {
  useEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent, type PointerEvent,
} from "react";
import { sanitizeSvgMarkup } from "../../svgDocument";
import { demoAsset, type DemoCase, type DemoLanguage } from "./cases";

type SavedElement = { transform: string | null; markup: string };
type Drag = {
  element: SVGGraphicsElement;
  matrix: DOMMatrix;
  start: DOMPoint;
  transform: string;
  moved: boolean;
};
const selectable = "text,rect,path,image,polygon,polyline,circle,ellipse,line,use";

export function DemoCanvas({ item, language, focusedElementId = null, focusRevision = 0 }: {
  item: DemoCase; language: DemoLanguage; focusedElementId?: string | null; focusRevision?: number;
}) {
  const zh = language === "zh";
  const mount = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const outline = useRef<HTMLDivElement>(null);
  const selected = useRef<SVGGraphicsElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const originals = useRef(new Map<SVGGraphicsElement, SavedElement>());
  const cancelEdit = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState(1);
  const [comparison, setComparison] = useState(false);
  const [changes, setChanges] = useState(0);
  const [selectionText, setSelectionText] = useState("");
  const [editing, setEditing] = useState<{
    element: SVGGraphicsElement; value: string; left: number; top: number;
    width: number; height: number; fontSize: number; fontFamily: string;
  } | null>(null);
  const [originalOnly, setOriginalOnly] = useState(false);
  const focusedElement = useRef(focusedElementId);
  focusedElement.current = focusedElementId;

  function updateOutline() {
    const element = selected.current;
    const box = outline.current;
    const viewport = stage.current;
    if (!element || !box || !viewport || !element.isConnected) {
      if (box) box.hidden = true;
      return;
    }
    const bounds = element.getBoundingClientRect();
    const parent = viewport.getBoundingClientRect();
    box.hidden = false;
    box.style.left = bounds.left - parent.left + viewport.scrollLeft - 3 + "px";
    box.style.top = bounds.top - parent.top + viewport.scrollTop - 3 + "px";
    box.style.width = bounds.width + 6 + "px";
    box.style.height = bounds.height + 6 + "px";
  }

  function selectElement(element: SVGGraphicsElement | null) {
    selected.current = element;
    setSelectionText(element?.tagName.toLowerCase() === "text"
      ? element.textContent ?? "" : "");
    updateOutline();
  }

  function remember(element: SVGGraphicsElement) {
    if (!originals.current.has(element)) {
      originals.current.set(element, {
        transform: element.getAttribute("transform"), markup: element.innerHTML,
      });
    }
  }

  function recordChanges() {
    for (const [element, original] of originals.current) {
      if (element.getAttribute("transform") === original.transform &&
          element.innerHTML === original.markup) originals.current.delete(element);
    }
    setChanges(originals.current.size);
    updateOutline();
  }

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setStatus("loading");
    setZoom(1);
    setComparison(false);
    setOriginalOnly(false);
    setChanges(0);
    setEditing(null);
    selectElement(null);
    originals.current.clear();
    if (mount.current) mount.current.replaceChildren();
    async function load() {
      try {
        const response = await fetch(demoAsset(item.id, "result.svg"), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Case unavailable");
        const markup = await sanitizeSvgMarkup(await response.text(), item.id + ".svg");
        if (cancelled || !mount.current) return;
        mount.current.innerHTML = markup;
        const svg = mount.current.querySelector("svg");
        svg?.setAttribute("width", "100%");
        svg?.setAttribute("height", "100%");
        svg?.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg?.setAttribute("aria-hidden", "true");
        setStatus("ready");
        requestAnimationFrame(() => {
          if (cancelled) return;
          const text = [...(mount.current?.querySelectorAll("text") ?? [])].find((element) =>
            !element.closest("defs") && element.getBoundingClientRect().width > 0);
          const requested = focusedElement.current ? svg?.querySelector<SVGGraphicsElement>("#" + CSS.escape(focusedElement.current)) : null;
          selectElement(requested ?? text ?? null);
        });
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [item.id]);

  useEffect(() => {
    if (status !== "ready" || !focusedElementId) return;
    const element = mount.current?.querySelector<SVGGraphicsElement>("#" + CSS.escape(focusedElementId));
    if (element) {
      setOriginalOnly(false);
      setComparison(false);
      setZoom(1);
      selectElement(element);
      stage.current?.focus({ preventScroll: true });
    }
  }, [focusedElementId, status, focusRevision]);

  useEffect(() => {
    const viewport = stage.current;
    if (!viewport) return;
    const observer = new ResizeObserver(updateOutline);
    observer.observe(viewport);
    const animation = requestAnimationFrame(updateOutline);
    return () => { observer.disconnect(); cancelAnimationFrame(animation); };
  }, [zoom, status]);

  function startEdit(element = selected.current) {
    if (!element || element.tagName.toLowerCase() !== "text" || !stage.current) return;
    selectElement(element);
    const bounds = element.getBoundingClientRect();
    const viewport = stage.current.getBoundingClientRect();
    const style = getComputedStyle(element);
    const matrix = element.getScreenCTM();
    const scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
    cancelEdit.current = false;
    setEditing({
      element, value: element.textContent ?? "",
      left: Math.max(4, bounds.left - viewport.left + stage.current.scrollLeft - 4),
      top: Math.max(4, bounds.top - viewport.top + stage.current.scrollTop - 3),
      width: Math.min(Math.max(bounds.width + 24, 140), stage.current.clientWidth - 12),
      height: Math.max(bounds.height + 10, 32),
      fontSize: Math.max(12, parseFloat(style.fontSize) * scale),
      fontFamily: style.fontFamily,
    });
  }

  function commitEdit() {
    if (!editing) return;
    if (!cancelEdit.current && editing.value !== editing.element.textContent) {
      remember(editing.element);
      editing.element.textContent = editing.value;
      setSelectionText(editing.value);
      recordChanges();
    }
    setEditing(null);
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (originalOnly || comparison || editing || event.button !== 0) return;
    const target = event.target instanceof Element
      ? event.target.closest(selectable) : null;
    if (!(target instanceof SVGGraphicsElement) || !mount.current?.contains(target)) return;
    selectElement(target);
    const parent = target.parentElement as unknown as SVGGraphicsElement;
    const matrix = parent.getScreenCTM()?.inverse();
    if (!matrix) return;
    drag.current = {
      element: target, matrix,
      start: new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix),
      transform: target.getAttribute("transform") ?? "", moved: false,
    };
    event.currentTarget.focus({ preventScroll: true });
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    if (!event.buttons) { pointerUp(); return; }
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(current.matrix);
    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;
    if (!current.moved && Math.hypot(dx, dy) < 3) return;
    if (!current.moved) event.currentTarget.setPointerCapture(event.pointerId);
    remember(current.element);
    current.moved = true;
    event.currentTarget.setAttribute("data-demo-dragging", "");
    current.element.setAttribute("transform",
      "translate(" + dx.toFixed(3) + " " + dy.toFixed(3) + ") " + current.transform);
    updateOutline();
  }

  function pointerUp() {
    if (drag.current?.moved) recordChanges();
    drag.current = null;
    stage.current?.removeAttribute("data-demo-dragging");
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLInputElement || originalOnly || comparison) return;
    if (event.key === "Enter") { event.preventDefault(); startEdit(); return; }
    if (event.key === "Escape") { selectElement(null); return; }
    const element = selected.current;
    const step = event.shiftKey ? 10 : 2;
    const movement: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0],
      ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    if (element && movement[event.key]) {
      event.preventDefault();
      remember(element);
      const [x, y] = movement[event.key];
      element.setAttribute("transform",
        "translate(" + x + " " + y + ") " + (element.getAttribute("transform") ?? ""));
      recordChanges();
    }
  }

  function reset() {
    cancelEdit.current = true;
    setEditing(null);
    for (const [element, original] of originals.current) {
      if (original.transform === null) element.removeAttribute("transform");
      else element.setAttribute("transform", original.transform);
      element.innerHTML = original.markup;
    }
    originals.current.clear();
    setChanges(0);
    selectElement(selected.current);
  }

  function download() {
    const svg = mount.current?.querySelector("svg");
    if (!svg) return;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("width", String(item.width));
    copy.setAttribute("height", String(item.height));
    copy.removeAttribute("aria-hidden");
    const url = URL.createObjectURL(new Blob(
      [new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" },
    ));
    const link = document.createElement("a");
    link.href = url;
    link.download = "FigFox-" + item.id + ".svg";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="demo-canvas" style={{ "--demo-aspect": item.width / item.height } as CSSProperties}>
      <div className="demo-canvas-toolbar">
        <div className="demo-view-switch" aria-label={zh ? "画布视图" : "Canvas view"}>
          <button type="button" aria-pressed={!originalOnly} onClick={() => setOriginalOnly(false)}>
            {zh ? "可编辑 SVG" : "Editable SVG"}
          </button>
          <button type="button" aria-pressed={originalOnly} onClick={() => setOriginalOnly(true)}>
            {zh ? "原图" : "Original"}
          </button>
        </div>
        <div className="demo-canvas-tools">
          <button type="button" disabled={status !== "ready" || originalOnly}
            aria-pressed={comparison} title={zh ? "按住对照原图" : "Hold to compare"}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId); setComparison(true);
            }}
            onPointerUp={() => setComparison(false)}
            onPointerCancel={() => setComparison(false)}
            onLostPointerCapture={() => setComparison(false)}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault(); setComparison(true);
              }
            }}
            onKeyUp={() => setComparison(false)} onBlur={() => setComparison(false)}>
            <Eye size={17} /><span>{zh ? "对照" : "Compare"}</span>
          </button>
          <button type="button" onClick={reset} disabled={!changes}
            title={zh ? "恢复案例" : "Reset example"} aria-label={zh ? "恢复案例" : "Reset example"}>
            <ArrowsClockwise size={17} />
          </button>
          <span className="demo-zoom-tools">
            <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
              disabled={zoom === 1} aria-label={zh ? "缩小" : "Zoom out"}>
              <MagnifyingGlassMinus size={17} />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
              disabled={zoom === 3} aria-label={zh ? "放大" : "Zoom in"}>
              <MagnifyingGlassPlus size={17} />
            </button>
            <button type="button" onClick={() => setZoom(1)}
              aria-label={zh ? "适应画布" : "Fit canvas"}>
              <ArrowsOut size={17} />
            </button>
          </span>
          <button type="button" onClick={download} disabled={status !== "ready"}
            aria-label={zh ? "下载 SVG" : "Download SVG"}>
            <DownloadSimple size={17} />
          </button>
        </div>
      </div>
      <div className="demo-canvas-stage" ref={stage} tabIndex={0} role="group"
        aria-label={zh ? "可编辑案例画布，方向键移动选中元素，Enter 修改文字" :
          "Editable canvas. Arrow keys move selection; Enter edits text."}
        onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp}
        onKeyDown={keyDown} onScroll={updateOutline}
        onDoubleClick={(event) => {
          const target = event.target instanceof Element ? event.target.closest("text") : null;
          if (target instanceof SVGGraphicsElement && !originalOnly && !comparison) startEdit(target);
        }}>
        <div className="demo-svg-mount" ref={mount}
          style={{ width: zoom * 100 + "%", height: zoom * 100 + "%",
            visibility: originalOnly || comparison ? "hidden" : "visible" }} />
        {(originalOnly || comparison) && (
          <div className="demo-original-view" style={{ width: zoom * 100 + "%", height: zoom * 100 + "%" }}>
            <img src={demoAsset(item.id, "input.png")} alt={item.name[language]} width={item.width} height={item.height} />
          </div>
        )}
        <div className="demo-selection" ref={outline} hidden
          style={{ visibility: originalOnly || comparison ? "hidden" : "visible" }}>
          <i /><i /><i /><i />
        </div>
        {editing && (
          <input className="demo-text-edit" aria-label={zh ? "修改案例文字" : "Edit example text"}
            autoFocus value={editing.value} onFocus={(event) => event.currentTarget.select()}
            style={{ left: editing.left, top: editing.top, width: editing.width,
              height: editing.height, fontSize: editing.fontSize, fontFamily: editing.fontFamily }}
            onChange={(event) => setEditing({ ...editing, value: event.target.value })}
            onBlur={commitEdit} onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") commitEdit();
              if (event.key === "Escape") { cancelEdit.current = true; setEditing(null); }
            }} />
        )}
        {status !== "ready" && <div className="demo-canvas-message" role="status">
          {status === "loading" ? (zh ? "正在加载案例…" : "Loading example…") :
            (zh ? "案例暂不可用" : "Example unavailable")}
        </div>}
      </div>
      <div className="demo-canvas-footer">
        <span>{zh ? "拖动元素，双击文字修改" : "Drag an element. Double-click text to edit."}</span>
        <button type="button" disabled={!selectionText || originalOnly} onClick={() => startEdit()}>
          <PencilSimple size={15} />{zh ? "修改选中文字" : "Edit selected text"}
        </button>
      </div>
    </div>
  );
}
