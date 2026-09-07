import type { FirstBlizzardGameplayFoundation } from "../../core/gameplay/createFirstBlizzardGameplayFoundation";
import { SAVE_SCHEMA_VERSION, type SaveGameV1 } from "./SaveGameV1";
import { validateSaveGame } from "./validateSaveGame";

export type SaveValidationResult =
  | { readonly reason: "ok"; readonly data: SaveGameV1; readonly warnings: readonly string[] }
  | { readonly reason: "validation_failed" | "unsupported_version" | "unsupported_future_version" };

/** V1 only. Add explicit sequential migrations here when a real second schema exists. */
export function migrateSave(raw: unknown, gameplay: FirstBlizzardGameplayFoundation): SaveValidationResult {
  if (typeof raw !== "object" || raw === null || !("version" in raw) || !Number.isSafeInteger(raw.version)) {
    return { reason: "validation_failed" };
  }
  if (typeof raw.version === "number" && raw.version > SAVE_SCHEMA_VERSION) return { reason: "unsupported_future_version" };
  if (raw.version !== SAVE_SCHEMA_VERSION) return { reason: "unsupported_version" };
  try { return { reason: "ok", ...validateSaveGame(raw, gameplay) }; }
  catch { return { reason: "validation_failed" }; }
}
