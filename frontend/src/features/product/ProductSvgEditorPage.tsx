import { ArrowLeft, ArrowRight, BezierCurve, Check, DownloadSimple, FileSvg, Globe, Plus, UploadSimple, WarningCircle, X } from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { UiCopy } from "../../App";
import { FigFoxEditorChrome } from "../../components/editor/FigFoxEditorChrome";
import { SvgEditHost, type SvgEditHandle, type SvgEditState } from "../../components/editor/SvgEditHost";
import { importSvgDocument, restoreSvgDocument, sanitizeSvgMarkup, SvgImportError, type ImportedSvgDocument, type SvgImportErrorCode } from "../../svgDocument";
import { ProductLink, type ProductNavigation } from "./ProductHeader";
import { readEditorDocument, saveEditorDocument, type LocalEditorDocument } from "./editorStorage";

const emptyEditorState: SvgEditState = { mode: "select", hasSelection: false, canUndo: false, canRedo: false, zoom: 100, fill: "#ffffff", stroke: "#1e2437", strokeWidth: 1, opacity: 100, selectionCount: 0, selection: null, layers: [], gridVisible: false, wireframe: false };
const blankSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><title>Untitled figure</title></svg>';

function EditorEmptyState({ zh, busy, onOpen, onBlank, onDrop }: { zh: boolean; busy: boolean; onOpen: () => void; onBlank: () => void; onDrop: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const drag = (event: DragEvent) => { event.preventDefault(); if (event.dataTransfer.types.includes("Files")) setDragging(true); };
  return <section className="product-editor-empty" data-dragging={dragging || undefined} onDragOver={drag} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) onDrop(file); }} aria-label={zh ? "打开 SVG 文档" : "Open an SVG document"}>
    <div className="product-editor-empty-copy"><span className="product-editor-empty-icon"><FileSvg size={28} /></span><h1>{zh ? "编辑你的 SVG" : "Edit your SVG"}</h1><p>{zh ? "打开已有文档，或从一张空白画布开始。" : "Open a document, or begin with a blank canvas."}</p>
      <div className="product-editor-empty-actions"><button className="product-button product-button-primary" disabled={busy} type="button" onClick={onOpen}><UploadSimple size={18} />{zh ? "打开 SVG" : "Open SVG"}</button><button className="product-button product-button-secondary" disabled={busy} type="button" onClick={onBlank}><Plus size={18} />{zh ? "新建空白画布" : "New blank canvas"}</button></div>
      <span>{dragging ? zh ? "松开以打开文档" : "Drop to open" : zh ? "也可拖放文件到这里 · 最大 5 MB" : "Or drop a file here · up to 5 MB"}</span>
      <p className="product-editor-local-note">{zh ? "文档在当前浏览器处理和保存，无需登录。" : "Documents are edited and saved in this browser. No sign-in needed."}</p>
    </div>
    <div className="product-editor-example" aria-hidden="true"><div className="product-editor-example-bar"><i /><i /><i /><span>figure.svg</span></div><svg viewBox="0 0 400 230"><path d="M77 146C145 28 176 222 246 93S306 44 330 81" stroke="#7473c2" strokeWidth="3" fill="none" /><path d="M77 146L149 29M246 93L176 222" stroke="#b8b4cf" strokeWidth="1" strokeDasharray="4 5" /><g fill="white" stroke="#6243ce" strokeWidth="2"><circle cx="77" cy="146" r="5"/><circle cx="246" cy="93" r="5"/><circle cx="330" cy="81" r="5"/></g><rect x="233" y="80" width="26" height="26" stroke="#8a6bdb" fill="none" strokeWidth="1" /><text x="30" y="197" fill="#818698" fontSize="11" fontFamily="Google Sans Flex,sans-serif">SVG · 1280 × 720</text></svg><span>{zh ? "文字、形状与路径，可分别编辑" : "Text, shapes and paths. Each editable."}</span></div>
  </section>;
}

export function ProductSvgEditorPage({ language, ui, onLanguageChange, hrefFor, onNavigate }: ProductNavigation & { ui: UiCopy; onLanguageChange: () => void }) {
  const zh = language === "zh";
  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<SvgEditHandle>(null);
  const [document, setDocument] = useState<ImportedSvgDocument | null>(null);
  const [markup, setMarkup] = useState("");
  const [importError, setImportError] = useState<SvgImportErrorCode | null>(null);
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed">("saved");
  const [restored, setRestored] = useState(false);
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [state, setState] = useState<SvgEditState>(emptyEditorState);
  const latestSnapshot = useRef<LocalEditorDocument | null>(null);
  const saveSequence = useRef(0);
  const importSequence = useRef(0);

  useEffect(() => {
    let cancelled = false;
    readEditorDocument().then(async saved => {
      if (!saved || cancelled) return;
      const imported = restoreSvgDocument(saved.markup, saved.fileName);
      if (cancelled) return;
      setDocument(imported); setMarkup(imported.markup); setRestored(true);
    }).catch(() => { if (!cancelled) setSaveState("failed"); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);

  latestSnapshot.current = document && markup ? { fileName: document.fileName, markup, updatedAt: new Date().toISOString() } : null;
  useEffect(() => {
    const snapshot = latestSnapshot.current;
    if (!snapshot) return;
    const sequence = ++saveSequence.current;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      saveEditorDocument(snapshot).then(() => { if (sequence === saveSequence.current) setSaveState("saved"); }).catch(() => { if (sequence === saveSequence.current) setSaveState("failed"); });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [document, markup]);
  useEffect(() => {
    const flush = () => { if (latestSnapshot.current) void saveEditorDocument(latestSnapshot.current).catch(() => undefined); };
    window.addEventListener("pagehide", flush);
    return () => { saveSequence.current++; window.removeEventListener("pagehide", flush); flush(); };
  }, []);

  async function openFile(file: File) {
    const sequence = ++importSequence.current;
    setBusy(true); setImportError(null);
    try {
      const imported = await importSvgDocument(file);
      if (sequence !== importSequence.current) return;
      setDocument(imported); setMarkup(imported.markup); setReady(false); setRestored(false);
    } catch (error) {
      if (sequence === importSequence.current) setImportError(error instanceof SvgImportError ? error.code : "invalid");
    } finally { if (sequence === importSequence.current) setBusy(false); }
  }
  function chooseFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (file) void openFile(file); }
  const createBlank = () => { setNewDocumentOpen(false); void openFile(new File([blankSvg], zh ? "未命名图像.svg" : "untitled-figure.svg", { type: "image/svg+xml" })); };
  function exportFile() {
    if (!document || !markup || !ready) return;
    const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
    const link = window.document.createElement("a"); link.href = url; link.download = `${document.fileName.replace(/\.svg$/i, "")}-figfox.svg`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const error = importError === "large" ? ui.workspace.editorErrorLarge : importError === "complex" ? ui.workspace.editorErrorComplex : importError === "format" ? ui.workspace.editorErrorFormat : importError ? ui.workspace.editorErrorInvalid : "";

  return <div className="product-editor product-page-enter">
    <input className="sr-only" ref={fileInput} type="file" accept=".svg,image/svg+xml" aria-label={zh ? "选择 SVG 文件" : "Choose SVG file"} onChange={chooseFile} />
    <header className="product-editor-header">
      <div className="product-editor-leading"><ProductLink route="/" hrefFor={hrefFor} onNavigate={onNavigate} className="product-brand" aria-label={zh ? "FigFox 首页" : "FigFox home"}><img src={`${import.meta.env.BASE_URL}assets/demo/figfox-logo.svg`} width="36" height="36" alt="" /><strong>FigFox</strong></ProductLink><ProductLink route="/workspace" hrefFor={hrefFor} onNavigate={onNavigate} className="product-editor-back"><ArrowLeft size={17} /><span>{zh ? "工作台" : "Workspace"}</span></ProductLink></div>
      <div className="product-editor-title"><strong>{document?.fileName || (zh ? "SVG 编辑器" : "SVG editor")}</strong><span role="status">{document ? saveState === "failed" ? zh ? "本地保存失败，请导出保留" : "Local save failed. Export to keep your work." : saveState === "saving" ? zh ? "正在保存…" : "Saving…" : restored ? zh ? "已恢复本地文档" : "Local document restored" : zh ? "已在当前浏览器保存" : "Saved in this browser" : zh ? "本地文档" : "Local document"}</span></div>
      <div className="product-editor-actions"><button type="button" className="product-language" onClick={onLanguageChange} aria-label={zh ? "Switch to English" : "切换到中文"}><Globe size={17} /><span>{zh ? "EN" : "中文"}</span></button><button type="button" className="product-editor-new" aria-label={zh ? "新建 SVG" : "New SVG"} disabled={busy} onClick={() => document ? setNewDocumentOpen(true) : createBlank()}><Plus size={18} /></button><button type="button" className="product-button product-button-secondary" disabled={busy} onClick={() => fileInput.current?.click()} aria-label={zh ? "打开 SVG" : "Open SVG"}><UploadSimple size={17} /><span>{zh ? "打开 SVG" : "Open SVG"}</span></button><button type="button" className="product-button product-button-primary" disabled={!document || !ready} onClick={exportFile} aria-label={zh ? "导出 SVG" : "Export SVG"}><DownloadSimple size={17} /><span>{zh ? "导出 SVG" : "Export SVG"}</span></button></div>
    </header>
    <main id="editor-canvas" className="product-editor-main">
      {error && <div className="product-editor-error" role="alert"><WarningCircle size={18} /><span>{error}</span><button type="button" onClick={() => fileInput.current?.click()}>{zh ? "重新选择" : "Try another file"}</button></div>}
      {!document ? busy ? <div className="product-editor-loading" role="status">{zh ? "正在读取本地文档…" : "Loading local document…"}</div> : <EditorEmptyState zh={zh} busy={busy} onOpen={() => fileInput.current?.click()} onBlank={createBlank} onDrop={file => void openFile(file)} /> : <FigFoxEditorChrome language={language} ready={ready} state={state} editor={editorRef.current} sourceMarkup={markup} onSourceApply={async source => { setMarkup(await sanitizeSvgMarkup(source, document.fileName)); }}><SvgEditHost ref={editorRef} language={language} markup={markup} loadingLabel={ui.workspace.editorLoading} onMarkupChange={setMarkup} onReadyChange={setReady} onStateChange={setState} /></FigFoxEditorChrome>}
    </main>
    {!document && <footer className="product-editor-empty-footer"><span><Check size={15} />{zh ? "可编辑文字与路径" : "Editable text and paths"}</span><span><BezierCurve size={15} />{zh ? "原生 SVG 编辑" : "Native SVG editing"}</span><ProductLink route="/docs" hrefFor={hrefFor} onNavigate={onNavigate}>{zh ? "查看使用指南" : "Read the guide"}<ArrowRight size={15} /></ProductLink></footer>}
    <Dialog.Root open={newDocumentOpen} onOpenChange={setNewDocumentOpen}><Dialog.Portal><Dialog.Backdrop className="modal-backdrop" /><Dialog.Viewport className="dialog-viewport"><Dialog.Popup className="product-new-document-dialog"><Dialog.Close className="dialog-close" aria-label={zh ? "关闭" : "Close"}><X size={19} /></Dialog.Close><Dialog.Title>{zh ? "新建一张画布？" : "Create a new canvas?"}</Dialog.Title><Dialog.Description>{zh ? "新文档将替换当前本地记录。请先导出需要保留的 SVG。" : "The new document will replace the current local record. Export your SVG first if you want to keep it."}</Dialog.Description><div><Dialog.Close className="product-button product-button-secondary">{zh ? "继续编辑" : "Keep editing"}</Dialog.Close><button className="product-button product-button-primary" type="button" onClick={createBlank}>{zh ? "新建画布" : "Create canvas"}</button></div></Dialog.Popup></Dialog.Viewport></Dialog.Portal></Dialog.Root>
  </div>;
}
