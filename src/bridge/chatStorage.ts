/**
 * IndexedDB-backed chat history storage for the browser/fallback path.
 *
 * When IndexedDB is unavailable (e.g. jsdom test env) the module transparently
 * falls back to an in-memory store so callers never need to check availability.
 *
 * All public functions swallow errors and are safe to fire-and-forget.
 */

import type { ChatMessage } from "../types/tokki";

// ---------------------------------------------------------------------------
// Backend interface
// ---------------------------------------------------------------------------

export interface ChatStorageBackend {
  load(max: number): Promise<ChatMessage[]>;
  append(msg: ChatMessage): Promise<void>;
  trim(max: number): Promise<void>;
  clear(): Promise<void>;
}

// ---------------------------------------------------------------------------
// IndexedDB backend (production)
// ---------------------------------------------------------------------------

const IDB_NAME = "tokki_chat_v1";
const IDB_VERSION = 1;
const IDB_STORE = "messages";

function openChatDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        // Auto-increment key so identical timestamps don't overwrite each other
        db.createObjectStore(IDB_STORE, { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IDB open blocked"));
  });
}

type StoredRow = ChatMessage & { _seq?: number };

class IdbChatStorageBackend implements ChatStorageBackend {
  async load(max: number): Promise<ChatMessage[]> {
    const db = await openChatDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result as StoredRow[]);
        // sort ascending by timestamp, then take the most recent `max`
        const msgs: ChatMessage[] = rows
          .map(({ _seq: _ignored, ...msg }) => msg as ChatMessage)
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-max);
        resolve(msgs);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async append(msg: ChatMessage): Promise<void> {
    const db = await openChatDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.add(msg);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async trim(max: number): Promise<void> {
    const db = await openChatDb();
    // Collect all keys in ascending insertion order
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (keys.length <= max) return;

    const toDelete = keys.slice(0, keys.length - max);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      let remaining = toDelete.length;
      if (remaining === 0) { resolve(); return; }
      for (const key of toDelete) {
        const req = store.delete(key);
        req.onsuccess = () => { if (--remaining === 0) resolve(); };
        req.onerror = () => reject(req.error);
      }
    });
  }

  async clear(): Promise<void> {
    const db = await openChatDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

// ---------------------------------------------------------------------------
// In-memory backend (used when IndexedDB is unavailable, e.g. in jsdom)
// ---------------------------------------------------------------------------

class MemoryChatStorageBackend implements ChatStorageBackend {
  private messages: ChatMessage[] = [];

  async load(max: number): Promise<ChatMessage[]> {
    return this.messages.slice(-max);
  }

  async append(msg: ChatMessage): Promise<void> {
    this.messages.push(msg);
  }

  async trim(max: number): Promise<void> {
    if (this.messages.length > max) {
      this.messages = this.messages.slice(-max);
    }
  }

  async clear(): Promise<void> {
    this.messages = [];
  }
}

// ---------------------------------------------------------------------------
// Backend selection
// ---------------------------------------------------------------------------

let _activeBackend: ChatStorageBackend | null = null;

function isIdbAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    window.indexedDB !== null
  );
}

function getBackend(): ChatStorageBackend {
  if (_activeBackend) return _activeBackend;
  _activeBackend = isIdbAvailable()
    ? new IdbChatStorageBackend()
    : new MemoryChatStorageBackend();
  return _activeBackend;
}

/**
 * Override the storage backend. Pass `null` to reset to automatic selection.
 * Intended for tests; not for production use.
 */
export function _setChatStorageBackend(backend: ChatStorageBackend | null): void {
  _activeBackend = backend;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load the most recent `max` messages from persistent storage. */
export async function loadPersistedMessages(max: number): Promise<ChatMessage[]> {
  try {
    return await getBackend().load(max);
  } catch {
    return [];
  }
}

/** Append a single message to persistent storage (fire-and-forget safe). */
export async function appendPersistedMessage(msg: ChatMessage): Promise<void> {
  try {
    await getBackend().append(msg);
  } catch {
    // Storage failure is non-fatal
  }
}

/** Remove oldest messages so at most `max` remain (fire-and-forget safe). */
export async function trimPersistedMessages(max: number): Promise<void> {
  try {
    await getBackend().trim(max);
  } catch {
    // Trim failure is non-fatal
  }
}

/** Delete all persisted messages. */
export async function clearPersistedMessages(): Promise<void> {
  try {
    await getBackend().clear();
  } catch {
    // Clear failure is non-fatal
  }
}

/** Replace persisted messages with the provided ordered history. */
export async function replacePersistedMessages(messages: ChatMessage[]): Promise<void> {
  try {
    const backend = getBackend();
    await backend.clear();
    for (const message of messages) {
      await backend.append(message);
    }
  } catch {
    // Replace failure is non-fatal
  }
}
