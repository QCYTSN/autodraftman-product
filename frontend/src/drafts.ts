import type { WorkspaceDraft, WorkspaceDraftInput } from "./api";

const draftStorageKey = "autodraftman-workspace-drafts-v1";

function isDraft(value: unknown): value is WorkspaceDraft {
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

export function readCachedDrafts(): WorkspaceDraft[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(draftStorageKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isDraft)
      .map((draft) => ({ ...draft, title: draft.title ?? null }))
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function writeCachedDrafts(drafts: WorkspaceDraft[]): void {
  window.localStorage.setItem(
    draftStorageKey,
    JSON.stringify(
      [...drafts]
        .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
        .slice(0, 30),
    ),
  );
}

export function makeLocalDraft(
  input: WorkspaceDraftInput,
  id = `local-${crypto.randomUUID()}`,
): WorkspaceDraft {
  const now = new Date().toISOString();
  return {
    id,
    ...input,
    created_at: now,
    updated_at: now,
    expires_at: null,
  };
}

export function draftInput(draft: WorkspaceDraft): WorkspaceDraftInput {
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

export function draftFingerprint(input: WorkspaceDraftInput): string {
  return JSON.stringify(input);
}

export function draftTitle(draft: WorkspaceDraft, fallback: string): string {
  const customTitle = draft.title?.trim();
  if (customTitle) return customTitle;
  const normalized = draft.prompt.trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.length > 42 ? `${normalized.slice(0, 42)}…` : normalized;
}
