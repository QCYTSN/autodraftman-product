import {
  ArrowCounterClockwise, ArrowDown, ArrowRight, GithubLogo, Globe, MagnifyingGlassPlus, X,
} from "@phosphor-icons/react";
import { useRef, useState, lazy, Suspense, type MouseEvent } from "react";
import type { ProductRoute } from "../../ProductPages";
import { DemoCanvas } from "./DemoCanvas";
import { MechanismSection } from "./MechanismSection";
import { RefinementSection } from "./RefinementSection";
import { ResearchProvider, ResearchOverview } from "./research/ResearchContext";
import Pipeline from "./research/Pipeline";
const Results = lazy(() => import("./research/Results"));
import { HeroSvgWord } from "./HeroSvgWord";
import { demoThumbnail, demoBrandAsset, demoCases, allDemoCases, type DemoLanguage } from "./cases";
import { useDemoMotion } from "./useDemoMotion";
import "./demo.css";
import "./showcase-fonts.css";

type Props = {
  language: DemoLanguage;
  onLanguageChange: () => void;
  onNavigate: (path: ProductRoute) => void;
  hrefFor: (path: ProductRoute) => string;
};

const words = {
  zh: {
    cases: "案例", method: "方法", scope: "消融", results: "实验结果", evaluation: "效率", source: "代码", try: "开始使用",
    titleFirst: "将科研图像", titlePrefix: "重建为", titleAccent: "可编辑",
    intro: "重建科研图中的文字、图形与连接关系。",
    introDetail: "对照原图检查差异，修正文字、布局与连接。",
    replay: "重播", replayLabel: "重播关系重建与局部修复示意",
    explore: "查看案例", scroll: "向下探索",
    examplesTitle: "亲手编辑重建结果",
    examplesBody: "拖动元素、双击改字，切换原图对照查看重建细节。",
    methodTitle: "FigFox 如何重建一张图",
    methodBody: "构建初稿 → 定位差异 → 修复 SVG",
    steps: [
      ["关系引导重建", "识别图形与相对布局，构建 SVG 初稿。"],
      ["错误检测与计划", "结合原图与局部对照，定位需要修复的问题。"],
      ["执行与迭代修复", "执行修复程序，根据结果回执继续检查。"],
    ],
    enlarge: "放大流程图", close: "关闭流程图",
    methodAlt: "FigFox 核心流程：关系引导 SVG 重建、错误检测与计划、执行与迭代修复。",
    closingTitle: "从图像，回到可编辑的结构",
    closingBody: "在自己的科研图上，开始重建与编辑。",
    workspace: "开始使用", guide: "使用指南", pricing: "定价", privacy: "隐私",
    footer: "科研图像的重建与编辑",
  },
  en: {
    cases: "Examples", method: "Method", scope: "Ablation", results: "Results", evaluation: "Efficiency", source: "Code", try: "Try FigFox",
    titleFirst: "Reconstruct scientific figures", titlePrefix: "as ", titleAccent: "editable",
    intro: "Reconstruct text, shapes and connections in scientific figures.",
    introDetail: "Inspect differences against the source, then repair text, layout and connections.",
    replay: "Replay", replayLabel: "Replay the relation-guided reconstruction and local refinement illustration",
    explore: "Explore examples", scroll: "Scroll to explore",
    examplesTitle: "Edit a reconstruction yourself",
    examplesBody: "Drag elements, edit a label, or compare the reconstruction with its source.",
    methodTitle: "How FigFox reconstructs a figure",
    methodBody: "Build a draft → Locate differences → Repair the SVG",
    steps: [
      ["Relation-guided reconstruction", "Identify elements and relative layout to compose a draft SVG."],
      ["Error detection and planning", "Inspect the original and local comparisons to plan corrections."],
      ["Execution and refinement", "Execute repairs and review the resulting receipts."],
    ],
    enlarge: "Enlarge the diagram", close: "Close diagram",
    methodAlt: "FigFox pipeline: relation-guided SVG reconstruction, error detection and planning, execution and refinement.",
    closingTitle: "From pixels, back to editable structure",
    closingBody: "Start reconstructing and editing your own scientific figures.",
    workspace: "Get started", guide: "Guide", pricing: "Pricing", privacy: "Privacy",
    footer: "Scientific figure reconstruction and editing",
  },
} as const;

export function FigFoxDemoPage(props: Props) { return <ResearchProvider language={props.language}><DemoPageContent {...props} /></ResearchProvider>; }

function DemoPageContent({ language, onLanguageChange, onNavigate, hrefFor }: Props) {
  const content = words[language];
  const [active, setActive] = useState("study");
  const [methodStage, setMethodStage] = useState(0);
  const [returnPosition, setReturnPosition] = useState<number | null>(null);
  const [heroRevision, setHeroRevision] = useState(0);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const [focusRevision, setFocusRevision] = useState(0);
  const diagramDialog = useRef<HTMLDialogElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const item = allDemoCases.find(example => example.id === active)!;

  useDemoMotion(page);

  function navigate(event: MouseEvent<HTMLAnchorElement>, destination: ProductRoute) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(destination);
  }

  function chooseCase(id: string) {
    setActive(id);
    setFocusedElement(null);
  }

  function openContentCase(caseId: string, elementId: string) {
    setReturnPosition(window.scrollY);
    if (!allDemoCases.some(example => example.id === caseId)) return;
    chooseCase(caseId);
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
            <a href="#demo-benchmarks">{content.results}</a>
            <a href="#demo-ablations">{content.scope}</a>
            <a href="#demo-efficiency">{content.evaluation}</a>
            <a href="#research-provenance">{content.source}</a>
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

        <ResearchOverview />
        <section className="demo-examples demo-section" id="demo-examples" aria-labelledby="demo-examples-title">
            <div className="demo-section-heading" data-demo-reveal>
              <h2 id="demo-examples-title">{content.examplesTitle}</h2>
              <p>{content.examplesBody}</p>
            </div>
            <div className="demo-canvas-reveal" data-demo-reveal data-demo-delay="1">
              {returnPosition !== null && <button className="demo-return-link" onClick={() => { window.scrollTo({top:returnPosition,behavior:"instant"}); setReturnPosition(null); }}>{language === "zh" ? "返回刚才的说明 ↑" : "Return to the explanation ↑"}</button>}
              <DemoCanvas key={item.id} item={item} language={language} focusedElementId={focusedElement} focusRevision={focusRevision} />
            </div>
            <div data-demo-reveal data-demo-delay="2">
              <div className="demo-case-picker" role="group" aria-label={content.cases}>
                {demoCases.map((example) => (
                  <button type="button" key={example.id} aria-pressed={active === example.id} data-allow-wrap="true"
                    onClick={() => chooseCase(example.id)}>
                    <img src={demoThumbnail(example.id)} alt="" width={example.width} height={example.height} loading="lazy" decoding="async"
                      onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                    <span><strong>{example.name[language]}</strong><small>{example.category[language]}</small></span>
                  </button>
                ))}
              </div>
            </div>
        </section>

        <section className="demo-method demo-section" id="demo-method" aria-labelledby="demo-method-title">
          <div className="demo-section-heading" data-demo-reveal>
            <h2 id="demo-method-title">{content.methodTitle} <a className="demo-presentation-link" href={import.meta.env.BASE_URL + 'presentation'} target="_blank" rel="noopener noreferrer">{language === 'zh' ? '打开交互演示 ↗' : 'Open interactive walkthrough ↗'}</a></h2>
            <p>{content.methodBody}</p>
          </div>
          <figure className="demo-method-figure" data-demo-reveal data-demo-delay="1">
            <button type="button" className="demo-method-preview" data-demo-cursor="zoom"
              aria-label={language === "zh" ? "查看完整流程图" : "View the full pipeline diagram"} onClick={() => diagramDialog.current?.showModal()}>
              <img src={demoBrandAsset("framework-v80.svg")} width="1208" height="669" loading="lazy" decoding="async" alt={content.methodAlt} />
            </button>
            <button type="button" className="demo-diagram-enlarge" data-demo-cursor="zoom" onClick={() => diagramDialog.current?.showModal()}>
              <MagnifyingGlassPlus size={16} />{content.enlarge}
            </button>
          </figure>
          <Pipeline stage={methodStage} onStage={setMethodStage} />
          <nav className="demo-method-index" data-demo-reveal="fade"><a href="#demo-content">{language === "zh" ? "重建机制" : "Reconstruction mechanisms"} ↓</a><a href="#demo-results">{language === "zh" ? "局部修复对照" : "Local repair comparisons"} ↓</a></nav>
        </section>

        <MechanismSection language={language} localCasesAvailable onOpenCase={openContentCase} />
        <RefinementSection language={language} onOpenCase={openContentCase} />
        <Suspense fallback={<div className="research-loading">{language === "zh" ? "正在加载研究结果…" : "Loading results…"}</div>}><Results /></Suspense>

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
          <img src={demoBrandAsset("framework-v80.svg")} width="1208" height="669" loading="lazy" decoding="async" alt={content.methodAlt} />
        </div>
      </dialog>
    </div>
  );
}
