// Workspace raster inputs deliberately use a different database from SVG documents.
const databaseName = "figfox-workspace-images";
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    let failed = false;
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onerror = () => { failed = true; reject(request.error); };
    request.onblocked = () => { failed = true; reject(new Error("Image storage is blocked")); };
    request.onsuccess = () => {
      if (failed) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function transact<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("images", mode);
      const request = operation(transaction.objectStore("images"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error || request.error);
      transaction.onabort = () => reject(transaction.error || new Error("Image storage interrupted"));
    });
  } finally { db.close(); }
}
export const saveWorkspaceImage = (key: string, file: Blob) => transact("readwrite", store => store.put(file, key));
export const deleteWorkspaceImage = (key: string) => transact("readwrite", store => store.delete(key));
export async function readWorkspaceImage(key: string): Promise<Blob> {
  const blob = await transact("readonly", store => store.get(key));
  if (!(blob instanceof Blob)) throw new Error("The saved image is unavailable");
  return blob;
}

export async function imageDimensions(file: File): Promise<{width: number; height: number}> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Invalid image");
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}
