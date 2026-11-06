import type { WorkspaceDraft as RemoteDraft, WorkspaceDraftInput } from "./api";

export type WorkspaceImage = { key: string; name: string; type: string; size: number; width: number; height: number };
export type LocalDraftInput = WorkspaceDraftInput & { taskType: "create" | "rebuild"; localImage: WorkspaceImage | null };
export type WorkspaceDraft = RemoteDraft & Pick<LocalDraftInput, "taskType" | "localImage">;

// Local-only metadata is never sent to the draft API. A remote ID change keeps
// the same image key, so its Blob does not need to be copied or re-uploaded.
export function mergeRemoteDraft(remote: RemoteDraft, local?: WorkspaceDraft): WorkspaceDraft {
  return { ...remote, taskType: local?.taskType ?? "create", localImage: local?.localImage ?? null };
}

const draftStorageKey = "autodraftman-workspace-drafts-v1";

export function isDraft(value: unknown): value is WorkspaceDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<WorkspaceDraft>;
  return (
    typeof draft.id === "string" &&
    (draft.title === undefined ||
      draft.title === null ||
      typeof draft.title === "string") &&
    typeof draft.prompt === "string" &&
    (draft.mode === "text" || draft.mode === "reference") &&
    ["16:9", "4:3", "1:1"].includes(draft.aspect_ratio ?? "") &&
    ["PNG", "JPG", "WebP"].includes(draft.output_format ?? "") &&
    (draft.visibility === "private" || draft.visibility === "public") &&
    typeof draft.created_at === "string" &&
    typeof draft.updated_at === "string"
  );
}

export function readCachedDrafts(scope?: string): WorkspaceDraft[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(scope ? `${draftStorageKey}:${scope}` : draftStorageKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isDraft)
      .map((draft) => ({ ...draft, title: draft.title ?? null, taskType: draft.taskType === "rebuild" ? "rebuild" as const : "create" as const, localImage: draft.localImage?.key ? draft.localImage : null }))
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function writeCachedDrafts(drafts: WorkspaceDraft[], scope?: string): boolean {
  try {
    window.localStorage.setItem(
      scope ? `${draftStorageKey}:${scope}` : draftStorageKey,
      JSON.stringify(
        [...drafts]
          .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
          .slice(0, 30),
      ),
    );
    return true;
  } catch {
    return false;
  }
}

export function makeLocalDraft(
  input: WorkspaceDraftInput & Partial<Pick<LocalDraftInput, "taskType" | "localImage">>,
  id = `local-${crypto.randomUUID()}`,
): WorkspaceDraft {
  const now = new Date().toISOString();
  return {
    id,
    ...input,
    taskType: input.taskType ?? "rebuild",
    localImage: input.localImage ?? null,
    created_at: now,
    updated_at: now,
    expires_at: null,
  };
}

export function draftInput(draft: WorkspaceDraftInput): WorkspaceDraftInput {
  return {
    title: draft.title,
    prompt: draft.prompt,
    mode: draft.mode,
    aspect_ratio: draft.aspect_ratio,
    output_format: draft.output_format,
    visibility: draft.visibility,
    reference_asset_id: draft.reference_asset_id,
  };
}

export function localDraftInput(draft: LocalDraftInput): LocalDraftInput {
  return { ...draftInput(draft), taskType: draft.taskType, localImage: draft.localImage };
}

export function draftFingerprint(input: WorkspaceDraftInput): string {
  const local = input as Partial<LocalDraftInput>;
  return JSON.stringify({ ...draftInput(input), taskType: local.taskType, localImage: local.localImage });
}

export function draftTitle(draft: WorkspaceDraft, fallback: string): string {
  const customTitle = draft.title?.trim();
  if (customTitle) return customTitle;
  if (draft.localImage?.name) return draft.localImage.name;
  const normalized = draft.prompt.trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.length > 42 ? `${normalized.slice(0, 42)}…` : normalized;
}
