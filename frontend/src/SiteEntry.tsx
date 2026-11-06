import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { FigFoxCursor } from './components/ui/FigFoxCursor';
import { FigFoxDemoPage } from './features/demo/FigFoxDemoPage';
import type { DemoLanguage } from './features/demo/cases';
import type { ProductRoute } from './ProductPages';

const ProductApp = lazy(() => import('./App'));
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const cloudApp = import.meta.env.MODE === 'github-pages' ? import.meta.env.VITE_CLOUD_APP_URL?.replace(/\/$/, '') : undefined;
const productRoutes = new Set(['/examples', '/workspace', '/login', '/editor', '/pricing', '/docs', '/feedback', '/privacy', '/terms', '/content-policy']);
const cloudHref = (path: string) => cloudApp?.startsWith('https://') && productRoutes.has(path) ? `${cloudApp}${path}` : null;
const isShowcaseEntry = () => {
  const query = new URLSearchParams(location.search);
  // Auth callbacks keep the existing application's return/error handling.
  return location.pathname.replace(/\/$/, '') === base && !query.has('auth') && !query.has('auth_error');
};
const hrefFor = (path: ProductRoute) => cloudHref(path) || (path === '/' ? import.meta.env.BASE_URL : base + path);

// Load the workspace, account UI and editor styles only when entering the product.
// Once mounted, the existing application keeps ownership of routing and state.
export default function SiteEntry() {
  const entryPath = location.pathname.startsWith(`${base}/`) ? location.pathname.slice(base.length).replace(/\/$/, '') : '';
  const remoteEntry = cloudHref(entryPath);
  const [product, setProduct] = useState(() => !isShowcaseEntry());
  const [language, setLanguage] = useState<DemoLanguage>(() => localStorage.getItem('autodraftman-language') === 'en' ? 'en' : 'zh');
  const site = useRef<HTMLDivElement>(null);
  useEffect(() => { if (remoteEntry) location.replace(remoteEntry); }, [remoteEntry]);
  useEffect(() => {
    const onPopState = () => { if (!isShowcaseEntry()) setProduct(true); };
    addEventListener('popstate', onPopState);
    return () => removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    if (product) return;
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.dataset.language = language;
    localStorage.setItem('autodraftman-language', language);
  }, [language, product]);
  function navigate(path: ProductRoute) {
    const remote = cloudHref(path);
    if (remote) { location.assign(remote); return; }
    if (path === '/') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    history.pushState({}, '', hrefFor(path));
    window.scrollTo(0, 0);
    setProduct(true);
  }
  if (remoteEntry) return <div className="research-loading" role="status">{language === 'zh' ? '正在进入 FigFox…' : 'Opening FigFox…'}</div>;
  if (product) return <Suspense fallback={<div className="research-loading" role="status">{language === 'zh' ? '正在加载…' : 'Loading…'}</div>}><ProductApp /></Suspense>;
  return <div className="figfox-site" ref={site} lang={language === 'zh' ? 'zh-CN' : 'en'}>
    <FigFoxCursor site={site} route="/" />
    <a className="skip-link" href="#main-content">{language === 'zh' ? '跳到主要内容' : 'Skip to main content'}</a>
    <div id="main-content"><FigFoxDemoPage language={language} onLanguageChange={() => setLanguage(value => value === 'zh' ? 'en' : 'zh')} onNavigate={navigate} hrefFor={hrefFor} /></div>
  </div>;
}
