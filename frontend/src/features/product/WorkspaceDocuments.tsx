import {AlertDialog} from '@base-ui/react/alert-dialog';
import {ArrowRight, DownloadSimple, FileSvg, MagnifyingGlass, PencilSimple, Plus, Trash, UploadSimple, X, Check, WarningCircle} from '@phosphor-icons/react';
import {useEffect, useRef, useState, type ChangeEvent} from 'react';
import {importSvgDocument, SvgImportError} from '../../svgDocument';
import {demoAsset} from '../demo/cases';
import {activateEditorDocument, deleteEditorDocument, EditorStorageBlockedError, readEditorDocuments, renameEditorDocument, saveEditorDocument, type StoredEditorDocument} from './editorStorage';
import type {ProductLanguage} from '../../ProductPages';

const blank = '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><title>Untitled figure</title></svg>';
function Preview({document}: {document: StoredEditorDocument}) {
  const [url, setUrl] = useState('');
  useEffect(() => { const next = URL.createObjectURL(new Blob([document.markup], {type:'image/svg+xml'})); setUrl(next); return () => URL.revokeObjectURL(next); }, [document.markup]);
  return url ? <img src={url} alt="" width="320" height="180" loading="lazy" /> : <FileSvg size={30}/>;
}
export async function openGuideExample(onOpen: () => void) {
  const response = await fetch(demoAsset('study','result.svg'));
  if (!response.ok) throw new Error('Example unavailable');
  const imported = await importSvgDocument(new File([await response.text()], 'FigFox-example.svg', {type:'image/svg+xml'}));
  await saveEditorDocument({fileName:imported.fileName,markup:imported.markup,updatedAt:new Date().toISOString()});
  onOpen();
}
export function WorkspaceDocuments({language, onOpenEditor}: {language: ProductLanguage; onOpenEditor: () => void}) {
  const zh = language === 'zh';
  const [documents, setDocuments] = useState<StoredEditorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState('');
  const [name, setName] = useState('');
  const [removing, setRemoving] = useState<StoredEditorDocument | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const refresh = () => readEditorDocuments().then(setDocuments);
  const blockedMessage = zh ? '请关闭其他 FigFox 标签页，再刷新此页以读取原有文档。' : 'Close other FigFox tabs, then refresh this page to read your existing documents.';
  useEffect(() => { let cancelled=false; readEditorDocuments().then(items => {if(!cancelled)setDocuments(items);}).catch(failure => {if(!cancelled)setError(failure instanceof EditorStorageBlockedError ? blockedMessage : zh?'本地文档记录不可用，可以直接在编辑器打开文件。':'Local document storage is unavailable. You can open files directly in the editor.');}).finally(()=>{if(!cancelled)setLoading(false);}); return()=>{cancelled=true;}; }, []);
  const attempt = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try {await action();} catch (failure) {
      setError(failure instanceof EditorStorageBlockedError ? blockedMessage : failure instanceof SvgImportError ? zh ? '无法打开这个 SVG。请检查文件格式、5 MB 大小限制及内容。' : 'Could not open this SVG. Check its format, content and the 5 MB limit.' : zh ? '操作没有完成，文档仍保留。请重试或直接打开编辑器。' : 'The operation did not complete. Your documents are retained. Try again or open the editor directly.');
    } finally {setBusy(false);}
  };
  async function importFile(file: File) {
    const imported = await importSvgDocument(file);
    await saveEditorDocument({fileName:imported.fileName,markup:imported.markup,updatedAt:new Date().toISOString()});
    onOpenEditor();
  }
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {const file=event.target.files?.[0]; event.target.value=''; if(file)void attempt(()=>importFile(file));};
  const exportDocument = (document: StoredEditorDocument) => {const url=URL.createObjectURL(new Blob([document.markup],{type:'image/svg+xml'}));const link=window.document.createElement('a');link.href=url;link.download=document.fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const matches=documents.filter(document=>document.fileName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section className="product-documents" aria-label={zh?'本地 SVG 文档':'Local SVG documents'}>
    <input ref={fileInput} className="sr-only" type="file" accept=".svg,image/svg+xml" aria-label={zh?'导入 SVG 文档':'Import SVG document'} onChange={chooseFile}/>
    <header className="product-documents-heading"><div><h2>{zh?'我的 SVG':'My SVGs'}</h2><p>{zh?'在当前浏览器保存，打开后继续编辑。':'Saved in this browser. Open a document to continue editing.'}</p></div><button className="product-button product-button-secondary" type="button" disabled={busy} onClick={()=>fileInput.current?.click()}><UploadSimple size={17}/>{zh?'导入 SVG':'Import SVG'}</button></header>
    {error && <p className="product-documents-error" role="alert"><WarningCircle size={16}/>{error}</p>}
    <div className="product-documents-start">
      <button type="button" data-allow-wrap="true" disabled={busy} onClick={()=>void attempt(()=>importFile(new File([blank],zh?'未命名图像.svg':'untitled-figure.svg',{type:'image/svg+xml'})))}><Plus size={24}/><strong>{zh?'新建画布':'New canvas'}</strong><span>1280 × 720 · SVG</span></button>
      <button type="button" data-allow-wrap="true" disabled={busy} onClick={()=>void attempt(()=>openGuideExample(onOpenEditor))}><FileSvg size={24}/><strong>{zh?'用示例试一遍':'Try an example'}</strong><span>{zh?'文字、图形、连接线':'Text, shapes and connectors'}</span></button>
    </div>
    {!!documents.length && <label className="product-documents-search"><MagnifyingGlass size={16}/><input aria-label={zh?'搜索 SVG 文档':'Search SVG documents'} placeholder={zh?'搜索文档名称':'Search document names'} value={query} onChange={event=>setQuery(event.target.value)}/><span>{documents.length}</span></label>}
    {loading ? <p className="product-documents-note" role="status">{zh?'正在读取文档…':'Loading documents…'}</p> : !documents.length ? <div className="product-documents-empty"><strong>{zh?'还没有保存的 SVG':'No saved SVGs yet'}</strong><p>{zh?'导入自己的文件，或打开示例。编辑结果会出现在这里。':'Import a file or open the example. Your edits will appear here.'}</p></div> : !matches.length ? <p className="product-documents-note">{zh?'没有找到匹配的文档。':'No matching documents.'}</p> : <div className="product-document-grid">{matches.map(document=><article className="product-document-card" key={document.id}>
      <button className="product-document-preview" type="button" disabled={busy} aria-label={(zh?'打开 ':'Open ')+document.fileName} onClick={()=>void attempt(async()=>{await activateEditorDocument(document.id);onOpenEditor();})}><Preview document={document}/><span><ArrowRight size={18}/></span></button>
      {renaming===document.id ? <form className="product-document-rename" onSubmit={event=>{event.preventDefault();if(!name.trim())return;void attempt(async()=>{await renameEditorDocument(document.id,name);await refresh();setRenaming('');});}}><input autoFocus maxLength={100} value={name} aria-label={zh?'文档名称':'Document name'} onChange={event=>setName(event.target.value)} onKeyDown={event=>{if(event.key==='Escape')setRenaming('');}}/><button type="submit" disabled={busy} aria-label={zh?'保存文档名称':'Save document name'}><Check size={15}/></button><button type="button" onClick={()=>setRenaming('')} aria-label={zh?'取消重命名文档':'Cancel document rename'}><X size={15}/></button></form> : <h3 title={document.fileName}>{document.fileName}</h3>}
      <footer><time dateTime={document.updatedAt}>{new Intl.DateTimeFormat(zh?'zh-CN':'en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(document.updatedAt))}</time><div><button type="button" disabled={busy} aria-label={zh?'重命名 SVG':'Rename SVG'} onClick={()=>{setRenaming(document.id);setName(document.fileName.replace(/\.svg$/i,''));}}><PencilSimple size={16}/></button><button type="button" aria-label={zh?'下载 SVG 文档':'Download SVG document'} onClick={()=>exportDocument(document)}><DownloadSimple size={16}/></button><button type="button" disabled={busy} aria-label={zh?'删除 SVG 文档':'Delete SVG document'} onClick={()=>setRemoving(document)}><Trash size={16}/></button></div></footer>
    </article>)}</div>}
    <div className="product-documents-bottom"><span>{zh?'本地记录不跨设备同步，重要文件请导出保留。':'Local records do not sync across devices. Export important work.'}</span><button type="button" onClick={onOpenEditor}>{zh?'打开 SVG 编辑器':'Open SVG editor'}<ArrowRight size={15}/></button></div>
    <AlertDialog.Root open={!!removing} onOpenChange={open=>{if(!open)setRemoving(null);}}><AlertDialog.Portal><AlertDialog.Backdrop className="modal-backdrop"/><AlertDialog.Viewport className="dialog-viewport"><AlertDialog.Popup className="draft-delete-dialog product-delete-dialog"><AlertDialog.Title>{zh?'删除这份 SVG？':'Delete this SVG?'}</AlertDialog.Title><AlertDialog.Description>{zh?'删除后无法恢复本地记录。需要保留时请先下载文件。':'This local record cannot be restored. Download a copy first if you need it.'}</AlertDialog.Description><div><AlertDialog.Close className="product-button product-button-secondary">{zh?'取消':'Cancel'}</AlertDialog.Close><button type="button" className="button danger-button" disabled={busy} onClick={()=>{if(removing)void attempt(async()=>{await deleteEditorDocument(removing.id);await refresh();setRemoving(null);});}}>{zh?'删除文档':'Delete document'}</button></div></AlertDialog.Popup></AlertDialog.Viewport></AlertDialog.Portal></AlertDialog.Root>
  </section>;
}
