import { createContext, useContext, useEffect, useRef, useState } from "react";

export const reconstructionStages = ["reconstruct", "inspect", "repair", "finalize"] as const;
export type ReconstructionStage = typeof reconstructionStages[number];
export type ReconstructionSnapshot = {
  id: string;
  revision: number;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  stage: ReconstructionStage | null;
};
export type ReconstructionInput = { draftId: string; image: File; prompt: string };

/** Frontend adapter boundary. No provider is installed until the real service is connected.
 * The adapter owns authentication, transport validation and request timeouts.
 * revision must increase per job; submit must deduplicate by requestId.
 */
export type ReconstructionClient = {
  submit: (input: ReconstructionInput & { requestId: string }, signal: AbortSignal) => Promise<ReconstructionSnapshot>;
  read: (id: string, signal: AbortSignal) => Promise<ReconstructionSnapshot>;
};
export const ReconstructionContext = createContext<ReconstructionClient | null>(null);
export const isReconstructionActive = (snapshot: ReconstructionSnapshot) => snapshot.status === "queued" || snapshot.status === "running";

export function useReconstructionTask() {
  const client = useContext(ReconstructionContext);
  const [task, setTask] = useState<{ snapshot: ReconstructionSnapshot; name: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const latest = useRef(task);
  const submitController = useRef<AbortController | null>(null);
  const locked = useRef(false);
  latest.current = task;

  useEffect(() => () => submitController.current?.abort(), []);

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
    if (!client || locked.current || (latest.current && isReconstructionActive(latest.current.snapshot))) return;
    locked.current = true;
    setSubmitting(true);
    setSubmitFailed(false);
    const controller = new AbortController();
    submitController.current = controller;
    try {
      const snapshot = await client.submit({ ...input, requestId: crypto.randomUUID() }, controller.signal);
      if (controller.signal.aborted) return;
      latest.current = { snapshot, name: input.image.name };
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

  return { available: !!client, task, open, setOpen, submit, submitting, submitFailed, disconnected, busy: submitting || running };
}
