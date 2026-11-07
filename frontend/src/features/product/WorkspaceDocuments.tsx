import {AlertDialog} from '@base-ui/react/alert-dialog';
import {ArrowRight, DownloadSimple, FileSvg, MagnifyingGlass, PencilSimple, Trash, X, Check, WarningCircle} from '@phosphor-icons/react';
import {useEffect, useMemo, useState} from 'react';
import {importSvgDocument, SvgImportError} from '../../svgDocument';
import {deleteEditorDocument, EditorStorageBlockedError, readEditorDocuments, renameEditorDocument, type StoredEditorDocument} from './editorStorage';
import {blankSvg, importResearchExample, saveNewSvg} from './workspaceSvg';
import type {ProductLanguage} from '../../ProductPages';

function Preview({document, zh}: {document: StoredEditorDocument; zh: boolean}) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const parsed = useMemo(() => new DOMParser().parseFromString(document.markup, 'image/svg+xml'), [document.markup]);
  const invalid = !!parsed.querySelector('parsererror');
  const isBlank = !invalid && !parsed.querySelector('rect,path,circle,ellipse,line,polyline,polygon,text,image,use,foreignObject');
  useEffect(() => { setFailed(false); const next = URL.createObjectURL(new Blob([document.markup], {type:'image/svg+xml'})); setUrl(next); return () => URL.revokeObjectURL(next); }, [document.markup]);
  return failed || invalid || isBlank ? <div className="product-document-placeholder"><FileSvg size={28}/><span>{failed || invalid ? zh ? '预览加载失败，点击打开' : 'Preview unavailable. Open to edit.' : zh ? '空白画布' : 'Blank canvas'}</span></div> : url ? <img src={url} alt="" width="320" height="180" loading="lazy" onError={()=>setFailed(true)}/> : <FileSvg size={30}/>;
}
export async function openBlankDocument(onOpen: () => void, zh: boolean) {
  const imported = await importSvgDocument(new File([blankSvg], zh ? '未命名画布.svg' : 'Untitled canvas.svg', {type:'image/svg+xml'}));
  await saveNewSvg(imported);
  onOpen();
}
export async function openGuideExample(onOpen: () => void) {
  await saveNewSvg(await importResearchExample());
  onOpen();
}
export function WorkspaceDocuments({language, onOpenDocument, onExample, operationBusy, onDocumentsChange}: {language: ProductLanguage; onOpenDocument: (id: string) => void; onExample: () => void; operationBusy: boolean; onDocumentsChange: () => void}) {
  const zh = language === 'zh';
  const [documents, setDocuments] = useState<StoredEditorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState('');
  const [name, setName] = useState('');
  const [removing, setRemoving] = useState<StoredEditorDocument | null>(null);
  const refresh = () => readEditorDocuments().then(items => {setDocuments(items);onDocumentsChange();});
  const blockedMessage = zh ? '请关闭其他 FigFox 标签页，再刷新此页以读取原有文档。' : 'Close other FigFox tabs, then refresh this page to read your existing documents.';
  useEffect(() => { let cancelled=false; readEditorDocuments().then(items => {if(!cancelled)setDocuments(items);}).catch(failure => {if(!cancelled)setError(failure instanceof EditorStorageBlockedError ? blockedMessage : zh?'本地文档记录不可用，可以直接在编辑器打开文件。':'Local document storage is unavailable. You can open files directly in the editor.');}).finally(()=>{if(!cancelled)setLoading(false);}); return()=>{cancelled=true;}; }, []);
  const attempt = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try {await action();} catch (failure) {
      setError(failure instanceof EditorStorageBlockedError ? blockedMessage : failure instanceof SvgImportError ? zh ? '无法打开这个 SVG。请检查文件格式和内容复杂度。' : 'Could not open this SVG. Check its format and content complexity.' : zh ? '操作没有完成，文档仍保留。请重试或直接打开编辑器。' : 'The operation did not complete. Your documents are retained. Try again or open the editor directly.');
    } finally {setBusy(false);}
  };
  const exportDocument = (document: StoredEditorDocument) => {const url=URL.createObjectURL(new Blob([document.markup],{type:'image/svg+xml'}));const link=window.document.createElement('a');link.href=url;link.download=document.fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const matches=documents.filter(document=>document.fileName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section className="product-documents" aria-label={zh?'本地 SVG 文档':'Local SVG documents'}>
    <header className="product-documents-heading"><p>{zh ? `${documents.length} 份文档` : `${documents.length} documents`}</p><div className="product-documents-actions"><label className="product-documents-search"><MagnifyingGlass size={16}/><input aria-label={zh?'搜索 SVG 文档':'Search SVG documents'} placeholder={zh?'搜索文档名称':'Search document names'} value={query} onChange={event=>setQuery(event.target.value)}/></label>{!!documents.length && <button type="button" disabled={busy || operationBusy} onClick={onExample}>{zh ? '编辑示例' : 'Edit example'}</button>}</div></header>
    {error && <p className="product-documents-error" role="alert"><WarningCircle size={16}/>{error}</p>}
    {loading ? <p className="product-documents-note" role="status">{zh?'正在读取文档…':'Loading documents…'}</p> : !documents.length ? <div className="product-documents-empty"><strong>{zh?'还没有 SVG 文档':'No SVG documents yet'}</strong><p>{zh?'新建画布、打开文件或编辑示例，内容会保存在此浏览器。':'Create a canvas, open a file or edit the example. Your work is saved in this browser.'}</p><button type="button" className="product-button product-button-secondary" disabled={operationBusy} onClick={onExample}>{zh?'编辑科研 SVG 示例':'Edit a research SVG example'}</button></div> : !matches.length ? <p className="product-documents-note">{zh?'没有找到匹配的文档。':'No matching documents.'}</p> : <div className="product-document-grid">{matches.map(document=><article className="product-document-card" key={document.id} onClick={event=>{if(!busy && !operationBusy && !(event.target as HTMLElement).closest("button,input,form")) onOpenDocument(document.id);}}>
      <button className="product-document-preview" type="button" disabled={busy || operationBusy} aria-label={(zh?'打开 ':'Open ')+document.fileName} onClick={()=>onOpenDocument(document.id)}><Preview document={document} zh={zh}/><span><ArrowRight size={18}/></span></button>
      {renaming===document.id ? <form className="product-document-rename" onSubmit={event=>{event.preventDefault();if(!name.trim())return;void attempt(async()=>{await renameEditorDocument(document.id,name);await refresh();setRenaming('');});}}><input autoFocus maxLength={100} value={name} aria-label={zh?'文档名称':'Document name'} onChange={event=>setName(event.target.value)} onKeyDown={event=>{if(event.key==='Escape')setRenaming('');}}/><button type="submit" disabled={busy} aria-label={zh?'保存文档名称':'Save document name'}><Check size={15}/></button><button type="button" onClick={()=>setRenaming('')} aria-label={zh?'取消重命名文档':'Cancel document rename'}><X size={15}/></button></form> : <h3 title={document.fileName}>{document.fileName}</h3>}
      <footer><time dateTime={document.updatedAt}>{new Intl.DateTimeFormat(zh?'zh-CN':'en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(document.updatedAt))}</time><div><button type="button" disabled={busy} aria-label={zh?'重命名 SVG':'Rename SVG'} onClick={()=>{setRenaming(document.id);setName(document.fileName.replace(/\.svg$/i,''));}}><PencilSimple size={16}/></button><button type="button" aria-label={zh?'下载 SVG 文档':'Download SVG document'} onClick={()=>exportDocument(document)}><DownloadSimple size={16}/></button><button type="button" disabled={busy} aria-label={zh?'删除 SVG 文档':'Delete SVG document'} onClick={()=>setRemoving(document)}><Trash size={16}/></button></div></footer>
    </article>)}</div>}
    {!!documents.length && <div className="product-documents-bottom"><span>{zh?'本地记录不跨设备同步，重要文件请导出保留。':'Local records do not sync across devices. Export important work.'}</span></div>}
    <AlertDialog.Root open={!!removing} onOpenChange={open=>{if(!open)setRemoving(null);}}><AlertDialog.Portal><AlertDialog.Backdrop className="modal-backdrop"/><AlertDialog.Viewport className="dialog-viewport"><AlertDialog.Popup className="draft-delete-dialog product-delete-dialog"><AlertDialog.Title>{zh?'删除这份 SVG？':'Delete this SVG?'}</AlertDialog.Title><AlertDialog.Description>{zh?'删除后无法恢复本地记录。需要保留时请先下载文件。':'This local record cannot be restored. Download a copy first if you need it.'}</AlertDialog.Description><div><AlertDialog.Close className="product-button product-button-secondary">{zh?'取消':'Cancel'}</AlertDialog.Close><button type="button" className="button danger-button" disabled={busy} onClick={()=>{if(removing)void attempt(async()=>{await deleteEditorDocument(removing.id);await refresh();setRemoving(null);});}}>{zh?'删除文档':'Delete document'}</button></div></AlertDialog.Popup></AlertDialog.Viewport></AlertDialog.Portal></AlertDialog.Root>
  </section>;
}
