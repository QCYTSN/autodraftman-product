import { useEffect, useState, type ReactNode } from "react";
import { ReconstructionContext, reconstructionStages, type ReconstructionClient, type ReconstructionSnapshot } from "./reconstructionTask";

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(path, { ...init, signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(init.signal ? [init.signal] : [])]) });
  if (!response.ok) throw new Error(`Reconstruction request failed (${response.status})`);
  return response.json();
}

function snapshot(value: unknown): ReconstructionSnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid task response");
  const item = value as ReconstructionSnapshot;
  if (!/^[a-f0-9]{32}$/.test(item.id) || !Number.isInteger(item.revision) || item.revision < 1 ||
    !["queued", "running", "succeeded", "failed", "cancelled"].includes(item.status) ||
    (item.stage !== null && !reconstructionStages.includes(item.stage))) throw new Error("Invalid task state");
  if (item.result && (item.result.svg !== `/local-api/jobs/${item.id}/result.svg` || item.result.png !== `/local-api/jobs/${item.id}/result.png`)) throw new Error("Invalid result location");
  return item;
}

const client: ReconstructionClient = {
  async submit(input, signal) {
    const form = new FormData();
    form.set("image", input.image); form.set("prompt", input.prompt); form.set("draftId", input.draftId);
    return snapshot(await request("/local-api/jobs", { method: "POST", body: form, headers: { "Idempotency-Key": input.requestId }, signal }));
  },
  async read(id, signal) { return snapshot(await request(`/local-api/jobs/${encodeURIComponent(id)}`, { signal })); },
  async retry(id, revision, signal) {
    return snapshot(await request(`/local-api/jobs/${encodeURIComponent(id)}/retry`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision }), signal,
    }));
  },
  async recent(signal) {
    const jobs = await request("/local-api/jobs", { signal });
    if (!Array.isArray(jobs)) throw new Error("Invalid task history");
    const snapshots = jobs.map(snapshot);
    return snapshots.find(job => job.status === "running" || job.status === "queued") || snapshots[0] || null;
  },
};

export function LocalReconstructionProvider({ children }: { children: ReactNode }) {
  const [connectedClient, setConnectedClient] = useState<ReconstructionClient | null>(null);
  useEffect(() => {
    // No service probe or client is enabled in a static/production build.
    if (!import.meta.env.DEV || import.meta.env.VITE_LOCAL_RECONSTRUCTION !== "true" || !["127.0.0.1", "localhost"].includes(location.hostname)) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const state = await request("/local-api/health", { signal: controller.signal });
        if (!controller.signal.aborted && state.service === "figfox-local-v1") {
          const next: ReconstructionClient = { ...client, canSubmit: state.available === true, remainingBudgetUsd: state.remainingBudgetUsd, unavailableReason: state.problems.includes("test_limit_reached") ? "test_limit" : state.problems.includes("budget_exceeded") ? "budget" : undefined };
          setConnectedClient(previous => previous?.canSubmit === next.canSubmit && previous?.unavailableReason === next.unavailableReason && previous?.remainingBudgetUsd === next.remainingBudgetUsd ? previous : next);
        }
      } catch { /* Task polling retains the last known stage during a service interruption. */ }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 10_000);
    };
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  return <ReconstructionContext value={connectedClient}>{children}</ReconstructionContext>;
}
