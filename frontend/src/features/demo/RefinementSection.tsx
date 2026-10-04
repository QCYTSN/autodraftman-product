import { ArrowUpRight, ImageSquare, MagnifyingGlassPlus, Minus, Plus, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { sanitizeSvgMarkup } from "../../svgDocument";
import { demoAsset, type DemoLanguage } from "./cases";
import { refinementCases } from "./refinementCases";
import { PairedResultsPlaceholder } from "./ResearchSections";

const words = {
  zh: {
    title: "初稿与修复结果", body: "对照同一张图在初稿与修复阶段的差异。",
    cases: "修复案例", views: "对照范围", detail: "重点局部", full: "完整图",
    draft: "SVG 初稿", repaired: "修复后", original: "查看原图", originalTitle: "原图参照",
    enlarge: "放大对照", close: "关闭对照", open: "在案例中查看",
    zoomIn: "放大图像", zoomOut: "缩小图像",
    scale: "相同范围 · 相同尺度", loading: "正在载入对照图", error: "暂时无法载入对照图", retry: "重新载入",
    note: "展示取自现有实验输出，视觉验收待完成。初稿含首轮后处理，完整评测将在固定设置下补充。",
  },
  en: {
    title: "Drafts and repair outputs", body: "Compare the same figure before and after the repair stage.",
    cases: "Repair examples", views: "Comparison region", detail: "Key detail", full: "Full figure",
    draft: "Draft SVG", repaired: "After repair", original: "View original", originalTitle: "Original reference",
    enlarge: "Enlarge comparison", close: "Close comparison", open: "Inspect in the example",
    zoomIn: "Zoom in", zoomOut: "Zoom out",
    scale: "Same region · Same scale", loading: "Loading comparison", error: "Comparison could not be loaded", retry: "Try again",
    note: "These existing outputs await visual acceptance. The draft includes initial postprocessing; full evaluation will follow under fixed settings.",
  },
};

type Views = { draft: string; repaired: string };
type LoadedViews = { caseId: string; detail: boolean; status: "loading" | "ready" | "error"; views?: Views };

function imageView(markup: string, bounds: readonly number[]) {
  const document = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = document.documentElement;
  svg.setAttribute("viewBox", bounds.join(" "));
  svg.setAttribute("width", String(bounds[2]));
  svg.setAttribute("height", String(bounds[3]));
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
}

export function RefinementSection({ language, onOpenCase }: {
  language: DemoLanguage;
  onOpenCase: (caseId: string, elementId: string) => void;
}) {
  const content = words[language];
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState(true);
  const [visible, setVisible] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState<LoadedViews>({ caseId: "formula", detail: true, status: "loading" });
  const [modal, setModal] = useState<"original" | "pair" | null>(null);
  const [zoom, setZoom] = useState(1);
  const [original, setOriginal] = useState<{ status: "loading" | "ready" | "error"; url?: string }>({ status: "loading" });
  const [originalRevision, setOriginalRevision] = useState(0);
  const section = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const cache = useRef(new Map<string, string>());
  const item = refinementCases[active];
  const matches = loaded.caseId === item.id && loaded.detail === detail;
  const status = matches ? loaded.status : "loading";
  const views = matches ? loaded.views : undefined;
  const bounds = detail ? item.bounds : [0, 0, item.figure.width, item.figure.height];

  useEffect(() => {
    if (visible || !section.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "240px" });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    let cancelled = false;
    const urls: string[] = [];
    setLoaded({ caseId: item.id, detail, status: "loading" });
    async function source(file: "baseline.svg" | "result.svg") {
      const url = demoAsset(item.figure.id, file);
      const cached = cache.current.get(url);
      if (cached) return cached;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Comparison unavailable");
      const markup = await sanitizeSvgMarkup(await response.text());
      if (!cancelled) cache.current.set(url, markup);
      return markup;
    }
    async function load() {
      try {
        const sources = await Promise.all([source("baseline.svg"), source("result.svg")]);
        if (cancelled) return;
        const range = detail ? item.bounds : [0, 0, item.figure.width, item.figure.height];
        const [draft, repaired] = sources.map(markup => {
          const url = imageView(markup, range);
          urls.push(url);
          return url;
        });
        // Wait for actual rendering before enabling the zoom view.
        await Promise.all(urls.map(url => new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Image unavailable"));
          image.src = url;
        })));
        if (!cancelled) setLoaded({ caseId: item.id, detail, status: "ready", views: { draft, repaired } });
      } catch {
        if (!cancelled) setLoaded({ caseId: item.id, detail, status: "error" });
      }
    }
    void load();
    return () => { cancelled = true; controller.abort(); urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [item, detail, visible, revision]);

  useEffect(() => {
    if (modal !== "original") return;
    const controller = new AbortController();
    let cancelled = false;
    let url: string | undefined;
    setOriginal({ status: "loading" });
    async function loadOriginal() {
      try {
        const response = await fetch(demoAsset(item.figure.id, "input.png"), { signal: controller.signal });
        if (!response.ok) throw new Error("Original unavailable");
        const blob = await response.blob();
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        const image = new Image();
        image.src = url;
        await image.decode();
        if (!cancelled) setOriginal({ status: "ready", url });
      } catch {
        if (!cancelled) setOriginal({ status: "error" });
      }
    }
    void loadOriginal();
    return () => { cancelled = true; controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [modal, item, originalRevision]);

  function chooseCase(index: number) {
    setActive(index);
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % refinementCases.length;
    else if (event.key === "ArrowLeft") next = (index + refinementCases.length - 1) % refinementCases.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = refinementCases.length - 1;
    else return;
    event.preventDefault();
    chooseCase(next);
    tabs.current[next]?.focus({ preventScroll: true });
  }

  function showModal(kind: "original" | "pair") {
    // A previous original URL is released when its dialog closes.
    if (kind === "original") setOriginal({ status: "loading" });
    setModal(kind);
    setZoom(1);
    dialog.current?.showModal();
    const viewport = dialog.current?.querySelector(".demo-refinement-dialog-content");
    viewport?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  const comparison = (enlarged = false) => <div className={"demo-refinement-pair" + (enlarged ? " demo-refinement-pair-enlarged" : "")}>
    {(["draft", "repaired"] as const).map(stage => <figure key={stage}>
      <figcaption><span className="demo-refinement-dot" data-stage={stage} />{content[stage]}</figcaption>
      <div className="demo-refinement-image">
        {views && <img src={views[stage]} width={bounds[2]} height={bounds[3]}
          alt={item.figure.name[language] + " · " + content[stage] + " · " + (detail ? item.region[language] : content.full)} />}
      </div>
      <p className="demo-refinement-caption">{item[stage][language]}</p>
    </figure>)}
  </div>;

  return <section className="demo-refinement demo-section" id="demo-results" aria-labelledby="demo-results-title" ref={section}>
    <div className="demo-section-heading" data-demo-reveal>
      <h2 id="demo-results-title">{content.title}</h2>
      <p>{content.body}</p>
    </div>
    <div className="demo-refinement-shell" data-demo-reveal data-demo-delay="1">
      <div className="demo-refinement-tabs" role="tablist" aria-label={content.cases}>
        {refinementCases.map((example, index) => <button type="button" role="tab" key={example.id}
          id={"demo-result-tab-" + example.id} aria-controls="demo-result-panel" aria-selected={active === index}
          tabIndex={active === index ? 0 : -1} ref={element => { tabs.current[index] = element; }}
          onClick={() => chooseCase(index)} onKeyDown={event => moveTab(event, index)} data-allow-wrap="true">
          <span className="demo-refinement-tab-label"><small>0{index + 1}</small><strong>{example.category[language]}</strong></span>
          <span className="demo-refinement-tab-name">{example.figure.name[language]}</span>
        </button>)}
      </div>
      <div className="demo-refinement-panel" id="demo-result-panel" role="tabpanel" aria-labelledby={"demo-result-tab-" + item.id} aria-busy={status === "loading"} tabIndex={0}>
        <div className="demo-refinement-toolbar">
          <span className="demo-refinement-region">{detail ? item.region[language] : item.figure.name[language]}</span>
          <div className="demo-refinement-controls">
            <div className="demo-refinement-range" role="group" aria-label={content.views}>
              <button type="button" aria-pressed={detail} onClick={() => setDetail(true)}>{content.detail}</button>
              <button type="button" aria-pressed={!detail} onClick={() => setDetail(false)}>{content.full}</button>
            </div>
            <button type="button" className="demo-refinement-action" onClick={() => showModal("original")}><ImageSquare size={15} /><span>{content.original}</span></button>
            <button type="button" className="demo-refinement-action" data-demo-cursor="zoom" onClick={() => showModal("pair")} disabled={status !== "ready"}><MagnifyingGlassPlus size={15} /><span>{content.enlarge}</span></button>
          </div>
        </div>
        <div className="demo-refinement-scene" key={item.id}>
          {status === "ready" ? comparison() : <div className="demo-refinement-message" role="status" aria-live="polite">
            <span>{status === "error" ? content.error : content.loading}</span>
            {status === "error" && <button type="button" onClick={() => setRevision(value => value + 1)}>{content.retry}</button>}
          </div>}
        </div>
        <div className="demo-refinement-footer"><span>{content.scale}</span>
          <button type="button" onClick={() => onOpenCase(item.figure.id, item.elementId)}>{content.open}<ArrowUpRight size={13} /></button>
        </div>
      </div>
      <p className="demo-refinement-note">{content.note}</p>
    </div>
    <PairedResultsPlaceholder language={language} nested />
    <dialog className="demo-diagram-dialog demo-refinement-dialog" ref={dialog} aria-label={modal === "original" ? content.originalTitle : content.enlarge}
      onClose={() => setModal(null)}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="demo-dialog-toolbar"><strong>{item.figure.name[language]} · {modal === "original" ? content.originalTitle : content.enlarge}</strong>
        <div className="demo-refinement-dialog-actions">
          <button type="button" onClick={() => setZoom(value => Math.max(1, value - .5))} aria-label={content.zoomOut} disabled={zoom === 1}><Minus size={16} /></button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom(value => Math.min(3, value + .5))} aria-label={content.zoomIn} disabled={zoom === 3}><Plus size={16} /></button>
          <button type="button" onClick={() => dialog.current?.close()} aria-label={content.close}><X size={22} /></button>
        </div>
      </div>
      <div className="demo-refinement-dialog-content">
        <div className="demo-refinement-dialog-canvas" style={{ width: zoom * 100 + "%", "--demo-result-zoom": zoom } as CSSProperties}>
        {modal === "original" ? <>
          {original.status !== "ready" ? <div className="demo-refinement-message" role="status"><span>{original.status === "error" ? content.error : content.loading}</span>
            {original.status === "error" && <button type="button" onClick={() => setOriginalRevision(value => value + 1)}>{content.retry}</button>}
          </div> : <svg className="demo-refinement-original" viewBox={bounds.join(" ")} width={bounds[2]} height={bounds[3]} role="img" aria-label={item.figure.name[language] + " · " + content.originalTitle}>
            <image href={original.url} width={item.figure.width} height={item.figure.height} />
          </svg>}
          <p className="demo-refinement-original-caption">{detail ? item.region[language] : content.full}</p>
        </> : modal === "pair" && (status === "ready" ? comparison(true) : <div className="demo-refinement-message" role="status">{content.loading}</div>)}
        </div>
      </div>
    </dialog>
  </section>;
}
