import type { SaveRepository } from "./SaveRepository";
import type { SaveRuntime } from "./SaveRuntime";
import { SaveSnapshotBuilder } from "./SaveSnapshotBuilder";
import { SaveRestoreCoordinator, RestoreFailure, type ReportRestoreStage } from "./SaveRestoreCoordinator";
import { migrateSave, type SaveValidationResult } from "./schema/migrateSave";
import { SAVE_SLOT_ID } from "./schema/SaveGameV1";

export type SaveResult =
  | { readonly reason: "ok"; readonly warnings: readonly string[] }
  | { readonly reason: Exclude<SaveValidationResult["reason"], "ok"> | "not_found" | "storage_error" | "restore_failed" | "busy" | "invalid_state"; readonly recoveryRequired?: boolean };

/** Serializes operations and keeps repository errors separate from schema and restore errors. */
export class SaveService {
  #busy = false;
  constructor(
    private readonly repository: SaveRepository,
    private readonly runtime: SaveRuntime,
    private readonly access: { canSave(): boolean; canLoad(): boolean },
    private readonly now: () => number = Date.now,
  ) {}

  async hasSave(): Promise<{ reason: "ok"; exists: boolean } | { reason: "storage_error" }> {
    try { return { reason: "ok", exists: await this.repository.exists(SAVE_SLOT_ID) }; }
    catch { return { reason: "storage_error" }; }
  }

  async save(): Promise<SaveResult> {
    if (this.#busy) return { reason: "busy" };
    if (!this.access.canSave()) return { reason: "invalid_state" };
    this.#busy = true;
    this.runtime.simulation.setPaused(true);
    try {
      let previous: unknown;
      try { previous = await this.repository.load(SAVE_SLOT_ID); }
      catch { return { reason: "storage_error" }; }
      const old = previous === undefined ? undefined : migrateSave(previous, this.runtime.gameplay);
      // Never silently downgrade a save made by a newer game version.
      if (old?.reason === "unsupported_future_version") return old;
      const timestamp = this.now();
      const createdAt = old?.reason === "ok" ? old.data.metadata.createdAt : timestamp;
      const candidate = migrateSave(new SaveSnapshotBuilder(this.runtime).capture(Math.max(timestamp, createdAt), createdAt), this.runtime.gameplay);
      if (candidate.reason !== "ok") return candidate;
      try { await this.repository.save(SAVE_SLOT_ID, candidate.data); }
      catch { return { reason: "storage_error" }; }
      return { reason: "ok", warnings: candidate.warnings };
    } finally { this.#busy = false; }
  }

  async load(stage: ReportRestoreStage = () => undefined): Promise<SaveResult> {
    if (this.#busy) return { reason: "busy" };
    if (!this.access.canLoad()) return { reason: "invalid_state" };
    this.#busy = true;
    this.runtime.simulation.setPaused(true);
    try {
      await stage("读取存档");
      let raw: unknown;
      try { raw = await this.repository.load(SAVE_SLOT_ID); }
      catch { return { reason: "storage_error" }; }
      if (raw === undefined) return { reason: "not_found" };
      await stage("验证版本");
      const validated = migrateSave(raw, this.runtime.gameplay);
      if (validated.reason !== "ok") return validated;
      try { await new SaveRestoreCoordinator(this.runtime).restore(validated.data, stage); }
      catch (error) { return { reason: "restore_failed", recoveryRequired: error instanceof RestoreFailure && error.recoveryRequired }; }
      return { reason: "ok", warnings: validated.warnings };
    } finally { this.#busy = false; }
  }
}
