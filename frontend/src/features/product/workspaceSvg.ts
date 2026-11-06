import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchReconstructionArtifact } from '../../api';
import { importSvgDocument, restoreSvgDocument, SvgImportError, type ImportedSvgDocument } from '../../svgDocument';
import { demoAsset } from '../demo/cases';
import { activateEditorDocument, readEditorDocument, readEditorDocuments, saveEditorDocument, type StoredEditorDocument } from './editorStorage';
import type { ReconstructionSnapshot } from './reconstructionTask';
import { hasFilePicker, isFileCancel, pickSvgFile, type EditorFileHandle } from './editorFiles';

export const blankSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><title>Untitled canvas</title></svg>';
export async function importResearchExample() {
  const response = await fetch(demoAsset('study', 'result.svg'));
  if (!response.ok) throw new Error('Example unavailable');
  return importSvgDocument(new File([await response.text()], 'FigFox-example.svg', { type: 'image/svg+xml' }));
}
export function saveNewSvg(imported: ImportedSvgDocument, fileHandle?: EditorFileHandle) {
  return saveEditorDocument({ id: crypto.randomUUID(), fileName: imported.fileName, markup: imported.markup, updatedAt: new Date().toISOString(), ...(fileHandle ? { fileHandle } : {}) });
}

export function useWorkspaceSvg({ active, zh, saveTask, enterEditor }: { active: boolean; zh: boolean; saveTask: () => boolean; enterEditor: () => void }) {
  const [document, setDocument] = useState<StoredEditorDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const awaitingInput = useRef(false);
  const operation = useRef(0);
  const sequence = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const saveTaskRef = useRef(saveTask);
  saveTaskRef.current = saveTask;
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const saved = await readEditorDocument();
      if (saved) restoreSvgDocument(saved.markup, saved.fileName);
      if (current === sequence.current) setDocument(saved);
    } catch { if (current === sequence.current) setDocument(null); }
  }, []);
  useEffect(() => { if (active) void refresh(); else { sequence.current++; operation.current++; lock.current = false; awaitingInput.current = false; setBusy(false); setError(''); } }, [active, refresh]);
  useEffect(() => () => { sequence.current++; operation.current++; }, []);
  useEffect(() => {
    const element = input.current;
    const cancel = () => { if (awaitingInput.current) finish(); };
    element?.addEventListener('cancel', cancel);
    return () => element?.removeEventListener('cancel', cancel);
  }, [active]);
  const start = () => { if (lock.current) return false; lock.current = true; setBusy(true); setError(''); return true; };
  const finish = () => { lock.current = false; awaitingInput.current = false; setBusy(false); };
  const report = (failure: unknown) => {
    if (isFileCancel(failure)) return;
    setError(failure instanceof SvgImportError ? zh ? '无法打开这个 SVG。请检查文件格式和内容复杂度。' : 'Could not open this SVG. Check its format and content complexity.' : failure instanceof Error && failure.message === 'task-save' ? zh ? '当前任务未能保存。请重试后再进入编辑器。' : 'The current task could not be saved. Retry before opening the editor.' : zh ? 'SVG 操作未完成，请重试。原有文档已保留。' : 'The SVG operation could not complete. Retry; your existing documents are retained.');
  };
  const commit = async (token: number, imported: ImportedSvgDocument, handle?: EditorFileHandle) => {
    if (token !== operation.current) return;
    if (!saveTaskRef.current()) throw new Error('task-save');
    await saveNewSvg(imported, handle);
    if (token === operation.current) enterEditor();
  };
  const run = async (action: (token: number) => Promise<void>) => {
    if (!start()) return;
    const token = ++operation.current;
    try { await action(token); } catch (failure) { if (token === operation.current) report(failure); } finally { if (token === operation.current) finish(); }
  };
  const create = () => run(async token => commit(token, await importSvgDocument(new File([blankSvg], zh ? '未命名画布.svg' : 'Untitled canvas.svg', { type: 'image/svg+xml' }))));
  const example = () => run(async token => commit(token, await importResearchExample()));
  const openDocument = (id: string) => run(async token => {
    if (!saveTaskRef.current()) throw new Error('task-save');
    try { await activateEditorDocument(id); } catch (failure) { await refresh(); throw failure; }
    if (token === operation.current) enterEditor();
  });
  const choose = () => {
    if (!start()) return;
    const token = ++operation.current;
    if (!hasFilePicker()) { awaitingInput.current = true; input.current?.click(); return; }
    // Invoke the picker synchronously, before the first await.
    try {
      const selection = pickSvgFile();
      void selection.then(async handles => { const handle = handles[0]; if (handle) await commit(token, await importSvgDocument(await handle.getFile()), handle); }).catch(failure => { if (token === operation.current) report(failure); }).finally(() => { if (token === operation.current) finish(); });
    } catch (failure) { report(failure); finish(); }
  };
  const openReconstruction = (job: ReconstructionSnapshot) => run(async token => {
    if (job.status !== 'succeeded' || !job.result) return;
    if (!saveTaskRef.current()) throw new Error('task-save');
    // Reopening a result must preserve edits already saved in this browser.
    if (!(await readEditorDocuments()).some(document => document.id === job.id)) {
      const response = await fetchReconstructionArtifact(job.result.svg, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error('result-unavailable');
      const imported = await importSvgDocument(new File([await response.text()], `${(job.name || 'FigFox').replace(/\.[^.]+$/, '')}-figfox.svg`, { type: 'image/svg+xml' }));
      if (token !== operation.current) return;
      await saveEditorDocument({ id: job.id, fileName: imported.fileName, markup: imported.markup, updatedAt: new Date().toISOString() });
    }
    if (token !== operation.current) return;
    await activateEditorDocument(job.id);
    if (token === operation.current) enterEditor();
  });
  const importFile = async (file?: File) => {
    if (lock.current && !awaitingInput.current) return;
    if (!lock.current) { if (!start()) return; operation.current++; }
    awaitingInput.current = false;
    const token = operation.current;
    try { if (file) await commit(token, await importSvgDocument(file)); } catch (failure) { if (token === operation.current) report(failure); } finally { if (token === operation.current) finish(); }
  };
  return { document, busy, error, input, refresh, create, example, openDocument, openReconstruction, choose, importFile };
}
