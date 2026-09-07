import type { PlayerTransform } from "../../player/PlayerTransform";
import type { SimulationPersistenceState } from "../../core/simulation/SimulationPersistenceState";
import type { ItemStack } from "../../inventory/ItemStack";
import type { WorldBuilding } from "../../building/BuildingTypes";
import type { CampfireStatus } from "../../survival/campfire/CampfireTypes";
import type { HotbarSlot } from "../../ui/hotbar/HotbarModel";

export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_SLOT_ID = "slot_1";

export interface SavedBuilding extends WorldBuilding {
  readonly snapPointId: string | null;
}

export interface SaveGameV1 {
  readonly version: typeof SAVE_SCHEMA_VERSION;
  readonly metadata: {
    readonly saveId: typeof SAVE_SLOT_ID;
    readonly scenarioId: string;
    /** Unix milliseconds; preserved when overwriting the slot. */
    readonly createdAt: number;
    readonly updatedAt: number;
  };
  readonly player: PlayerTransform & { readonly thermalReserve: number };
  readonly time: SimulationPersistenceState["time"];
  readonly weather: SimulationPersistenceState["weather"];
  readonly inventory: { readonly slots: readonly (ItemStack | null)[] };
  readonly pickups: readonly { readonly id: string; readonly quantity: number }[];
  readonly buildings: readonly SavedBuilding[];
  readonly campfires: readonly {
    readonly id: string;
    readonly worldBuildingId: string;
    readonly fuelSecondsRemaining: number;
    readonly status: CampfireStatus;
  }[];
  readonly hotbar: { readonly slots: readonly HotbarSlot[]; readonly selectedIndex: number };
}
