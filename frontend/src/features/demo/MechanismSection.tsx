import { ArrowUpRight, Check, Circle, MagnifyingGlassPlus, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { sanitizeSvgMarkup } from "../../svgDocument";
import { demoAsset, type DemoLanguage } from "./cases";
import { MechanismPreview } from "./MechanismPreview";
import { mechanismAsset, mechanisms, relationBounds, representationBounds, type ContentLayer, type MechanismKind, type RepairReceipt } from "./mechanisms";

const words = {
  zh: {
    title: "重建与修复的技术细节",
    body: "框架图中的五个支撑模块，分别用于图像重建、差异检测和局部修复。",
    tabs: "五个支撑模块", actual: "现有实验 · 学习与记忆", illustration: "方法示意",
    enlarge: "放大局部对照", close: "关闭局部对照", open: "在案例中查看", formulaSource: "现有实验 · 潜空间扩散模型",
    loading: "正在载入实验局部", error: "暂时无法载入实验局部", retry: "重新载入",
    receipt: "这次修复的执行回执", executed: "文字变换已执行", measured: "容纳与间距检查通过", pending: "视觉验收待完成",
    unconfirmed: "检查结果待确认", receiptMissing: "执行回执暂不可用",
    note: "展示取自现有实验，关系与分层标注用于解释方法。局部检查通过仍需视觉复查；完整评测将在固定设置下补充。",
    publicNote: "示意解释各模块的作用。重建质量与修复效果，以实际结果及后续评测为准。",
  },
  en: {
    title: "Reconstruction and repair in detail",
    body: "The five support modules in the pipeline contribute to reconstruction, difference detection, and local repair.",
    tabs: "Five support modules", actual: "Existing experiment · Learning and memory", illustration: "Method illustration",
    enlarge: "Enlarge the local pair", close: "Close local pair", open: "Inspect in the example", formulaSource: "Existing experiment · Latent diffusion",
    loading: "Loading experiment details", error: "Experiment details could not be loaded", retry: "Try again",
    receipt: "Receipt for this repair", executed: "Text transformation executed", measured: "Containment and spacing checks passed", pending: "Visual acceptance pending",
    unconfirmed: "Check outcome unconfirmed", receiptMissing: "Repair receipt unavailable",
    note: "Views are taken from existing experiments; relationship and layer annotations explain the method. Local checks still require visual review. Full evaluation will follow under fixed settings.",
    publicNote: "Illustrations explain each module’s role. Reconstruction and repair quality depend on actual results and subsequent evaluation.",
  },
};

export type MechanismEvidence = { draft?: string; final?: string; formula?: string; receipt?: RepairReceipt };
type LoadedEvidence = { kind: MechanismKind; status: "loading" | "ready" | "error"; data: MechanismEvidence };

// Serialize views into independent SVG image documents. Original styles,
// transforms, embedded images, and symbol definitions stay in their own scope.
// Nothing is written back to the source or the editable example.
function svgView(markup: string, bounds: readonly number[], elementId?: string) {
  const document = new DOMParser().parseFromString(markup, "image/svg+xml");
  const original = document.documentElement;
  let svg: Element = original;
  if (elementId) {
    const selected = document.getElementById(elementId);
    if (!selected) throw new Error("Element unavailable");
    svg = original.cloneNode(false) as Element;
    for (const definition of original.querySelectorAll("defs, style")) {
      if (!definition.parentElement?.closest("defs") && !selected.contains(definition)) svg.append(definition.cloneNode(true));
    }
    let element = selected.cloneNode(true) as Element;
    for (let parent = selected.parentElement; parent && parent !== original; parent = parent.parentElement) {
      const ancestor = parent.cloneNode(false) as Element;
      ancestor.append(element);
      element = ancestor;
    }
    svg.append(element);
  }
  svg.setAttribute("viewBox", bounds.join(" "));
  svg.setAttribute("width", String(bounds[2]));
  svg.setAttribute("height", String(bounds[3]));
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
}

export function MechanismSection({ language, localCasesAvailable, onOpenCase }: {
  language: DemoLanguage;
  localCasesAvailable: boolean;
  onOpenCase: (caseId: string, elementId: string) => void;
}) {
  const content = words[language];
  const [active, setActive] = useState(1);
  const [layer, setLayer] = useState<ContentLayer>("text");
  const [visible, setVisible] = useState(!localCasesAvailable);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState<LoadedEvidence>({ kind: "relations", status: "loading", data: {} });
  const section = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const cache = useRef(new Map<string, string>());
  const item = mechanisms[active];
  const status = loaded.kind === item.kind ? loaded.status : "loading";
  const evidence = loaded.kind === item.kind ? loaded.data : {};
  const formulaActive = item.kind === "representation" && layer === "formula";

  useEffect(() => {
    if (visible || !section.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "240px" });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !localCasesAvailable) return;
    const controller = new AbortController();
    let cancelled = false;
    const urls: string[] = [];
    setLoaded({ kind: item.kind, status: "loading", data: {} });
    async function source(url: string) {
      const cached = cache.current.get(url);
      if (cached) return cached;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Evidence unavailable");
      const markup = await sanitizeSvgMarkup(await response.text());
      if (!cancelled) cache.current.set(url, markup);
      return markup;
    }
    function view(markup: string, bounds: readonly number[], id?: string) {
      if (cancelled) throw new Error("Cancelled");
      const url = svgView(markup, bounds, id);
      urls.push(url);
      return url;
    }
    async function load() {
      try {
        const data: MechanismEvidence = {};
        if (item.kind === "relations") {
          data.draft = view(await source(mechanismAsset("baseline.svg")), relationBounds);
        } else if (item.kind === "representation") {
          const [study, diffusion] = await Promise.all([source(demoAsset("study", "result.svg")), source(demoAsset("diffusion", "result.svg"))]);
          data.final = view(study, representationBounds);
          data.formula = view(diffusion, [435, 199, 149, 49], "plus_node_47");
        } else if (item.kind === "execution") {
          const [draft, final, response] = await Promise.all([
            source(mechanismAsset("baseline.svg")), source(demoAsset("study", "result.svg")),
            fetch(mechanismAsset("repair-receipt.json"), { signal: controller.signal }),
          ]);
          data.draft = view(draft, [554, 252, 368, 142]);
          data.final = view(final, [554, 252, 368, 142]);
          if (response.ok) data.receipt = await response.json() as RepairReceipt;
        }
        if (!cancelled) setLoaded({ kind: item.kind, status: "ready", data });
      } catch {
        if (!cancelled) setLoaded({ kind: item.kind, status: "error", data: {} });
      }
    }
    void load();
    return () => { cancelled = true; controller.abort(); urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [item, visible, localCasesAvailable, revision]);

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % mechanisms.length;
    else if (event.key === "ArrowLeft") next = (index + mechanisms.length - 1) % mechanisms.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = mechanisms.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus({ preventScroll: true });
    tabs.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  }

  function inspectExample() {
    if (formulaActive) return onOpenCase("diffusion", "plus_node_47");
    const layerElements = { text: "plus_node_43", vector: "exp1_restudy_panel", image: "plus_node_94", formula: "plus_node_47" };
    onOpenCase("study", item.kind === "representation" ? layerElements[layer] : item.elementId);
  }

  const receipt = evidence.receipt;
  const geometryPassed = receipt?.geometryStatus === "measured_converged" && receipt.checks.length > 0 && receipt.checks.every(check => check.status === "satisfied");
  const transformed = receipt?.status === "changed_unverified";

  return <section className="demo-mechanisms demo-section" id="demo-content" aria-labelledby="demo-content-title" ref={section}>
    <div className="demo-section-heading" data-demo-reveal>
      <h2 id="demo-content-title">{content.title}</h2>
      <p>{content.body}</p>
    </div>
    <div className="demo-mechanism-shell" data-demo-reveal data-demo-delay="1">
      <div className="demo-mechanism-tabs" role="tablist" aria-label={content.tabs}>
        {mechanisms.map((mechanism, index) => <button type="button" role="tab" key={mechanism.kind}
          id={"demo-tab-" + mechanism.kind} aria-controls="demo-mechanism-panel" aria-selected={active === index}
          tabIndex={active === index ? 0 : -1} ref={element => { tabs.current[index] = element; }}
          onClick={() => setActive(index)} onKeyDown={event => moveTab(event, index)}>
          <span className="demo-mechanism-number">0{index + 1}</span><span>{mechanism.name[language]}</span>
        </button>)}
      </div>
      <div className="demo-mechanism-panel" id="demo-mechanism-panel" role="tabpanel" aria-labelledby={"demo-tab-" + item.kind} aria-busy={localCasesAvailable && status === "loading"} tabIndex={0}>
        <div className="demo-mechanism-view" key={item.kind}>
          <div className="demo-mechanism-visual">
            <div className="demo-mechanism-evidence-label"><span>{localCasesAvailable ? formulaActive ? content.formulaSource : content.actual : content.illustration}</span>
              {item.kind === "crops" && <button type="button" data-demo-cursor="zoom" onClick={() => dialog.current?.showModal()} aria-label={content.enlarge}><MagnifyingGlassPlus size={17} /></button>}
            </div>
            {localCasesAvailable && status !== "ready" ? <div className="demo-mechanism-message" role="status" aria-live="polite">
              <span>{status === "error" ? content.error : content.loading}</span>
              {status === "error" && <button type="button" onClick={() => setRevision(value => value + 1)}>{content.retry}</button>}
            </div> : <MechanismPreview kind={item.kind} language={language} local={localCasesAvailable} evidence={evidence} layer={layer} onLayerChange={setLayer} />}
          </div>
          <div className="demo-mechanism-explanation">
            <span className="demo-mechanism-module">{item.module}</span>
            <h3>{item.title[language]}</h3>
            <p>{!localCasesAvailable && item.kind === "execution" ? language === "zh" ? "修复程序测量文字与图形的实际边界，执行位置与尺寸调整，再检查容纳关系和邻近间距。结果通过回执进入复查，执行完成之后仍需视觉验收。" : "Repair programs measure actual text and shape bounds, adjust position and size, then check containment and neighboring spacing. Receipts support further review; execution is followed by visual acceptance." : item.description[language]}</p>
            {item.kind !== "execution" && <dl className="demo-mechanism-facts">{item.facts.map(fact => <div key={fact.label.en}><dt>{fact.label[language]}</dt><dd>{fact.value[language]}</dd></div>)}</dl>}
            {item.kind === "execution" && localCasesAvailable && status === "ready" && <div className="demo-repair-receipt" aria-label={content.receipt}>
              <strong>{content.receipt}</strong>
              {!receipt ? <p>{content.receiptMissing}</p> : <ul>
                <li data-passed={transformed}>{transformed ? <Check size={14} /> : <Circle size={12} />}{transformed ? content.executed : content.unconfirmed}</li>
                <li data-passed={geometryPassed}>{geometryPassed ? <Check size={14} /> : <Circle size={12} />}{geometryPassed ? content.measured : content.unconfirmed}</li>
                <li>{!receipt.visualPassed && receipt.visualAcceptance === "pending" ? <><Circle size={12} />{content.pending}</> : <><Circle size={12} />{content.unconfirmed}</>}</li>
              </ul>}
            </div>}
            <div className="demo-mechanism-footer"><span>{item.stage[language]}</span>
              {localCasesAvailable && <button type="button" onClick={inspectExample}>{content.open}<ArrowUpRight size={14} /></button>}
            </div>
          </div>
        </div>
      </div>
    </div>
    <p className="demo-mechanism-note" data-demo-reveal data-demo-delay="2">{localCasesAvailable ? content.note : content.publicNote}</p>
    <dialog className="demo-diagram-dialog demo-crop-dialog" ref={dialog} aria-label={content.enlarge} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="demo-dialog-toolbar"><strong>{content.enlarge}</strong><button type="button" aria-label={content.close} onClick={() => dialog.current?.close()}><X size={22} /></button></div>
      <div className="demo-crop-dialog-content"><MechanismPreview kind="crops" language={language} local={localCasesAvailable} evidence={{}} layer="text" onLayerChange={() => {}} /></div>
    </dialog>
  </section>;
}
