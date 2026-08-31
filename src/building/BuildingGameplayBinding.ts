import type { BuildDefinition, WorldBuilding } from "./BuildingTypes";

export interface PreparedBuildingGameplay {
  readonly interactionTargetId?: string;
  activate(): void;
  isActive(): boolean;
  dispose(): void;
}

/** Building 事务可选的窄 Gameplay Component 生命周期，不依赖具体系统。 */
export interface BuildingGameplayBinding {
  prepare(entity: WorldBuilding, definition: BuildDefinition): PreparedBuildingGameplay;
}

export const NO_BUILDING_GAMEPLAY: BuildingGameplayBinding = Object.freeze({
  prepare: () => ({
    activate: () => undefined,
    isActive: () => false,
    dispose: () => undefined,
  }),
});
