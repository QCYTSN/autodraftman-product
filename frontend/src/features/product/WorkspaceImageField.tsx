import { ArrowsOutSimple, Trash, UploadSimple } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { WorkspaceImage } from '../../drafts';

export function WorkspaceImageField({ zh, source, name, metadata, isRebuild, error, pending, choose, remove, enlarge }: {
  zh: boolean; source: string; name: string; metadata: WorkspaceImage | null; isRebuild: boolean; error: string; pending: boolean;
  choose: () => void; remove: () => void; enlarge: (trigger: HTMLElement) => void;
}) {
  const [shown, setShown] = useState(source);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!source) { setShown(''); return; }
    let cancelled = false;
    const image = new Image(); image.src = source;
    void image.decode().then(() => { if (!cancelled) setShown(source); }).catch(() => { if (!cancelled) setShown(source); });
    return () => { cancelled = true; };
  }, [source]);
  return <div className="form-block reference-block">
    <label htmlFor="reference-file">{isRebuild ? zh ? '原图' : 'Source image' : zh ? '参考图' : 'Reference image'}</label>
    {shown ? <div className="reference-upload-card">
      <button type="button" className="workspace-image-open" aria-label={zh ? '放大查看原图' : 'View source image larger'} onClick={event => enlarge(event.currentTarget)}>
        <AnimatePresence><motion.img key={shown} src={shown} alt={zh ? '任务原图' : 'Task source'} className="product-workspace-source" initial={{opacity: reducedMotion ? 1 : 0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reducedMotion ? 0 : .16}} /></AnimatePresence>
      </button>
      <div className="workspace-image-toolbar">
        <div className="reference-upload-copy"><strong title={name}>{name}</strong><small>{metadata ? `${metadata.width} × ${metadata.height} · ${(metadata.size / 1024 / 1024).toFixed(1)} MB` : zh ? '参考图' : 'Reference image'}</small></div>
        <div className="workspace-image-actions">
          <button type="button" disabled={pending} onClick={choose} aria-label={zh ? '替换原图' : 'Replace source image'} title={zh ? '替换' : 'Replace'}><UploadSimple size={16}/></button>
          <button type="button" onClick={event => enlarge(event.currentTarget)} aria-label={zh ? '放大查看' : 'View larger'} title={zh ? '放大查看' : 'View larger'}><ArrowsOutSimple size={16}/></button>
          <button type="button" onClick={remove} aria-label={zh ? '移除参考图' : 'Remove reference image'} title={zh ? '移除' : 'Remove'}><Trash size={16}/></button>
        </div>
      </div>
    </div> : <button type="button" className="upload-zone" disabled={pending} onClick={choose}><UploadSimple size={24}/><strong>{zh ? '选择原图' : 'Choose source image'}</strong><span>{zh ? '点击、拖入或粘贴图片' : 'Click, drop or paste an image'}</span><small>{zh ? 'PNG / JPEG / WebP · 最大 10 MB' : 'PNG / JPEG / WebP · Up to 10 MB'}</small></button>}
    {error && <p className="field-message" role="alert">{error}</p>}
  </div>;
}
