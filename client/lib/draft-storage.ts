/**
 * IndexedDB-based draft storage for chat input persistence (#93)
 *
 * Stores text, files, and audio recordings per session.
 * Survives browser refresh and tab close.
 */

const DB_NAME = "myagentive-drafts";
const DB_VERSION = 1;
const STORE_NAME = "drafts";

export interface SessionDraft {
  sessionName: string;
  input: string;
  file: {
    name: string;
    type: string;
    data: ArrayBuffer;
  } | null;
  audioBlob: ArrayBuffer | null;
  audioType: string | null;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open draft database:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "sessionName" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Save a draft for a session
 */
export async function saveDraft(
  sessionName: string,
  input: string,
  file: File | null,
  audioBlob: Blob | null
): Promise<void> {
  // Don't save empty drafts
  if (!input.trim() && !file && !audioBlob) {
    // If all empty, delete existing draft instead
    await deleteDraft(sessionName);
    return;
  }

  try {
    const db = await getDB();

    // Convert file to storable format
    let fileData: SessionDraft["file"] = null;
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      fileData = {
        name: file.name,
        type: file.type,
        data: arrayBuffer,
      };
    }

    // Convert audio blob to storable format
    let audioData: ArrayBuffer | null = null;
    let audioType: string | null = null;
    if (audioBlob) {
      audioData = await audioBlob.arrayBuffer();
      audioType = audioBlob.type;
    }

    const draft: SessionDraft = {
      sessionName,
      input,
      file: fileData,
      audioBlob: audioData,
      audioType,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(draft);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("Failed to save draft:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error saving draft:", error);
  }
}

/**
 * Load a draft for a session
 */
export async function loadDraft(sessionName: string): Promise<{
  input: string;
  file: File | null;
  audioBlob: Blob | null;
} | null> {
  try {
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(sessionName);

      request.onsuccess = () => {
        const draft = request.result as SessionDraft | undefined;
        if (!draft) {
          resolve(null);
          return;
        }

        // Reconstruct file from stored data
        let file: File | null = null;
        if (draft.file) {
          file = new File([draft.file.data], draft.file.name, {
            type: draft.file.type,
          });
        }

        // Reconstruct audio blob from stored data
        let audioBlob: Blob | null = null;
        if (draft.audioBlob && draft.audioType) {
          audioBlob = new Blob([draft.audioBlob], { type: draft.audioType });
        }

        resolve({
          input: draft.input,
          file,
          audioBlob,
        });
      };

      request.onerror = () => {
        console.error("Failed to load draft:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error loading draft:", error);
    return null;
  }
}

/**
 * Delete a draft for a session
 */
export async function deleteDraft(sessionName: string): Promise<void> {
  try {
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(sessionName);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("Failed to delete draft:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error deleting draft:", error);
  }
}

/**
 * Delete all drafts (useful for cleanup)
 */
export async function deleteAllDrafts(): Promise<void> {
  try {
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("Failed to clear drafts:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error clearing drafts:", error);
  }
}
