import type { Inventory } from "../inventory/Inventory";
import type { BuildCatalog } from "./BuildCatalog";
import type {
  BuildFailureReason,
  BuildPlacement,
  BuildRequirement,
  BuildResult,
  BuildTransactionPlan,
  BuildingVector3,
  WorldBuilding,
} from "./BuildingTypes";
import type { PlacementValidator } from "./PlacementValidator";
import type { WorldBuildingRegistry } from "./WorldBuildingRegistry";

export interface PreparedBuildingPresentation {
  activate(): void;
  dispose(): void;
}

export interface BuildingPresentationFactory {
  prepare(entity: WorldBuilding): PreparedBuildingPresentation;
}

export interface BuildRequest {
  readonly definitionId: string;
  readonly playerPosition: BuildingVector3;
  readonly placement: BuildPlacement;
}

/** Inventory Materials → World Building 的同步原子事务服务。 */
export class BuildService {
  #nextEntityNumber = 1;

  constructor(
    private readonly definitions: BuildCatalog,
    private readonly inventory: Inventory,
    private readonly registry: WorldBuildingRegistry,
    private readonly validator: PlacementValidator,
  ) {}

  evaluateCost(definitionId: string): readonly BuildRequirement[] {
    if (!this.definitions.has(definitionId)) return Object.freeze([]);
    return Object.freeze(this.definitions.get(definitionId).cost.map((cost) => {
      const availableQuantity = this.inventory.getItemCount(cost.itemId);
      return Object.freeze({
        ...cost,
        availableQuantity,
        missingQuantity: Math.max(0, cost.quantity - availableQuantity),
      });
    }));
  }

  plan(request: BuildRequest): BuildTransactionPlan {
    if (!this.definitions.has(request.definitionId)) {
      return failurePlan(request.definitionId, "unknown_definition");
    }
    const definition = this.definitions.get(request.definitionId);
    const requirements = this.evaluateCost(definition.id);
    if (requirements.some((entry) => entry.missingQuantity > 0)) {
      return failurePlan(definition.id, "not_enough_resources", requirements);
    }
    const placement = this.validator.validate(definition, {
      playerPosition: request.playerPosition,
      candidate: request.placement,
    });
    if (!placement.valid || !placement.placement || !placement.bounds) {
      return failurePlan(definition.id, mapPlacementReason(placement.reason), requirements);
    }
    const draft = this.inventory.clone();
    for (const cost of definition.cost) {
      if (draft.removeItem(cost.itemId, cost.quantity) !== cost.quantity) {
        throw new Error("Building Plan 的材料检查与草稿消耗不一致。");
      }
    }
    return Object.freeze({
      canCommit: true,
      definitionId: definition.id,
      requirements,
      consumedResources: definition.cost,
      placement: placement.placement,
      bounds: placement.bounds,
      finalInventory: draft.snapshot,
      reason: "ok",
    });
  }

  place(request: BuildRequest, presentation: BuildingPresentationFactory): BuildResult {
    const plan = this.plan(request);
    if (!plan.canCommit || !plan.finalInventory || !plan.placement) {
      return Object.freeze({
        success: false,
        buildDefinitionId: request.definitionId,
        consumedResources: Object.freeze([]),
        reason: plan.reason,
      });
    }
    const definition = this.definitions.get(request.definitionId);
    const entity = Object.freeze({
      id: `building_${String(this.#nextEntityNumber).padStart(6, "0")}`,
      definitionId: definition.id,
      position: plan.placement.position,
      rotationDegrees: plan.placement.rotationDegrees,
    });
    let candidate: PreparedBuildingPresentation;
    try {
      this.registry.assertCanRegister(entity, plan.placement.snapPointId);
      candidate = presentation.prepare(entity);
    } catch {
      return Object.freeze({
        success: false,
        buildDefinitionId: definition.id,
        consumedResources: Object.freeze([]),
        reason: "presentation_failed",
      });
    }
    const inventoryBefore = this.inventory.snapshot;
    let registered = false;
    try {
      this.inventory.replaceWithSnapshot(plan.finalInventory);
      this.registry.register(entity, definition, plan.placement.snapPointId);
      registered = true;
      candidate.activate();
      this.#nextEntityNumber += 1;
    } catch {
      if (registered) this.registry.unregister(entity.id);
      this.inventory.replaceWithSnapshot(inventoryBefore);
      candidate.dispose();
      return Object.freeze({
        success: false,
        buildDefinitionId: definition.id,
        consumedResources: Object.freeze([]),
        reason: "presentation_failed",
      });
    }
    return Object.freeze({
      success: true,
      buildDefinitionId: definition.id,
      buildingEntityId: entity.id,
      consumedResources: definition.cost,
      position: entity.position,
      rotationDegrees: entity.rotationDegrees,
      reason: "ok",
    });
  }
}

function failurePlan(
  definitionId: string,
  reason: BuildFailureReason,
  requirements: readonly BuildRequirement[] = Object.freeze([]),
): BuildTransactionPlan {
  return Object.freeze({
    canCommit: false,
    definitionId,
    requirements,
    consumedResources: Object.freeze([]),
    reason,
  });
}

function mapPlacementReason(reason: string): BuildFailureReason {
  if (reason === "ok") return "invalid_position";
  if (
    reason === "blocked"
    || reason === "unsupported"
    || reason === "snap_required"
    || reason === "snap_occupied"
    || reason === "out_of_range"
    || reason === "blocked_by_player"
    || reason === "invalid_surface"
  ) return reason;
  return "invalid_position";
}
