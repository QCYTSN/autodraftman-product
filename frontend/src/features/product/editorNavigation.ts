// The router awaits the mounted editor before a browser-history departure.
let save: (() => Promise<boolean>) | null = null;
export function registerEditorLeave(handler: () => Promise<boolean>) {
  save = handler;
  return () => { if (save === handler) save = null; };
}
export function saveBeforeEditorLeave() { return save ? save() : Promise.resolve(true); }
