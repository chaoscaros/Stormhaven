import { describe, expect, it } from "vitest";
import { IndexedDbSaveRepository } from "../src/save/IndexedDbSaveRepository";
import { SaveSnapshotBuilder } from "../src/save/SaveSnapshotBuilder";
import { createSaveFixture } from "./helpers/saveFixture";

describe("IndexedDB adapter transaction contract (injected storage boundary)", () => {
  it("does not report a save before transaction completion; aborted overwrite preserves the old slot", async () => {
    const storage = createStorageBoundary();
    const repository = new IndexedDbSaveRepository(storage.factory);
    const original = new SaveSnapshotBuilder(createSaveFixture().runtime).capture(1000);
    expect(await repository.exists("slot_1")).toBe(false);
    await repository.save("slot_1", original);
    expect(await repository.exists("slot_1")).toBe(true);
    expect(await repository.load("slot_1")).toEqual(original);
    let release: () => void = () => undefined;
    storage.writeGate = new Promise<void>((resolve) => { release = resolve; });
    let settled = false;
    const next = { ...original, metadata: { ...original.metadata, updatedAt: 2000 } };
    const overwrite = repository.save("slot_1", next).then(() => { settled = true; });
    await storage.requestSucceeded();
    expect(settled).toBe(false);
    storage.abortWrite = true;
    const rejected = expect(overwrite).rejects.toThrow("quota");
    release();
    await rejected;
    expect(await repository.load("slot_1")).toEqual(original);
    storage.abortWrite = false;
    await repository.save("slot_1", next);
    expect(await repository.load("slot_1")).toEqual(next);
    await repository.delete("slot_1");
    expect(await repository.exists("slot_1")).toBe(false);
  });
});

/** Small IDB event boundary, not a browser emulator. Real browser persistence remains manual QA. */
function createStorageBoundary() {
  const records = new Map<string, unknown>();
  let notifySuccess: () => void = () => undefined;
  const state = {
    abortWrite: false,
    writeGate: Promise.resolve(),
    requestSucceeded: () => new Promise<void>((resolve) => { notifySuccess = resolve; }),
    factory: undefined as unknown as IDBFactory,
  };
  type Callback = (() => void) | null;
  state.factory = {
    open: () => {
      const request = { onsuccess: null as Callback, onerror: null as Callback, onblocked: null as Callback, onupgradeneeded: null as Callback, result: {
        close: () => undefined,
        transaction: (_name: string, mode: string) => {
          const transaction = {
            oncomplete: null as Callback, onabort: null as Callback, onerror: null as Callback,
            error: new Error("quota"),
            abort: () => transaction.onabort?.(),
            objectStore: () => {
              const operation = (result: unknown, commit: () => void = () => undefined) => {
                const request = { result, onsuccess: null as Callback };
                queueMicrotask(() => {
                  request.onsuccess?.();
                  if (mode === "readwrite") notifySuccess();
                  void (mode === "readwrite" ? state.writeGate : Promise.resolve()).then(() => {
                    if (mode === "readwrite" && state.abortWrite) transaction.onabort?.();
                    else { commit(); transaction.oncomplete?.(); }
                  });
                });
                return request;
              };
              return {
                get: (key: string) => operation(structuredClone(records.get(key))),
                count: (key: string) => operation(records.has(key) ? 1 : 0),
                put: (value: unknown, key: string) => operation(key, () => { records.set(key, structuredClone(value)); }),
                delete: (key: string) => operation(undefined, () => { records.delete(key); }),
              };
            },
          };
          return transaction;
        },
      } };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  } as unknown as IDBFactory;
  return state;
}
