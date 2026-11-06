import { createContext, useContext, useEffect, useRef, useState } from "react";

export const reconstructionStages = ["reconstruct", "inspect", "repair", "finalize"] as const;
export type ReconstructionStage = typeof reconstructionStages[number];
export type ReconstructionSnapshot = {
  id: string;
  revision: number;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  stage: ReconstructionStage | null;
  name?: string;
  draftId?: string;
  error?: string | null;
  submissionPending?: boolean;
  failure?: { billing: "not_started" | "recorded" | "unconfirmed" | "unknown"; costUsd?: number; reservedUsd?: number; retryable: boolean; resume?: boolean } | null;
  result?: { svg: string; png: string; costUsd: number | null; knownCostUsd?: number; reservedCostUsd?: number; elapsedSeconds: number; unresolvedCount: number; sha256: string } | null;
};
export type ReconstructionInput = { draftId: string; image: File; prompt: string };

/** Frontend adapter boundary. No provider is installed until the real service is connected.
 * The adapter owns authentication, transport validation and request timeouts.
 * revision must increase per job; submit must deduplicate by requestId.
 */
export type ReconstructionClient = {
  scope?: string;
  canSubmit?: boolean;
  connected?: boolean;
  history?: (signal: AbortSignal) => Promise<ReconstructionSnapshot[]>;
  unavailableReason?: "budget" | "test_limit" | "model" | "configuration" | "signin" | "forbidden";
  supportsUserPrompt?: boolean;
  remainingBudgetUsd?: number;
  submit: (input: ReconstructionInput & { requestId: string }, signal: AbortSignal) => Promise<ReconstructionSnapshot>;
  read: (id: string, signal: AbortSignal) => Promise<ReconstructionSnapshot>;
  recent?: (signal: AbortSignal) => Promise<ReconstructionSnapshot | null>;
  retry?: (id: string, revision: number, signal: AbortSignal) => Promise<ReconstructionSnapshot>;
};
export const ReconstructionContext = createContext<ReconstructionClient | null>(null);
export const isReconstructionActive = (snapshot: ReconstructionSnapshot) => snapshot.status === "queued" || snapshot.status === "running";

export function useReconstructionTask() {
  const client = useContext(ReconstructionContext);
  const [task, setTask] = useState<{ snapshot: ReconstructionSnapshot; name: string } | null>(null);
  const [history, setHistory] = useState<ReconstructionSnapshot[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const latest = useRef(task);
  const submitController = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const attempt = useRef<(ReconstructionInput & { requestId: string }) | null>(null);
  latest.current = task;

  useEffect(() => () => submitController.current?.abort(), []);
  useEffect(() => {
    // Task state belongs to the current account, including in-flight responses.
    submitController.current?.abort();
    latest.current = null; attempt.current = null; locked.current = false;
    setTask(null); setHistory([]); setOpen(false); setSubmitting(false);
    setSubmitFailed(false); setDisconnected(false);
  }, [client?.scope]);
  useEffect(() => {
    if (!client?.recent) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const recover = async () => {
      try {
        const jobs = client.history ? await client.history(controller.signal) : [await client.recent!(controller.signal)].filter((job): job is ReconstructionSnapshot => !!job);
        if (controller.signal.aborted) return;
        setHistory(jobs);
        const current = latest.current;
        const updated = current && jobs.find(job => job.id === current.snapshot.id && job.revision > current.snapshot.revision);
        if (updated && !locked.current) { latest.current = { ...current!, snapshot: updated }; setTask(latest.current); }
        const snapshot = jobs.find(isReconstructionActive) || jobs[0];
        if (snapshot && !latest.current && !locked.current) {
          latest.current = { snapshot, name: snapshot.name || "FigFox.svg" };
          setTask(latest.current);
        }
        timer = setTimeout(recover, 10_000);
      } catch {
        if (!controller.signal.aborted) timer = setTimeout(recover, 1500);
      }
    };
    void recover();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [client]);
  useEffect(() => {
    if (task) setHistory(items => [task.snapshot, ...items.filter(item => item.id !== task.snapshot.id)]);
  }, [task]);
  const selectTask = (id: string) => {
    if (locked.current || (latest.current && isReconstructionActive(latest.current.snapshot))) return;
    const snapshot = history.find(item => item.id === id);
    if (snapshot) { latest.current = { snapshot, name: snapshot.name || "FigFox.svg" }; setTask(latest.current); setSubmitFailed(false); }
  };

  const jobId = task?.snapshot.id;
  const running = !!task && isReconstructionActive(task.snapshot);
  useEffect(() => {
    if (!client || !jobId || !running) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await client.read(jobId, controller.signal);
        if (controller.signal.aborted) return;
        if (next.id !== jobId) throw new Error("Mismatched reconstruction job");
        setDisconnected(false);
        const current = latest.current;
        if (current && next.revision > current.snapshot.revision) {
          latest.current = { ...current, snapshot: next };
          setTask(latest.current);
          if (!isReconstructionActive(next)) return;
        }
      } catch {
        if (controller.signal.aborted) return;
        setDisconnected(true);
      }
      // Closing the dialog never affects polling or advances the reported stage.
      timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [client, jobId, running]);

  const submit = async (input: ReconstructionInput) => {
    if (!client || client.connected === false || client.canSubmit === false || history.some(isReconstructionActive) || locked.current || (latest.current && isReconstructionActive(latest.current.snapshot))) return;
    locked.current = true;
    setSubmitting(true);
    setSubmitFailed(false);
    const controller = new AbortController();
    submitController.current = controller;
    try {
      if (!attempt.current || attempt.current.image !== input.image || attempt.current.prompt !== input.prompt || attempt.current.draftId !== input.draftId) {
        attempt.current = { ...input, requestId: crypto.randomUUID() };
      }
      const snapshot = await client.submit(attempt.current, controller.signal);
      if (controller.signal.aborted) return;
      latest.current = { snapshot, name: input.image.name };
      setTask(latest.current);
      setDisconnected(false);
      setOpen(true);
      attempt.current = null;
    } catch {
      if (!controller.signal.aborted) setSubmitFailed(true);
    } finally {
      locked.current = false;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  };

  const retry = async () => {
    const current = latest.current;
    if (!client?.retry || client.connected === false || locked.current || !current?.snapshot.failure?.retryable) return;
    locked.current = true;
    setSubmitting(true);
    setSubmitFailed(false);
    const controller = new AbortController();
    submitController.current = controller;
    try {
      const snapshot = await client.retry(current.snapshot.id, current.snapshot.revision, controller.signal);
      if (controller.signal.aborted) return;
      latest.current = { ...current, snapshot };
      setTask(latest.current);
      setDisconnected(false);
      setOpen(true);
    } catch {
      if (!controller.signal.aborted) setSubmitFailed(true);
    } finally {
      locked.current = false;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  };

  return { history, selectTask, connected: client?.connected, available: !!client && client.connected !== false && client.canSubmit !== false, supportsUserPrompt: client?.supportsUserPrompt, unavailableReason: client?.unavailableReason, remainingBudgetUsd: client?.remainingBudgetUsd, task, open, setOpen, submit, retry: client?.retry ? retry : undefined, submitting, submitFailed, disconnected: disconnected || client?.connected === false, selectionBusy: submitting || running, busy: submitting || running || history.some(isReconstructionActive) };
}
