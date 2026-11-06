import { useEffect, useState, type ReactNode } from "react";
import { ApiError, apiFetch, apiResourceUrl, getCurrentIdentity, type CurrentIdentity } from "../../api";
import { InternalIdentityContext } from "./InternalIdentityContext";
import { setEditorAccountScope } from "./editorStorage";
import { transferInternalDraft } from "./transferInternalDraft";
import { LocalReconstructionProvider } from "./LocalReconstructionProvider";
import { ReconstructionContext, reconstructionStages, type ReconstructionClient, type ReconstructionSnapshot } from "./reconstructionTask";

const base = "/api/v1/reconstructions";
async function request(path: string, init: RequestInit = {}) {
  const response = await apiFetch(apiResourceUrl(path), {
    ...init,
    signal: AbortSignal.any([AbortSignal.timeout(45_000), ...(init.signal ? [init.signal] : [])]),
  });
  if (!response.ok) throw new ApiError("Reconstruction request failed", response.status);
  return response.json();
}

function snapshot(value: unknown): ReconstructionSnapshot {
  const item = value as ReconstructionSnapshot;
  if (!item || !/^[a-f0-9]{32}$/.test(item.id) || !Number.isInteger(item.revision) || item.revision < 1 ||
    !["queued", "running", "succeeded", "failed", "cancelled"].includes(item.status) ||
    (item.stage !== null && !reconstructionStages.includes(item.stage))) throw new Error("Invalid task state");
  if (item.result) {
    for (const kind of ["svg", "png"] as const) {
      const path = `${base}/${item.id}/result.${kind}`;
      if (item.result[kind] !== path) throw new Error("Invalid artifact location");
      item.result[kind] = apiResourceUrl(path);
    }
  }
  return item;
}

const transport: ReconstructionClient = {
  async history(signal) {
    const jobs = await request(base, { signal });
    if (!Array.isArray(jobs)) throw new Error("Invalid task history");
    return jobs.map(snapshot);
  },
  async recent(signal) { return (await transport.history!(signal))[0] || null; },
  async submit(input, signal) {
    const form = new FormData();
    form.set("image", input.image); form.set("prompt", input.prompt); form.set("draftId", input.draftId);
    return snapshot(await request(base, { method: "POST", body: form, signal, headers: { "Idempotency-Key": input.requestId } }));
  },
  async read(id, signal) { return snapshot(await request(`${base}/${encodeURIComponent(id)}`, { signal })); },
  async retry(id, revision, signal) {
    return snapshot(await request(`${base}/${encodeURIComponent(id)}/retry`, {
      method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision }),
    }));
  },
};
const unavailable = (reason: "signin" | "forbidden"): ReconstructionClient => ({
  scope: "anonymous", canSubmit: false, connected: true, unavailableReason: reason,
  submit: async () => { throw new Error("Sign in required"); },
  read: async () => { throw new Error("Sign in required"); },
});

function InternalProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ReconstructionClient | null>(unavailable("signin"));
  const [identity, setIdentity] = useState<CurrentIdentity | null | undefined>(undefined);
  const [transferFailed, setTransferFailed] = useState(false);
  useEffect(() => {
    let controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let owner: string | null | undefined;
    const identityReady = (current: CurrentIdentity | null) => {
      const nextOwner = current?.id || null;
      if (owner !== undefined && owner !== nextOwner) { changed(); return false; }
      owner = nextOwner;
      setEditorAccountScope(nextOwner || "anonymous");
      setIdentity(current);
      return true;
    };
    const refresh = async (signal: AbortSignal) => {
      try {
        const identity = await getCurrentIdentity();
        if (signal.aborted) return;
        if (owner === undefined && identity.kind === "user") {
          try { await transferInternalDraft(identity.id); }
          catch { if (!signal.aborted) setTransferFailed(true); }
          if (signal.aborted) return;
        }
        if (!identityReady(identity.kind === "user" ? identity : null)) return;
        if (identity.kind !== "user") throw new ApiError("Sign in required", 401);
        const state = await request(`${base}/health`, { signal });
        if (signal.aborted) return;
        if (state.accountId !== identity.id || !Array.isArray(state.problems) || typeof state.available !== "boolean") throw new Error("Invalid service state");
        const problems: string[] = state.problems;
        const next: ReconstructionClient = { ...transport, scope: identity.id, connected: true,
          canSubmit: state.available, supportsUserPrompt: state.supportsUserPrompt, remainingBudgetUsd: state.remainingBudgetUsd,
          unavailableReason: problems.includes("config_invalid") ? "configuration" : problems.some(p => p.startsWith("model_")) ? "model" : problems.includes("test_limit_reached") ? "test_limit" : problems.includes("budget_exceeded") ? "budget" : undefined,
        };
        setClient(previous => previous?.scope === next.scope && previous?.connected === true && previous.canSubmit === next.canSubmit && previous.remainingBudgetUsd === next.remainingBudgetUsd && previous.unavailableReason === next.unavailableReason ? previous : next);
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          if (error.status === 401 && !identityReady(null)) return;
          setClient(unavailable(error.status === 401 ? "signin" : "forbidden"));
        } else {
          if (owner === undefined) identityReady(null);
          setClient(previous => previous ? { ...previous, connected: false, canSubmit: false } : null);
        }
      }
      if (!signal.aborted) timer = setTimeout(() => void refresh(signal), 10_000);
    };
    const changed = () => {
      controller.abort(); clearTimeout(timer);
      setClient(unavailable("signin"));
      // Replace the complete editing context so old callbacks/iframes cannot write as a new user.
      window.location.replace(`${import.meta.env.BASE_URL}workspace`);
    };
    const storage = (event: StorageEvent) => { if (event.key === "figfox-identity-version") changed(); };
    window.addEventListener("figfox-identity-changed", changed);
    window.addEventListener("storage", storage);
    void refresh(controller.signal);
    return () => { controller.abort(); clearTimeout(timer); window.removeEventListener("figfox-identity-changed", changed); window.removeEventListener("storage", storage); };
  }, []);
  if (identity === undefined) return <div className="product-entry-loading" role="status" aria-label="加载工作台"><span /></div>;
  return <InternalIdentityContext value={identity}><ReconstructionContext value={client}>
    {transferFailed && <aside className="internal-transfer-error" role="alert">登录成功，原图移交尚未完成，匿名草稿仍保留。<button type="button" onClick={() => location.reload()}>重新载入草稿</button></aside>}
    {children}
  </ReconstructionContext></InternalIdentityContext>;
}

export function ReconstructionProvider({ children }: { children: ReactNode }) {
  return import.meta.env.VITE_INTERNAL_RECONSTRUCTION === "true"
    ? <InternalProvider>{children}</InternalProvider>
    : <LocalReconstructionProvider>{children}</LocalReconstructionProvider>;
}
