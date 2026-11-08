import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";

// Choose the independent walkthrough before importing product providers, CSS or fonts.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const presentation = location.pathname.replace(/\/$/, '') === base + '/presentation';
const Entry = presentation
  ? lazy(() => import('./features/presentation/FigFoxPresentationPage'))
  : lazy(() => import('./ProductSiteRoot'));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<div role="status">FigFox…</div>}><Entry /></Suspense>
  </React.StrictMode>,
);
