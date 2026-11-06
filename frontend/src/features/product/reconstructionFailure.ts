import type { ReconstructionSnapshot } from "./reconstructionTask";

export function reconstructionFailure(snapshot: ReconstructionSnapshot, zh: boolean) {
  if (snapshot.submissionPending) return zh
    ? "提交回执尚未确认。重新确认会找回原任务；若上次未送达，会提交这张原图。"
    : "The submission receipt is unconfirmed. Confirm to recover the same task, or send it if it was not received.";
  const messages: Record<string, [string, string]> = {
    background_pending: ["后台请求仍在处理，可稍后继续查询同一任务。", "The background request is still processing. Continue later to check the same request."],
    background_expired: ["后台结果已过期，无法恢复。", "The background result has expired and cannot be recovered."],
    background_rejected: ["后台请求未能完成。", "The background request could not complete."],
    background_identity: ["后台请求标识不匹配，已停止恢复。", "The background request identity did not match. Recovery stopped."],
    input_too_large: ["本阶段输入超过原版配置上限，运行已停止。", "This stage exceeds the upstream input limit; processing has stopped."],
    input_count_unavailable: ["暂时无法核验本阶段输入量，本阶段生成请求尚未发送。", "Input size could not be verified. This stage’s generation request was not sent."],
    original_contract_mismatch: ["运行文件或配置与原版不一致，已停止提交。", "Runtime files or configuration differ from upstream; submission stopped."],
    original_prompt_unsupported: ["原版流程仅接受参考图，暂不附加提示词。", "The upstream workflow accepts a reference image without extra prompts."],
    preparation_failed: ["图像素材准备未完成，请稍后重试。", "Image preparation did not finish. Try again shortly."],
    connection_unavailable: ["暂时无法连接生成服务，任务尚未发送。", "The generation service could not be reached. The request was not sent."],
    budget_exceeded: ["本轮测试已达到费用上限。", "The test budget has been reached."],
    provider_unconfirmed: ["模型连接中断，尚未确认本次调用结果。", "The model connection ended before the result could be confirmed."],
    timeout: ["处理超时，任务已停止。", "Processing timed out and the task has stopped."],
    interrupted: ["服务重启，任务已中断。", "The service restarted and interrupted this task."],
    kernel_failed: ["重建处理未完成，运行记录已保存。", "Processing did not finish. The run record has been saved."],
  };
  return (messages[snapshot.error || ""] || ["重建未完成。", "Reconstruction did not finish."])[zh ? 0 : 1];
}
