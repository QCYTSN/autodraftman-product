import { messages } from './copy';
import { useEffect, useState } from 'react';
import PresentationShell from './PresentationShell';
import { presentationCase, media } from './data/prepared-case';
import { cleanSvg } from './svg';
import type { Language } from './types';
import './presentation.css';
export default function FigFoxPresentationPage({ offline = false }: { offline?: boolean }) {
  const [loaded, setLoaded] = useState(0), [ready, setReady] = useState<Record<string, string> | null>(null);
  const [started, setStarted] = useState(offline), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const [language] = useState<Language>(() => {
    if (new URLSearchParams(location.search).get('lang') === 'en') return 'en';
    if (offline) return 'zh';
    try { return localStorage.getItem('autodraftman-language') === 'en' ? 'en' : 'zh'; } catch { return 'zh'; }
  });
  const total = Object.keys(media).length;
  useEffect(() => {
    let cancelled = false;
    setLoaded(0); setError(false);
    const prepared: Record<string, string> = {};
    Promise.all(Object.entries(media).map(async ([name, value]) => {
      if (name.endsWith('.svg')) {
        prepared[name] = cleanSvg(value);
        const image = new Image(); image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(prepared[name]); await image.decode();
      } else { const image = new Image(); image.src = value; await image.decode(); prepared[name] = value; }
      if (!cancelled) setLoaded(count => count + 1);
    })).then(() => { if (!cancelled) setReady(prepared); }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [retry]);
  if (!ready || !started) return <div className="ffp-host ffp-loading">
    <img src={media.logo} alt="FigFox" />
    <h1>{error ? (messages.unableToPrepareAssets[language]) : (messages.preparingWalkthroughAssets[language])}</h1>
    <p role="status">{loaded} / {total} {messages.assetsReady[language]}</p>
    {error ? <button onClick={() => setRetry(n => n + 1)}>{messages.retry[language]}</button>
      : <button className="ffp-primary" disabled={!ready} onClick={() => setStarted(true)}>{messages.beginWalkthrough[language]}</button>}
  </div>;
  return <PresentationShell data={presentationCase} media={ready} offline={offline} language={language} />;
}
