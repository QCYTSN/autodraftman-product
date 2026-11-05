import { useLayoutEffect, useState } from 'react';

export type WorkspaceView = 'task' | 'documents';
const viewKey = 'figfox-workspace-view';
export function savedWorkspaceView(): WorkspaceView {
  try { return sessionStorage.getItem(viewKey) === 'documents' ? 'documents' : 'task'; }
  catch { return 'task'; }
}
export function readWorkspaceView(): WorkspaceView {
  const view = new URL(location.href).searchParams.get('view');
  return view === 'task' || view === 'documents' ? view : view === null ? savedWorkspaceView() : 'task';
}
export function rememberEditorOrigin(fromWorkspace: boolean) {
  return { workspaceOrigin: fromWorkspace ? readWorkspaceView() : 'documents' };
}
export function workspaceReturnHref(path: string, fromEditor: boolean) {
  let view = savedWorkspaceView();
  if (fromEditor) {
    view = history.state?.workspaceOrigin === 'task' ? 'task' : 'documents';
  }
  return `${path}?view=${view}`;
}
export function useWorkspaceView(active: boolean, transition: (update: () => void, animate: boolean) => void) {
  const [view, setView] = useState<WorkspaceView>(readWorkspaceView);
  const persist = (next: WorkspaceView, push = false) => {
    const url = new URL(location.href);
    const previous = url.searchParams.get('view');
    url.searchParams.set('view', next);
    if (push && previous !== next) history.pushState({}, '', url);
    else if (previous !== next) history.replaceState(history.state, '', url);
    try { sessionStorage.setItem(viewKey, next); } catch { /* Navigation still works without storage. */ }
    setView(next);
  };
  useLayoutEffect(() => {
    if (!active) return;
    persist(readWorkspaceView());
    const restore = () => {
      if (!location.pathname.replace(/\/$/, '').endsWith('/workspace')) return;
      const next = readWorkspaceView();
      transition(() => persist(next), true);
    };
    addEventListener('popstate', restore);
    return () => removeEventListener('popstate', restore);
  }, [active]);
  return { view, selectView: (next: WorkspaceView, animate = true) => animate ? transition(() => persist(next, true), true) : persist(next, true) };
}
