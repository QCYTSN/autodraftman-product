let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, { resolve: (svg: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

function resetWorker(message: string) {
  worker?.terminate();
  worker = undefined;
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error(message)); }
  pending.clear();
}

export function renderFormula(latex: string): Promise<string> {
  if (!worker) {
    worker = new Worker(new URL("./formula.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ id: number; svg: string; error?: string }>) => {
      const request = pending.get(event.data.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(event.data.id);
      if (event.data.error) request.reject(new Error(event.data.error));
      else request.resolve(event.data.svg);
    };
    worker.onerror = () => resetWorker("Could not load the formula renderer. Try again.");
  }
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, timer: setTimeout(() => resetWorker("Formula rendering timed out. Simplify the expression and try again."), 8000) });
    worker!.postMessage({ id, latex });
  });
}
