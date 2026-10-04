import { ArrowLeft, ArrowRight, Globe, List, X } from "@phosphor-icons/react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import type { ProductLanguage, ProductRoute } from "../../ProductPages";

export type ProductNavigation = {
  language: ProductLanguage;
  onNavigate: (route: ProductRoute) => void;
  hrefFor: (route: ProductRoute) => string;
};

export function ProductLink({ route, hrefFor, onNavigate, children, ...props }: {
  route: ProductRoute;
  hrefFor: ProductNavigation["hrefFor"];
  onNavigate: ProductNavigation["onNavigate"];
  children: ReactNode;
} & Omit<React.ComponentProps<"a">, "href" | "onClick">) {
  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(route);
  };
  return <a href={hrefFor(route)} onClick={navigate} {...props}>{children}</a>;
}

export function ProductHeader({ language, route, accountName, onNavigate, hrefFor, onLanguageChange, onAccount }: ProductNavigation & {
  route: ProductRoute;
  accountName: string | null;
  onLanguageChange: () => void;
  onAccount: () => void;
}) {
  const zh = language === "zh";
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [route]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);
  const navigate = (nextRoute: ProductRoute) => { setMenuOpen(false); onNavigate(nextRoute); };
  const links = [["/docs", zh ? "使用指南" : "Guide"], ["/pricing", zh ? "定价" : "Pricing"], ["/workspace", zh ? "工作台" : "Workspace"]] as const;
  return <header className="product-header">
    <div className="product-header-inner">
      <ProductLink route="/" hrefFor={hrefFor} onNavigate={navigate} className="product-brand" aria-label={zh ? "FigFox 首页" : "FigFox home"}>
        <img src={`${import.meta.env.BASE_URL}assets/demo/figfox-logo.svg`} width="43" height="43" alt="" />
        <strong>FigFox</strong>
      </ProductLink>
      <nav className="product-nav" aria-label={zh ? "产品导航" : "Product navigation"}>
        {links.map(([path, title]) => <ProductLink key={path} route={path} hrefFor={hrefFor} onNavigate={navigate} aria-current={route === path ? "page" : undefined}>{title}</ProductLink>)}
      </nav>
      <div className="product-header-actions">
        <button type="button" className="product-language" onClick={onLanguageChange} aria-label={zh ? "Switch to English" : "切换到中文"}><Globe size={18} /><span>{zh ? "EN" : "中文"}</span></button>
        <button type="button" className="product-account" onClick={onAccount}>{accountName || (zh ? "登录" : "Sign in")}</button>
        <button type="button" className="product-menu" aria-label={zh ? "打开菜单" : "Open menu"} aria-expanded={menuOpen} aria-controls="product-mobile-nav" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={22} /> : <List size={22} />}</button>
      </div>
    </div>
    {menuOpen && <nav id="product-mobile-nav" className="product-mobile-nav" aria-label={zh ? "产品导航" : "Product navigation"}>
      {links.map(([path, title]) => <ProductLink key={path} route={path} hrefFor={hrefFor} onNavigate={navigate} aria-current={route === path ? "page" : undefined}>{title}<ArrowRight size={17} /></ProductLink>)}
      <ProductLink route="/" hrefFor={hrefFor} onNavigate={navigate}><span>{zh ? "返回展示页" : "Back to showcase"}</span><ArrowLeft size={17} /></ProductLink>
    </nav>}
  </header>;
}

export function ProductFooter({ language, hrefFor, onNavigate }: ProductNavigation) {
  const zh = language === "zh";
  return <footer className="product-footer product-container">
    <ProductLink route="/" hrefFor={hrefFor} onNavigate={onNavigate} className="product-footer-brand" data-allow-wrap="true"><strong>FigFox</strong><span>{zh ? "科研图像重建与编辑" : "Scientific figures, reconstructed and edited"}</span></ProductLink>
    <nav aria-label={zh ? "页脚" : "Footer"}>
      <ProductLink route="/feedback" hrefFor={hrefFor} onNavigate={onNavigate}>{zh ? "反馈" : "Feedback"}</ProductLink>
      <ProductLink route="/privacy" hrefFor={hrefFor} onNavigate={onNavigate}>{zh ? "隐私" : "Privacy"}</ProductLink>
      <ProductLink route="/terms" hrefFor={hrefFor} onNavigate={onNavigate}>{zh ? "条款" : "Terms"}</ProductLink>
      <ProductLink route="/" hrefFor={hrefFor} onNavigate={onNavigate}>{zh ? "展示页" : "Showcase"}<ArrowRight size={14} /></ProductLink>
    </nav>
  </footer>;
}
