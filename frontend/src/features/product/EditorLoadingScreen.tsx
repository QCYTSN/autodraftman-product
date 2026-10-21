import { ArrowLeft } from "@phosphor-icons/react";
import { ProductLink, type ProductNavigation } from "./ProductHeader";
import "./editor-loading.css";

export type EditorLoadPhase = "opening" | "document" | "canvas" | "ready" | "failed";

export function EditorLoadingScreen({ language, phase, leaving = false, hrefFor, onNavigate }: ProductNavigation & { phase: EditorLoadPhase; leaving?: boolean }) {
  const zh = language === "zh";
  const failed = phase === "failed";
  const detail = phase === "document" ? zh ? "正在读取本地文档" : "Reading your local document"
    : phase === "canvas" ? zh ? "正在准备画布" : "Preparing the canvas"
    : phase === "ready" ? zh ? "即将进入编辑器" : "Ready to enter the editor"
    : failed ? zh ? "请重新加载页面，或返回工作台。" : "Reload the page, or return to the workspace."
    : zh ? "正在准备编辑界面" : "Preparing the editing tools";
  return <section className="product-editor-loading-screen" data-leaving={leaving || undefined} data-failed={failed || undefined} aria-label={zh ? "打开 SVG 编辑器" : "Opening the SVG editor"}>
    <header className="product-editor-loader-header">
      <ProductLink route="/" hrefFor={hrefFor} onNavigate={onNavigate} className="product-brand" aria-label={zh ? "FigFox 首页" : "FigFox home"}><img src={`${import.meta.env.BASE_URL}assets/demo/figfox-logo.svg`} width="36" height="36" alt="" /><strong>FigFox</strong></ProductLink>
      <ProductLink route="/workspace" hrefFor={hrefFor} onNavigate={onNavigate} className="product-editor-loader-back"><ArrowLeft size={16} />{zh ? "返回工作台" : "Back to workspace"}</ProductLink>
    </header>
    <div className="product-editor-loader-content">
      <svg className="product-editor-loader-art" viewBox="0 0 196 136" fill="none" aria-hidden="true">
        <rect x="16" y="12" width="164" height="112" rx="12" fill="white" stroke="#e7e0f1" />
        <path d="M17 40H179" stroke="#f0ebf6" /><g fill="#d9cbea"><circle cx="29" cy="26" r="2" /><circle cx="37" cy="26" r="2" /><circle cx="45" cy="26" r="2" /></g>
        <path d="M40 93L70 56M122 74L150 51" stroke="#c5b4e1" strokeDasharray="3 4" strokeLinecap="round" />
        <path className="product-editor-loader-path" pathLength="1" d="M40 93C70 56 95 115 122 74S150 51 161 62" stroke="#7854c4" strokeWidth="2.5" strokeLinecap="round" />
        <g className="product-editor-loader-bounds" stroke="#b99be6"><rect x="112" y="64" width="20" height="20" rx="2" /><rect x="110" y="62" width="4" height="4" rx="1" fill="white" /><rect x="130" y="82" width="4" height="4" rx="1" fill="white" /></g>
        <g fill="white" stroke="#926bce" strokeWidth="1.5"><circle cx="40" cy="93" r="3" /><circle cx="122" cy="74" r="3" /><circle cx="161" cy="62" r="3" /></g>
      </svg>
      <div className="product-editor-loader-copy" role={failed ? "alert" : "status"} aria-live={failed ? "assertive" : "polite"}><h1>{failed ? zh ? "暂时无法打开 SVG 编辑器" : "Could not open the SVG editor" : zh ? "正在打开 SVG 编辑器" : "Opening the SVG editor"}</h1><p>{detail}{!failed && <span className="product-editor-loader-dots" aria-hidden="true"><i /><i /><i /></span>}</p></div>
      {failed && <button type="button" className="product-button product-button-secondary" onClick={() => window.location.reload()}>{zh ? "重新加载" : "Reload page"}</button>}
    </div>
    <p className="product-editor-loader-note">{zh ? "本地编辑 · 文件保存在当前浏览器" : "Local editing · Files stay in this browser"}</p>
  </section>;
}
