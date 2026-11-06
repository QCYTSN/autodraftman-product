import { useEffect, useRef, useState } from "react";
import { fetchReconstructionArtifact } from "../../api";
import { ArrowRight, DownloadSimple } from "@phosphor-icons/react";
import type { ReconstructionSnapshot } from "./reconstructionTask";

export function ReconstructionResult({ snapshot, zh, onEdit, busy }: { snapshot: ReconstructionSnapshot; zh: boolean; onEdit: () => void; busy: boolean }) {
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const downloadLock = useRef(false);
  const [preview, setPreview] = useState<{ source: string; url: string } | null>(null);
  const imageSource = snapshot.status === "succeeded" ? snapshot.result?.png : undefined;
  useEffect(() => {
    if (!imageSource) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void fetchReconstructionArtifact(imageSource, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Preview unavailable");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setPreview({ source: imageSource, url: objectUrl });
    }).catch(() => { if (!controller.signal.aborted) setPreview(null); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imageSource]);
  const download = async (kind: "svg" | "png") => {
    if (!snapshot.result || downloadLock.current) return;
    downloadLock.current = true;
    setDownloading(true);
    setDownloadError("");
    try {
      const response = await fetchReconstructionArtifact(snapshot.result[kind], { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error("Download unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(snapshot.name || "FigFox").replace(/\.[^.]+$/, "")}-figfox.${kind}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError(zh ? "下载失败，请确认重建服务连接后重试。" : "Download failed. Check the reconstruction service connection and try again.");
    } finally { downloadLock.current = false; setDownloading(false); }
  };
  if (!snapshot.result || snapshot.status !== "succeeded") return null;
  return <section className="workspace-reconstruction-result" aria-label={zh ? "重建结果" : "Reconstruction result"}>
    {preview && preview.source === imageSource ? <img src={preview.url} alt={zh ? "本次重建的图像" : "The reconstructed figure"}/> : <div className="reconstruction-preview-placeholder" role="status">{zh ? "SVG 已生成，可打开编辑或下载" : "SVG ready to edit or download"}</div>}
    <div><h3>{zh ? "SVG 已就绪" : "Your SVG is ready"}</h3>
      <p>{zh ? "打开编辑器，继续修改文字、图形与布局。" : "Continue editing text, shapes and layout."}</p>
      {snapshot.result.unresolvedCount > 0 && <p className="reconstruction-unresolved" role="status">{zh ? `仍有 ${snapshot.result.unresolvedCount} 项问题未解决，请在编辑器中检查。` : `${snapshot.result.unresolvedCount} issues remain unresolved. Review them in the editor.`}</p>}
      <div className="reconstruction-result-actions">
        <button type="button" className="product-button product-button-primary" disabled={busy} onClick={onEdit}>{zh ? "打开 SVG 编辑" : "Edit SVG"}<ArrowRight size={16}/></button>
        <button type="button" disabled={downloading} onClick={() => void download("svg")}><DownloadSimple size={16}/>SVG</button><button type="button" disabled={downloading} onClick={() => void download("png")}><DownloadSimple size={16}/>PNG</button>
      </div>
      {downloadError && <p role="alert">{downloadError}</p>}
      <small>{zh ? "耗时" : "Time"} {(snapshot.result.elapsedSeconds / 60).toFixed(1)} {zh ? "分钟" : "min"}{snapshot.result.costUsd != null ? ` · ${zh ? "估算 API 费用" : "Estimated API cost"} $${snapshot.result.costUsd.toFixed(3)}` : ""}</small>
      {snapshot.result.costUsd == null && snapshot.result.knownCostUsd != null && <small>{zh ? "已记录 API 费用" : "Recorded API cost"} ${snapshot.result.knownCostUsd.toFixed(3)}{(snapshot.result.reservedCostUsd || 0) > 0 ? zh ? " · 另有断线调用费用待确认" : " · Disconnected call billing pending" : ""}</small>}
    </div>
  </section>;
}
