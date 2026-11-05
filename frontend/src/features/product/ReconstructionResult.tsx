import { ArrowRight, DownloadSimple } from "@phosphor-icons/react";
import type { ReconstructionSnapshot } from "./reconstructionTask";

export function ReconstructionResult({ snapshot, zh, onEdit, busy }: { snapshot: ReconstructionSnapshot; zh: boolean; onEdit: () => void; busy: boolean }) {
  if (!snapshot.result || snapshot.status !== "succeeded") return null;
  return <section className="workspace-reconstruction-result" aria-label={zh ? "重建结果" : "Reconstruction result"}>
    <img src={snapshot.result.png} alt={zh ? "本次重建的图像" : "The reconstructed figure"}/>
    <div><h3>{zh ? "SVG 已就绪" : "Your SVG is ready"}</h3>
      <p>{zh ? "打开编辑器，继续修改文字、图形与布局。" : "Continue editing text, shapes and layout."}</p>
      <div className="reconstruction-result-actions">
        <button type="button" className="product-button product-button-primary" disabled={busy} onClick={onEdit}>{zh ? "打开 SVG 编辑" : "Edit SVG"}<ArrowRight size={16}/></button>
        <a href={snapshot.result.svg} download><DownloadSimple size={16}/>SVG</a><a href={snapshot.result.png} download><DownloadSimple size={16}/>PNG</a>
      </div>
      <small>{zh ? "耗时" : "Time"} {(snapshot.result.elapsedSeconds / 60).toFixed(1)} {zh ? "分钟" : "min"}{snapshot.result.costUsd != null ? ` · ${zh ? "估算 API 费用" : "Estimated API cost"} $${snapshot.result.costUsd.toFixed(3)}` : ""}</small>
      {snapshot.result.costUsd == null && snapshot.result.knownCostUsd != null && <small>{zh ? "已记录 API 费用" : "Recorded API cost"} ${snapshot.result.knownCostUsd.toFixed(3)}{(snapshot.result.reservedCostUsd || 0) > 0 ? zh ? " · 另有断线调用费用待确认" : " · Disconnected call billing pending" : ""}</small>}
    </div>
  </section>;
}
