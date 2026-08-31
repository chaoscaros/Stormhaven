import type {
  BuildingGameplayBinding,
  PreparedBuildingGameplay,
} from "../../building/BuildingGameplayBinding";
import type { BuildDefinition, WorldBuilding } from "../../building/BuildingTypes";
import type { CampfireSystem } from "./CampfireSystem";

/** 将带 campfire tag 的 WorldBuilding 绑定到 Campfire Gameplay Component。 */
export class CampfireBuildingBinding implements BuildingGameplayBinding {
  constructor(private readonly campfires: CampfireSystem) {}

  prepare(entity: WorldBuilding, definition: BuildDefinition): PreparedBuildingGameplay {
    if (!definition.tags.includes("campfire")) {
      return {
        activate: () => undefined,
        isActive: () => false,
        dispose: () => undefined,
      };
    }
    let activated = false;
    return {
      interactionTargetId: `interaction:campfire_${entity.id}`,
      activate: (): void => {
        if (activated) return;
        this.campfires.register(entity.id, entity.position);
        activated = true;
      },
      isActive: (): boolean => this.campfires.getByWorldBuildingId(entity.id)?.isLit ?? false,
      dispose: (): void => {
        this.campfires.removeByWorldBuildingId(entity.id);
        activated = false;
      },
    };
  }
}
