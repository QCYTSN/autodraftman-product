import { isDraft, readCachedDrafts, writeCachedDrafts } from "../../drafts";
import { readWorkspaceImage, saveWorkspaceImage, deleteWorkspaceImage } from "./workspaceImages";

// Only an explicit "sign in with this draft" action creates this tab-local marker.
export async function transferInternalDraft(account: string) {
  const id = sessionStorage.getItem("figfox-transfer-draft");
  if (!id) return;
  // A different anonymous tab can still flush its older cache during sign-in.
  // Carry the exact draft explicitly selected in this tab, not that shared mutable cache.
  const captured = sessionStorage.getItem("figfox-transfer-snapshot");
  const source: unknown = captured ? JSON.parse(captured) : readCachedDrafts("anonymous").find(item => item.id === id);
  if (!source) { sessionStorage.removeItem("figfox-transfer-draft"); return; }
  if (!isDraft(source) || source.id !== id) throw new Error("Draft transfer identity mismatch");
  let imageKey: string | undefined;
  try {
    const draft = { ...source, updated_at: new Date().toISOString() };
    if (draft.localImage) {
      imageKey = crypto.randomUUID();
      await saveWorkspaceImage(imageKey, await readWorkspaceImage(draft.localImage.key));
      draft.localImage = { ...draft.localImage, key: imageKey };
    }
    const saved = writeCachedDrafts([draft, ...readCachedDrafts(account).filter(item => item.id !== id)], account);
    if (!saved || !readCachedDrafts(account).some(item => item.id === id && item.localImage?.key === draft.localImage?.key)) {
      throw new Error("Draft transfer failed");
    }
    localStorage.setItem(`figfox-active-task:${account}`, id);
    sessionStorage.removeItem("figfox-transfer-draft");
    sessionStorage.removeItem("figfox-transfer-snapshot");
    // Keep the anonymous source as a backup. Its separate image cannot remove this copy.
  } catch (error) {
    if (imageKey && !readCachedDrafts(account).some(item => item.localImage?.key === imageKey)) {
      await deleteWorkspaceImage(imageKey).catch(() => undefined);
    }
    throw error;
  }
}
