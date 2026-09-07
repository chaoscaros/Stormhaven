import type { SaveGameV1 } from "./schema/SaveGameV1";
import type { SaveRepository } from "./SaveRepository";

export const SAVE_DATABASE_NAME = "stormhaven";
/** IndexedDB structure version, independent of SaveGame schema version. */
export const SAVE_DATABASE_VERSION = 1;
const STORE = "saves";

export class IndexedDbSaveRepository implements SaveRepository {
  constructor(private readonly factory: IDBFactory | undefined = globalThis.indexedDB) {}

  save(saveId: string, data: SaveGameV1): Promise<void> {
    if (data.metadata.saveId !== saveId) return Promise.reject(new Error("Save key mismatch"));
    // One put in one transaction: an aborted overwrite leaves the old record intact.
    return this.#transaction("readwrite", (store) => store.put(data, saveId)).then(() => undefined);
  }

  load(saveId: string): Promise<unknown> {
    return this.#transaction("readonly", (store) => store.get(saveId));
  }

  async exists(saveId: string): Promise<boolean> {
    return await this.#transaction("readonly", (store) => store.count(saveId)) !== 0;
  }

  delete(saveId: string): Promise<void> {
    return this.#transaction("readwrite", (store) => store.delete(saveId)).then(() => undefined);
  }

  async #transaction(mode: IDBTransactionMode, request: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
    const database = await this.#open();
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const transaction = database.transaction(STORE, mode);
        let result: unknown;
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(transaction.error ?? new Error("Save transaction aborted"));
        transaction.onerror = () => { /* Default IndexedDB error propagation aborts the transaction. */ };
        try {
          const operation = request(transaction.objectStore(STORE));
          operation.onsuccess = () => { result = operation.result; };
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      });
    } finally { database.close(); }
  }

  #open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!this.factory) { reject(new Error("IndexedDB unavailable")); return; }
      const request = this.factory.open(SAVE_DATABASE_NAME, SAVE_DATABASE_VERSION);
      let abandoned = false;
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
      request.onblocked = () => {
        abandoned = true;
        reject(new Error("IndexedDB upgrade blocked; close other game tabs"));
      };
      request.onsuccess = () => {
        if (abandoned) { request.result.close(); return; }
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
  }
}
