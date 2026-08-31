import type { InventorySnapshot } from "../inventory/Inventory";

export interface BuildingVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface BuildingBounds {
  readonly min: BuildingVector3;
  readonly max: BuildingVector3;
}

export interface BuildCost {
  readonly itemId: string;
  readonly quantity: number;
}

export type BuildCategory = "foundation" | "wall";
export type BuildSnapType = "grid" | "foundation_edge";

export interface BuildDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly category: BuildCategory;
  readonly cost: readonly BuildCost[];
  readonly size: BuildingVector3;
  readonly snapType: BuildSnapType;
  readonly rotationStep: number;
  readonly collision: boolean;
  readonly tags: readonly string[];
}

export interface WorldBuilding {
  readonly id: string;
  readonly definitionId: string;
  readonly position: BuildingVector3;
  readonly rotationDegrees: number;
}

export type SnapPointType = "wall";

export interface SnapPoint {
  readonly id: string;
  readonly ownerBuildingId: string;
  readonly type: SnapPointType;
  readonly position: BuildingVector3;
  readonly rotationDegrees: number;
  readonly occupied: boolean;
}

export type PlacementSurface = "ground" | "building" | "none";

export interface BuildPlacement {
  readonly position: BuildingVector3;
  readonly rotationDegrees: number;
  readonly surface: PlacementSurface;
  readonly snapPointId?: string;
}

export type PlacementFailureReason =
  | "ok"
  | "blocked"
  | "unsupported"
  | "snap_required"
  | "snap_occupied"
  | "out_of_range"
  | "invalid_surface";

export interface PlacementValidationResult {
  readonly valid: boolean;
  readonly reason: PlacementFailureReason;
  readonly bounds?: BuildingBounds;
  readonly placement?: BuildPlacement;
}

export interface BuildRequirement {
  readonly itemId: string;
  readonly quantity: number;
  readonly availableQuantity: number;
  readonly missingQuantity: number;
}

export type BuildFailureReason =
  | "ok"
  | "unknown_definition"
  | "not_enough_resources"
  | "invalid_position"
  | "blocked"
  | "unsupported"
  | "snap_required"
  | "snap_occupied"
  | "out_of_range"
  | "invalid_surface"
  | "presentation_failed";

export interface BuildTransactionPlan {
  readonly canCommit: boolean;
  readonly definitionId: string;
  readonly requirements: readonly BuildRequirement[];
  readonly consumedResources: readonly BuildCost[];
  readonly placement?: BuildPlacement;
  readonly bounds?: BuildingBounds;
  readonly finalInventory?: InventorySnapshot;
  readonly reason: BuildFailureReason;
}

export interface BuildResult {
  readonly success: boolean;
  readonly buildDefinitionId: string;
  readonly buildingEntityId?: string;
  readonly consumedResources: readonly BuildCost[];
  readonly position?: BuildingVector3;
  readonly rotationDegrees?: number;
  readonly reason: BuildFailureReason;
}
