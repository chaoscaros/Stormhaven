import type { SpatialPoint } from "../environment/SpatialPoint";

export type CampfireStatus = "unlit" | "burning" | "out_of_fuel";

export interface CampfireState {
  readonly id: string;
  readonly worldBuildingId: string;
  readonly position: SpatialPoint;
  readonly status: CampfireStatus;
  readonly fuelSecondsRemaining: number;
  readonly fuelCapacitySeconds: number;
  readonly isLit: boolean;
}

export interface CampfireConfig {
  readonly fuelCapacitySeconds: number;
  readonly heatSourceProfileId: string;
}

export type FuelTransactionReason =
  | "ok"
  | "no_fuel_item"
  | "fuel_full"
  | "invalid_item"
  | "unknown_campfire";

export interface FuelTransactionResult {
  readonly success: boolean;
  readonly campfireId: string;
  readonly itemId: string;
  readonly consumedQuantity: number;
  readonly addedFuelSeconds: number;
  readonly remainingFuelSeconds: number;
  readonly reason: FuelTransactionReason;
}

export type CampfireActionReason =
  | "ok"
  | "unknown_campfire"
  | "no_fuel"
  | "already_lit"
  | "already_unlit";

export interface CampfireActionResult {
  readonly success: boolean;
  readonly campfireId: string;
  readonly reason: CampfireActionReason;
}
