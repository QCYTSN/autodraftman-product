import {
  ArrowCounterClockwise, ArrowDown, ArrowRight, ArrowsLeftRight, GithubLogo, Globe, MagnifyingGlassPlus, X,
} from "@phosphor-icons/react";
import { useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { ProductRoute } from "../../ProductPages";
import { DemoCanvas } from "./DemoCanvas";
import { DemoCursor } from "./DemoCursor";
import { MechanismSection } from "./MechanismSection";
import { RefinementSection } from "./RefinementSection";
import { ResearchSections } from "./ResearchSections";
import { HeroSvgWord } from "./HeroSvgWord";
import { demoAsset, demoBrandAsset, demoCases, type DemoLanguage } from "./cases";
import { useDemoMotion } from "./useDemoMotion";
import "./demo.css";

type Props = {
  language: DemoLanguage;
  onLanguageChange: () => void;
  onNavigate: (path: ProductRoute) => void;
  hrefFor: (path: ProductRoute) => string;
};

const words = {
  zh: {
    cases: "案例", method: "方法", scope: "支撑机制", results: "修复对照", evaluation: "评测", source: "源代码", try: "开始使用",
    titleFirst: "将科研图像", titlePrefix: "重建为", titleAccent: "可编辑",
    intro: "根据图中关系，重建文字、图形与布局。",
    introDetail: "对照原图检测差异，执行修复并复查。",
    replay: "重播", replayLabel: "重播关系重建与局部修复示意",
    explore: "查看案例", scroll: "向下探索",
    examplesTitle: "直接编辑 FigFox 的重建结果",
    examplesBody: "拖动元素、修改文字，或按住对照原图。选择一个案例开始。",
    caseNote: "现有实验案例",
    comparisonTitle: "对照原图，查看重建细节",
    comparisonBody: "移动分割线，比较文字、图形和布局。也可以切换其他案例。",
    original: "原图", result: "重建结果",
    comparisonLabel: "原图与重建结果的分割位置",
    methodTitle: "FigFox 如何重建一张图",
    methodBody: "从图中元素的关系出发，生成 SVG，再检查差异并执行修复。",
    steps: [
      ["关系引导重建", "识别图形与相对布局，构建 SVG 初稿。"],
      ["错误检测与计划", "结合原图与局部对照，定位需要修复的问题。"],
      ["执行与迭代修复", "执行修复程序，根据结果回执继续检查。"],
    ],
    enlarge: "放大流程图", close: "关闭流程图",
    methodAlt: "FigFox 核心流程：关系引导 SVG 重建、错误检测与计划、执行与迭代修复。",
    evidenceNote: "以上为现有实验案例，展示原始重建结果及可编辑内容。完整评测将在固定设置下补充。",
    closingTitle: "开始使用 FigFox",
    closingBody: "进入工作台，或查看使用指南。",
    workspace: "进入工作台", guide: "使用指南", pricing: "定价", privacy: "隐私",
    footer: "科研图像的重建与编辑",
  },
  en: {
    cases: "Examples", method: "Method", scope: "Mechanisms", results: "Repairs", evaluation: "Evaluation", source: "Source", try: "Try FigFox",
    titleFirst: "Reconstruct scientific figures", titlePrefix: "as ", titleAccent: "editable",
    intro: "Reconstruct text, shapes, and their relationships.",
    introDetail: "Compare with the original. Repair and review.",
    replay: "Replay", replayLabel: "Replay the relation-guided reconstruction and local refinement illustration",
    explore: "Explore examples", scroll: "Scroll to explore",
    examplesTitle: "Edit actual FigFox reconstructions",
    examplesBody: "Move elements, edit text, and hold to compare with the original. Choose an example to begin.",
    caseNote: "Existing experiment examples",
    comparisonTitle: "Compare the reconstruction with its source",
    comparisonBody: "Move the divider to inspect text, shapes, and layout. Switch examples to explore more.",
    original: "Original", result: "Reconstruction",
    comparisonLabel: "Original and reconstruction split position",
    methodTitle: "How FigFox reconstructs a figure",
    methodBody: "Reconstruct the relationships between elements, inspect differences, and execute repairs.",
    steps: [
      ["Relation-guided reconstruction", "Identify elements and relative layout to compose a draft SVG."],
      ["Error detection and planning", "Inspect the original and local comparisons to plan corrections."],
      ["Execution and refinement", "Execute repairs and review the resulting receipts."],
    ],
    enlarge: "Enlarge the diagram", close: "Close diagram",
    methodAlt: "FigFox pipeline: relation-guided SVG reconstruction, error detection and planning, execution and refinement.",
    evidenceNote: "These existing experiments show original reconstructions and editable content. A full evaluation will follow under fixed settings.",
    closingTitle: "Start using FigFox",
    closingBody: "Open the workspace or read the guide.",
    workspace: "Open workspace", guide: "Guide", pricing: "Pricing", privacy: "Privacy",
    footer: "Scientific figure reconstruction and editing",
  },
} as const;

export function FigFoxDemoPage({ language, onLanguageChange, onNavigate, hrefFor }: Props) {
  const content = words[language];
  const [active, setActive] = useState(0);
  const [split, setSplit] = useState(50);
  const [failedImages, setFailedImages] = useState(false);
  const [heroRevision, setHeroRevision] = useState(0);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const [focusRevision, setFocusRevision] = useState(0);
  const diagramDialog = useRef<HTMLDialogElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const item = demoCases[active];

  useDemoMotion(page);

  function navigate(event: MouseEvent<HTMLAnchorElement>, destination: ProductRoute) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(destination);
  }

  function chooseCase(index: number) {
    setActive(index);
    setSplit(50);
    setFailedImages(false);
    setFocusedElement(null);
  }

  function openContentCase(caseId: string, elementId: string) {
    const index = demoCases.findIndex(example => example.id === caseId);
    if (index < 0) return;
    chooseCase(index);
    setFocusedElement(elementId);
    setFocusRevision(revision => revision + 1);
    requestAnimationFrame(() => document.getElementById("demo-examples")?.scrollIntoView({ block: "start" }));
  }

  const workspaceLink = (className = "demo-primary") => (
    <a className={className} href={hrefFor("/workspace")} onClick={(event) => navigate(event, "/workspace")}>
      {content.try}<ArrowRight size={17} />
    </a>
  );

  return (
    <div className="demo-site" ref={page} lang={language === "zh" ? "zh-CN" : "en"}>
      <DemoCursor page={page} />
      <header className="demo-header">
        <div className="demo-container demo-header-inner">
          <a className="demo-brand" href={hrefFor("/")} aria-label="FigFox">
            <img src={demoBrandAsset("figfox-logo.svg")} width="44" height="36" alt="" />
            <strong>FigFox</strong>
          </a>
          <nav className="demo-nav" aria-label={language === "zh" ? "演示页导航" : "Showcase navigation"}>
            <span className="demo-nav-indicator" aria-hidden="true" />
            <a href="#demo-examples">{content.cases}</a>
            <a href="#demo-method">{content.method}</a>
            <a className="demo-nav-detail" href="#demo-content">{content.scope}</a>
            <a href="#demo-results">{content.results}</a>
            <a href="#demo-evaluation">{content.evaluation}</a>
            <a href="https://github.com/LawrenceRiver/FigFox" target="_blank" rel="noreferrer">
              <GithubLogo size={17} />{content.source}
            </a>
          </nav>
          <div className="demo-header-actions">
            <button className="demo-language" type="button" onClick={onLanguageChange}
              aria-label={language === "zh" ? "切换为英文" : "Switch to Chinese"}>
              <Globe size={17} /><span>{language === "zh" ? "EN" : "中文"}</span>
            </button>
            {workspaceLink()}
          </div>
        </div>
      </header>

      <main className="demo-container demo-main">
        <section className="demo-hero" aria-labelledby="demo-title">
          <div className="demo-introduction">
            <h1 id="demo-title">
              <span className="demo-title-lead">{content.titleFirst}</span>
              <span className="demo-title-result">
                <span className="demo-title-prefix">{content.titlePrefix}</span>
                <span className="demo-title-accent"><span className="demo-title-accent-text">{content.titleAccent}</span>{" "}<HeroSvgWord language={language} revision={heroRevision} /></span>
              </span>
            </h1>
            <p className="demo-hero-description">
              <span>{content.intro}</span>
              <span className="demo-hero-detail">
                {content.introDetail}
                <button className="demo-hero-replay" type="button" aria-label={content.replayLabel}
                  onClick={() => setHeroRevision(revision => revision + 1)}>
                  <ArrowCounterClockwise size={12} />{content.replay}
                </button>
              </span>
            </p>
            <div className="demo-hero-actions">
              <a className="demo-primary" href="#demo-examples">
                {content.explore}<ArrowDown size={18} />
              </a>
              <a className="demo-hero-source" href="https://github.com/LawrenceRiver/FigFox" target="_blank" rel="noreferrer">
                <GithubLogo size={19} />GitHub
              </a>
            </div>
          </div>
          <a className="demo-scroll-cue" href="#demo-examples">
            <span>{content.scroll}</span><ArrowDown size={17} />
          </a>
        </section>

        <section className="demo-examples demo-section" id="demo-examples" aria-labelledby="demo-examples-title">
            <div className="demo-section-heading" data-demo-reveal>
              <h2 id="demo-examples-title">{content.examplesTitle}</h2>
              <p>{content.examplesBody}</p>
            </div>
            <div className="demo-canvas-reveal" data-demo-reveal data-demo-delay="1">
              <DemoCanvas key={item.id} item={item} language={language} focusedElementId={focusedElement} focusRevision={focusRevision} />
            </div>
            <div data-demo-reveal data-demo-delay="2">
              <div className="demo-case-picker" role="group" aria-label={content.cases}>
                {demoCases.map((example, index) => (
                  <button type="button" key={example.id} aria-pressed={active === index} data-allow-wrap="true"
                    onClick={() => chooseCase(index)}>
                    <img src={demoAsset(example.id, "input.png")} alt="" width="100" height="68"
                      onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                    <span><strong>{example.name[language]}</strong><small>{example.category[language]}</small></span>
                  </button>
                ))}
              </div>
              <p className="demo-case-note">{content.caseNote}</p>
            </div>
        </section>

        <section className="demo-evidence demo-section" aria-labelledby="demo-compare-title">
            <div className="demo-section-heading" data-demo-reveal>
              <h2 id="demo-compare-title">{content.comparisonTitle}</h2>
              <p>{content.comparisonBody}</p>
            </div>
            <div data-demo-reveal data-demo-delay="1">
              <div className="demo-comparison-labels"><span>{content.original}</span><span>{content.result}</span></div>
              <div className="demo-comparison" style={{ "--demo-split": split + "%", "--demo-aspect": item.width / item.height } as CSSProperties}>
                <img src={demoAsset(item.id, "result.png")} alt={content.result + ": " + item.name[language]}
                  width={item.width} height={item.height} loading="lazy" onError={() => setFailedImages(true)} />
                <div className="demo-comparison-original">
                  <img src={demoAsset(item.id, "input.png")} alt={content.original + ": " + item.name[language]}
                    width={item.width} height={item.height} loading="lazy" onError={() => setFailedImages(true)} />
                </div>
                <div className="demo-comparison-divider" aria-hidden="true"><span><ArrowsLeftRight size={19} /></span></div>
                <input type="range" min="0" max="100" value={split}
                  aria-label={content.comparisonLabel} onChange={(event) => setSplit(Number(event.target.value))} />
                {failedImages && <p className="demo-comparison-error">
                  {language === "zh" ? "案例暂不可用" : "Example unavailable"}
                </p>}
              </div>
            </div>
        </section>

        <section className="demo-method demo-section" id="demo-method" aria-labelledby="demo-method-title">
          <div className="demo-section-heading" data-demo-reveal>
            <h2 id="demo-method-title">{content.methodTitle}</h2>
            <p>{content.methodBody}</p>
          </div>
          <figure className="demo-method-figure" data-demo-reveal data-demo-delay="1">
            <button type="button" className="demo-method-preview" data-demo-cursor="zoom"
              aria-label={language === "zh" ? "查看完整流程图" : "View the full pipeline diagram"} onClick={() => diagramDialog.current?.showModal()}>
              <img src={demoBrandAsset("figfox-method.jpg")} width="2976" height="1280" loading="lazy" alt={content.methodAlt} />
            </button>
            <button type="button" className="demo-diagram-enlarge" data-demo-cursor="zoom" onClick={() => diagramDialog.current?.showModal()}>
              <MagnifyingGlassPlus size={16} />{content.enlarge}
            </button>
          </figure>
          <ol className="demo-method-steps" data-demo-reveal data-demo-delay="2">
            {content.steps.map(([title, description]) => (
              <li key={title}><h3>{title}</h3><p>{description}</p></li>
            ))}
          </ol>
          <p className="demo-evidence-note" data-demo-reveal>{content.evidenceNote}</p>
        </section>

        <MechanismSection language={language} localCasesAvailable onOpenCase={openContentCase} />
        <RefinementSection language={language} onOpenCase={openContentCase} />
        <ResearchSections language={language} localCasesAvailable />

        <section className="demo-closing" data-demo-reveal>
          <div><h2>{content.closingTitle}</h2><p>{content.closingBody}</p></div>
          <div className="demo-closing-actions">
            <a className="demo-secondary" href={hrefFor("/docs")} onClick={(event) => navigate(event, "/docs")}>
              {content.guide}
            </a>
            <a className="demo-primary" href={hrefFor("/workspace")} onClick={(event) => navigate(event, "/workspace")}>
              {content.workspace}<ArrowRight size={17} />
            </a>
          </div>
        </section>
      </main>

      <footer className="demo-container demo-footer">
        <div><a className="demo-brand" href={hrefFor("/")}>
          <img src={demoBrandAsset("figfox-logo.svg")} width="30" height="25" alt="" /><strong>FigFox</strong>
        </a><p>{content.footer}</p></div>
        <nav aria-label={language === "zh" ? "更多信息" : "More information"}>
          <a href="https://github.com/LawrenceRiver/FigFox" target="_blank" rel="noreferrer">GitHub</a>
          <a href={hrefFor("/docs")} onClick={(event) => navigate(event, "/docs")}>{content.guide}</a>
          <a href={hrefFor("/pricing")} onClick={(event) => navigate(event, "/pricing")}>{content.pricing}</a>
          <a href={hrefFor("/privacy")} onClick={(event) => navigate(event, "/privacy")}>{content.privacy}</a>
        </nav>
      </footer>

      <dialog className="demo-diagram-dialog" ref={diagramDialog} aria-label={content.enlarge}
        onClick={(event) => {
          if (event.target === event.currentTarget) diagramDialog.current?.close();
        }}>
        <div className="demo-dialog-toolbar">
          <strong>{content.methodTitle}</strong>
          <button type="button" onClick={() => diagramDialog.current?.close()} aria-label={content.close}>
            <X size={22} />
          </button>
        </div>
        <div className="demo-dialog-image">
          <img src={demoBrandAsset("figfox-method.jpg")} width="2976" height="1280" alt={content.methodAlt} />
        </div>
      </dialog>
    </div>
  );
}
