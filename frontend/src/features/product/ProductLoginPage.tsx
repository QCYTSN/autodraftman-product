import { ArrowLeft, ArrowRight, BezierCurve, GithubLogo, Globe, GoogleLogo, TextT, VectorThree, WechatLogo } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { apiConfigured, type AuthProvider } from "../../api";
import { ProductLink, type ProductNavigation } from "./ProductHeader";
import { FigureProcessGraphic } from "./FigureProcess";
import "./login.css";

export function ProductLoginPage({ language, providers, busy, error, onSelect, onBack, onLanguageChange, hrefFor, onNavigate }: ProductNavigation & {
  providers: AuthProvider[];
  busy: boolean;
  error: string;
  onSelect: (choice: AuthProvider["id"] | "guest") => void;
  onBack: () => void;
  onLanguageChange: () => void;
}) {
  const zh = language === "zh";
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const previous = document.title;
    document.title = zh ? "登录 · FigFox" : "Sign in · FigFox";
    return () => { document.title = previous; };
  }, [zh]);

  return <main className="product-login-page">
    <header className="product-login-header">
      <ProductLink route="/" onNavigate={onNavigate} hrefFor={hrefFor} className="product-brand" aria-label={zh ? "FigFox 首页" : "FigFox home"}><img src={`${import.meta.env.BASE_URL}assets/demo/figfox-logo.svg`} width="43" height="43" alt="" /><strong>FigFox</strong></ProductLink>
      <div><button type="button" onClick={onBack} disabled={busy} className="product-login-back"><ArrowLeft size={16} />{zh ? "返回" : "Back"}</button><button type="button" onClick={onLanguageChange} className="product-language" aria-label={zh ? "Switch to English" : "切换到中文"}><Globe size={17} /><span>{zh ? "EN" : "中文"}</span></button></div>
    </header>
    <section className="product-login-visual" aria-label={zh ? "FigFox 科研图像重建与编辑" : "Scientific figure reconstruction and editing"}>
      <div className="product-login-visual-content">
        <p className="product-login-eyebrow">FIGURE RECONSTRUCTION & EDITING</p>
        <h2>{zh ? <>从图像，<br />到可编辑的 <span>SVG。</span></> : <>From image<br />to editable <span>SVG.</span></>}</h2>
        <p className="product-login-visual-description">{zh ? "重建图中的文字、图形与关系，在 FigFox 中继续编辑。" : "Reconstruct text, shapes and relationships, then keep editing in FigFox."}</p>
        <FigureProcessGraphic stage={3} staticArt className="product-login-artwork" />
        <div className="product-login-features"><span><TextT size={17} />{zh ? "文字" : "Text"}</span><span><VectorThree size={17} />{zh ? "图形" : "Shapes"}</span><span><BezierCurve size={17} />{zh ? "连接关系" : "Connections"}</span></div>
      </div>
      <p className="product-login-visual-footnote">{zh ? "科研图像重建与编辑" : "Scientific figures, reconstructed and edited"}</p>
    </section>
    <section className="product-login-form-area">
      <div className="product-login-form">
        <h1 ref={title} tabIndex={-1}>{zh ? "登录 FigFox" : "Sign in to FigFox"}</h1>
        <p className="product-login-description">{zh ? "选择一种登录方式，继续你的工作。" : "Choose a sign-in method to continue your work."}</p>
        <div className="product-login-providers">
          {providers.map(provider => {
            const available = apiConfigured && provider.enabled && provider.id !== "wechat";
            const Icon = provider.id === "google" ? GoogleLogo : provider.id === "github" ? GithubLogo : WechatLogo;
            const providerName = provider.id === "wechat" ? zh ? "微信" : "WeChat" : provider.name;
            return <button type="button" className="oauth-button" key={provider.id} disabled={!available || busy} onClick={() => onSelect(provider.id)}><Icon size={21} weight={provider.id === "wechat" ? "fill" : "regular"} /><span>{zh ? `使用 ${providerName} 登录` : `Continue with ${providerName}`}</span>{!available && <small>{zh ? "待开放" : "Not open yet"}</small>}</button>;
          })}
        </div>
        {!apiConfigured && <p className="product-login-availability">{zh ? "登录服务尚未开放，可以先使用本地工作台。" : "Sign-in is not open yet. You can use the local workspace."}</p>}
        {error && <p className="product-login-error" role="alert">{error}</p>}
        <button type="button" className="product-login-continue" onClick={() => onSelect("guest")} disabled={busy}>{busy ? zh ? "正在连接…" : "Connecting…" : zh ? "继续使用工作台" : "Continue to workspace"}<ArrowRight size={18} /></button>
        <p className="product-login-local-note">{zh ? "本地 SVG 编辑无需登录，文件保存在当前浏览器。" : "Local SVG editing needs no sign-in. Files stay in this browser."}</p>
        <p className="product-login-legal">{zh ? "继续使用即表示你同意" : "By continuing, you agree to the"} <ProductLink route="/terms" hrefFor={hrefFor} onNavigate={onNavigate}>{zh ? "服务条款" : "Terms of Service"}</ProductLink> {zh ? "与" : "and"} <ProductLink route="/privacy" hrefFor={hrefFor} onNavigate={onNavigate}>{zh ? "隐私政策" : "Privacy Policy"}</ProductLink>{zh ? "。" : "."}</p>
      </div>
    </section>
  </main>;
}
