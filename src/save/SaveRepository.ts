import type { SaveGameV1 } from "./schema/SaveGameV1";

/** Storage knows only data, never Domain, DOM, or Babylon. Load is always untrusted. */
export interface SaveRepository {
  save(saveId: string, data: SaveGameV1): Promise<void>;
  load(saveId: string): Promise<unknown | undefined>;
  exists(saveId: string): Promise<boolean>;
  delete(saveId: string): Promise<void>;
}
