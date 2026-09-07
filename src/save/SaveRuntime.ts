import type { FirstBlizzardGameplayFoundation } from "../core/gameplay/createFirstBlizzardGameplayFoundation";
import type { GameSimulation } from "../core/simulation/GameSimulation";
import type { PlayerTransformPort } from "../player/PlayerTransform";
import type { HotbarModel } from "../ui/hotbar/HotbarModel";
import type { WorldBuilding } from "../building/BuildingTypes";

/** Snapshot/restore depends on ports, never on Scene, meshes, or browser storage. */
export interface SaveRuntime {
  readonly gameplay: FirstBlizzardGameplayFoundation;
  readonly simulation: GameSimulation;
  readonly hotbar: HotbarModel;
  readonly player: PlayerTransformPort;
  readonly presentation: {
    clearBuildings(): void;
    restoreBuildings(buildings: readonly WorldBuilding[]): void;
    restorePickups(): void;
    refresh(): void;
  };
}
