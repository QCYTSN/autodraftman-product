export type LocalEditorDocument = { id?: string; fileName: string; markup: string; updatedAt: string };
export type StoredEditorDocument = LocalEditorDocument & { id: string };
let database: Promise<IDBDatabase> | null = null;
export class EditorStorageBlockedError extends Error {
  constructor() { super("Close other FigFox tabs to update local document storage"); this.name = "EditorStorageBlockedError"; }
}
const isDocument = (value: unknown): value is LocalEditorDocument => !!value && typeof value === "object" && typeof (value as LocalEditorDocument).fileName === "string" && typeof (value as LocalEditorDocument).markup === "string" && typeof (value as LocalEditorDocument).updatedAt === "string";

function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("figfox-local-editor", 2);
    let failed = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("documents")) db.createObjectStore("documents");
      if (!db.objectStoreNames.contains("preferences")) db.createObjectStore("preferences");
      const transaction = request.transaction!;
      const store = transaction.objectStore("documents");
      const legacy = store.get("current");
      legacy.onsuccess = () => {
        if (!isDocument(legacy.result)) return;
        const document = { ...legacy.result, id: legacy.result.id || crypto.randomUUID() };
        store.put(document, document.id);
        store.delete("current");
        transaction.objectStore("preferences").put(document.id, "active");
      };
    };
    request.onsuccess = () => {
      const db = request.result;
      if (failed) { db.close(); return; }
      db.onversionchange = () => { db.close(); database = null; };
      resolve(db);
    };
    request.onerror = () => { failed = true; database = null; reject(request.error); };
    request.onblocked = () => { failed = true; database = null; reject(new EditorStorageBlockedError()); };
  });
  return database;
}

function result<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function complete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Local document operation interrupted"));
  });
}

export async function readEditorDocuments(): Promise<StoredEditorDocument[]> {
  const db = await openDatabase();
  const documents = await result(db.transaction("documents", "readonly").objectStore("documents").getAll());
  return documents.filter((document): document is StoredEditorDocument => isDocument(document) && typeof document.id === "string").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function readEditorDocument(): Promise<StoredEditorDocument | null> {
  const db = await openDatabase();
  const active = await result(db.transaction("preferences", "readonly").objectStore("preferences").get("active"));
  if (typeof active === "string") {
    const document = await result(db.transaction("documents", "readonly").objectStore("documents").get(active));
    if (isDocument(document) && document.id) return document as StoredEditorDocument;
  }
  return (await readEditorDocuments())[0] || null;
}
export async function saveEditorDocument(document: LocalEditorDocument): Promise<StoredEditorDocument> {
  const db = await openDatabase();
  const stored = { ...document, id: document.id || crypto.randomUUID() };
  const transaction = db.transaction(["documents", "preferences"], "readwrite");
  transaction.objectStore("documents").put(stored, stored.id);
  transaction.objectStore("preferences").put(stored.id, "active");
  await complete(transaction);
  return stored;
}
export async function activateEditorDocument(id: string) {
  const db = await openDatabase();
  const transaction = db.transaction(["documents", "preferences"], "readwrite");
  const request = transaction.objectStore("documents").get(id);
  request.onsuccess = () => {
    if (!isDocument(request.result)) { transaction.abort(); return; }
    transaction.objectStore("preferences").put(id, "active");
  };
  await complete(transaction);
}
export async function renameEditorDocument(id: string, name: string) {
  const db = await openDatabase();
  const transaction = db.transaction("documents", "readwrite");
  const store = transaction.objectStore("documents");
  const request = store.get(id);
  request.onsuccess = () => {
    if (!isDocument(request.result)) { transaction.abort(); return; }
    const fileName = name.trim().replace(/[\\/:*?"<>|]/g, "-");
    store.put({ ...request.result, fileName: fileName.toLowerCase().endsWith(".svg") ? fileName : fileName + ".svg", updatedAt: new Date().toISOString() }, id);
  };
  await complete(transaction);
}
export async function deleteEditorDocument(id: string) {
  const db = await openDatabase();
  const transaction = db.transaction(["documents", "preferences"], "readwrite");
  transaction.objectStore("documents").delete(id);
  const preferences = transaction.objectStore("preferences");
  const active = preferences.get("active");
  active.onsuccess = () => { if (active.result === id) preferences.delete("active"); };
  await complete(transaction);
}
