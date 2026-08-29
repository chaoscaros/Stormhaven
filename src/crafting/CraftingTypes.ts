import type { InventorySnapshot } from "../inventory/Inventory";
import type { RecipeItemQuantity } from "./RecipeDefinition";

export type CraftFailureReason =
  | "missing_materials"
  | "inventory_capacity"
  | "inventory_weight"
  | "station_required"
  | "timed_recipe_not_supported"
  | "unknown_recipe"
  | "invalid_count";

export interface CraftInputAvailability extends RecipeItemQuantity {
  readonly availableQuantity: number;
  readonly missingQuantity: number;
}

export interface CraftRequirementResult {
  readonly canCraft: boolean;
  readonly recipeId: string;
  readonly craftCount: number;
  readonly requiredInputs: readonly CraftInputAvailability[];
  readonly missingInputs: readonly RecipeItemQuantity[];
  readonly requiredStation: string;
  readonly stationSatisfied: boolean;
  readonly outputCapacitySatisfied: boolean;
  readonly reason: "ok" | CraftFailureReason;
}

export interface CraftingPlan extends CraftRequirementResult {
  readonly inputsToConsume: readonly RecipeItemQuantity[];
  readonly outputsToAdd: readonly RecipeItemQuantity[];
  readonly canCommit: boolean;
  readonly finalInventory?: InventorySnapshot;
}

export interface CraftResult {
  readonly success: boolean;
  readonly recipeId: string;
  readonly craftedCount: number;
  readonly consumedInputs: readonly RecipeItemQuantity[];
  readonly producedOutputs: readonly RecipeItemQuantity[];
  readonly reason: "ok" | CraftFailureReason;
}
