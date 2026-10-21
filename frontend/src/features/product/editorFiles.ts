export type EditorFileHandle = {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void>; abort(): Promise<void> }>;
  queryPermission?(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(options: { mode: "readwrite" }): Promise<PermissionState>;
};
type PickerWindow = Window & {
  showOpenFilePicker?: (options: unknown) => Promise<EditorFileHandle[]>;
  showSaveFilePicker?: (options: unknown) => Promise<EditorFileHandle>;
};
const types = [{ description: "SVG", accept: { "image/svg+xml": [".svg"] } }];
export const hasFilePicker = () => Boolean((window as PickerWindow).showOpenFilePicker && (window as PickerWindow).showSaveFilePicker);
export const pickSvgFile = () => (window as PickerWindow).showOpenFilePicker!({ types, multiple: false });
// Call before awaiting serialization: browsers require a current user gesture.
export const pickSaveFile = (name: string) => (window as PickerWindow).showSaveFilePicker!({ types, suggestedName: name });
export const isFileCancel = (error: unknown) => error instanceof DOMException && error.name === "AbortError";
export async function writeSvgFile(handle: EditorFileHandle, markup: string) {
  const stream = await handle.createWritable();
  try { await stream.write(new Blob([markup], { type: "image/svg+xml" })); await stream.close(); }
  catch (error) { await stream.abort().catch(() => undefined); throw error; }
}
export function downloadSvg(markup: string, name: string) {
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
