import { Check } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type CSSProperties } from "react";
import type { ProductLanguage } from "../../ProductPages";
import { FigureProcessGraphic } from "./FigureProcess";
import { ReconstructionResult } from "./ReconstructionResult";
import { reconstructionFailure } from "./reconstructionFailure";
import { isReconstructionActive, reconstructionStages, type ReconstructionSnapshot } from "./reconstructionTask";

const copy = {
  zh: {
    titles: ["重建 SVG", "检查关系", "修复问题", "整理结果"],
    descriptions: ["重建文字、图形及它们之间的相对位置。", "检查局部布局、文字与连接关系。", "根据检查结果，调整需要修复的局部。", "准备可查看、下载和继续编辑的 SVG。"],
    queued: "等待处理", running: "正在处理", succeeded: "SVG 已就绪", failed: "重建未完成", cancelled: "任务已取消",
  },
  en: {
    titles: ["Reconstruct SVG", "Check relationships", "Repair issues", "Prepare the result"],
    descriptions: ["Rebuild text, shapes and their relative positions.", "Review local layouts, labels and connections.", "Adjust the regions identified during review.", "Prepare the SVG for viewing, downloading and editing."],
    queued: "Waiting to start", running: "Processing", succeeded: "SVG is ready", failed: "Reconstruction did not finish", cancelled: "Task cancelled",
  },
};

export function ReconstructionProgress({ snapshot, name, disconnected, language, onClose, onEdit, onRetry, retryBusy = false, retryFailed = false, resultBusy = false }: {
  snapshot: ReconstructionSnapshot; name: string; disconnected: boolean; language: ProductLanguage; onClose: () => void; onEdit?: () => void; onRetry?: () => void; retryBusy?: boolean; retryFailed?: boolean; resultBusy?: boolean;
}) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(document.visibilityState !== "hidden");
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const zh = language === "zh";
  const text = copy[language];
  const stage = snapshot.stage ? reconstructionStages.indexOf(snapshot.stage) : -1;
  const running = snapshot.status === "running";
  const done = snapshot.status === "succeeded";
  const active = isReconstructionActive(snapshot);
  const title = running && stage >= 0 ? text.titles[stage] : snapshot.status === "failed" && stage >= 0 ? zh ? `${text.titles[stage]}未完成` : `${text.titles[stage]} did not finish` : text[snapshot.status];
  const description = running && stage >= 0 ? text.descriptions[stage] : snapshot.status === "queued"
    ? zh ? "任务已提交，开始处理后会自动更新。" : "Your task is submitted. Progress will update when processing starts."
    : done ? zh ? "重建已完成，可以返回工作台。" : "Reconstruction is complete. Return to your workspace."
    : snapshot.status === "failed" ? reconstructionFailure(snapshot, zh)
    : !active ? zh ? "原图与要求仍保留在工作台中。" : "Your source image and notes are still in the workspace."
    : zh ? "收到阶段信息后会自动更新。" : "The current stage will appear when reported by the service.";

  return <section className="figure-process-preview reconstruction-progress" aria-label={zh ? "重建进度" : "Reconstruction progress"} data-status={snapshot.status} data-stage={snapshot.stage || "unknown"}>
    <p className="reconstruction-source" title={name}>{name}</p>
    {done && snapshot.result && onEdit ? <ReconstructionResult snapshot={snapshot} zh={zh} onEdit={onEdit} busy={resultBusy}/> : <FigureProcessGraphic stage={done ? 4 : Math.max(0, stage)} running={running && !disconnected && visible} />}
    <div className={done && snapshot.result ? "sr-only" : "figure-process-caption"} role="status" aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false} mode="wait">
        <motion.div key={`${snapshot.status}-${snapshot.stage}`} initial={{ opacity: 0, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -3 }} transition={{ duration: reduced ? 0 : .16 }}>
          <h2>{title}</h2><p>{description}</p>
        </motion.div>
      </AnimatePresence>
    </div>
    {snapshot.status === "failed" && <motion.div className="reconstruction-failure" role="status" initial={{ opacity: 0, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .2 }}>
      <p>{zh ? "原图与要求已保留。" : "Your source image and notes are retained."}{snapshot.failure?.billing === "not_started" ? zh ? "本次尚未调用模型，API 费用为 $0。" : "No model call was made. API cost: $0." : snapshot.failure?.billing === "unconfirmed" ? zh ? "本次费用待确认，未自动重试。" : "Billing is unconfirmed. No automatic retry was made." : snapshot.failure?.billing === "recorded" && snapshot.failure.costUsd != null ? zh ? `已记录 API 费用 $${snapshot.failure.costUsd.toFixed(3)}。` : `Recorded API cost: $${snapshot.failure.costUsd.toFixed(3)}.` : ""}</p>
      {snapshot.failure?.resume && !snapshot.submissionPending && <p>{zh ? "已完成的步骤会直接复用，从中断的阶段继续。" : "Completed steps will be reused. Continue from the interrupted stage."}</p>}
      {onRetry && snapshot.failure?.retryable && <button type="button" onClick={onRetry} disabled={retryBusy}>{retryBusy ? zh ? "正在重新提交…" : "Retrying…" : snapshot.submissionPending ? zh ? "重新确认提交" : "Confirm submission" : snapshot.failure.resume ? zh ? "继续未完成的步骤" : "Continue remaining steps" : zh ? "重试此图" : "Retry this image"}</button>}
      {retryFailed && <p role="alert">{zh ? "暂时无法重试，请稍后再试。" : "Retry is unavailable right now. Try again shortly."}</p>}
    </motion.div>}
    <ol className="figure-process-steps" style={{ "--process-steps": 4 } as CSSProperties}>
      {text.titles.map((label, index) => <li key={label} data-state={done || index < stage ? "done" : running && index === stage ? "current" : "waiting"} aria-current={running && index === stage ? "step" : undefined}>
        <div className="figure-process-step"><span>{done || index < stage ? <Check size={13}/> : String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></div>
      </li>)}
    </ol>
    <footer className="figure-process-preview-footer">
      <p role={disconnected ? "status" : undefined}>{disconnected ? zh ? "正在重新连接，显示上次收到的阶段。" : "Reconnecting. Showing the last reported stage." : active ? zh ? "关闭窗口后仍会继续处理，可随时查看进度。" : "Processing continues when you close this window. Reopen progress at any time." : zh ? "任务状态已更新。" : "Task status updated."}</p>
      <button type="button" onClick={onClose}>{zh ? "返回工作台" : "Back to workspace"}</button>
    </footer>
  </section>;
}
