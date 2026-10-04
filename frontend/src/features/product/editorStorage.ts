export type LocalEditorDocument = { fileName: string; markup: string; updatedAt: string };

let database: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("figfox-local-editor", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("documents");
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = null; };
      resolve(db);
    };
    request.onerror = () => { database = null; reject(request.error); };
    request.onblocked = () => { database = null; reject(new Error("Editor storage is blocked")); };
  });
  return database;
}

export async function readEditorDocument(): Promise<LocalEditorDocument | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("documents", "readonly").objectStore("documents").get("current");
    request.onsuccess = () => {
      const result = request.result;
      resolve(result && typeof result.fileName === "string" && typeof result.markup === "string" && typeof result.updatedAt === "string" ? result : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveEditorDocument(document: LocalEditorDocument) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("documents", "readwrite");
    transaction.objectStore("documents").put(document, "current");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Editor save interrupted"));
  });
}
