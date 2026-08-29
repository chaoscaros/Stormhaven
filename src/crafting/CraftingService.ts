import type { Inventory } from "../inventory/Inventory";
import type { ItemCatalog } from "../items/ItemCatalog";
import { HAND_CRAFTING_STATION_ID } from "./CraftingConfig";
import type { RecipeCatalog } from "./RecipeCatalog";
import type { RecipeDefinition, RecipeItemQuantity } from "./RecipeDefinition";
import type {
  CraftFailureReason,
  CraftInputAvailability,
  CraftRequirementResult,
  CraftResult,
  CraftingPlan,
} from "./CraftingTypes";

const DEFAULT_STATIONS = Object.freeze([HAND_CRAFTING_STATION_ID]);

/** Recipe + Inventory 的纯同步制作服务；所有真实写入只发生在成功 Plan 的最终 Commit。 */
export class CraftingService {
  constructor(
    private readonly recipes: RecipeCatalog,
    private readonly items: ItemCatalog,
    private readonly inventory: Inventory,
  ) {}

  evaluate(
    recipeId: string,
    craftCount = 1,
    availableStationIds: readonly string[] = DEFAULT_STATIONS,
  ): CraftRequirementResult {
    const plan = this.plan(recipeId, craftCount, availableStationIds);
    return Object.freeze({
      canCraft: plan.canCraft,
      recipeId: plan.recipeId,
      craftCount: plan.craftCount,
      requiredInputs: plan.requiredInputs,
      missingInputs: plan.missingInputs,
      requiredStation: plan.requiredStation,
      stationSatisfied: plan.stationSatisfied,
      outputCapacitySatisfied: plan.outputCapacitySatisfied,
      reason: plan.reason,
    });
  }

  plan(
    recipeId: string,
    craftCount = 1,
    availableStationIds: readonly string[] = DEFAULT_STATIONS,
  ): CraftingPlan {
    if (!Number.isInteger(craftCount) || craftCount <= 0) {
      return failurePlan(recipeId, craftCount, "invalid_count");
    }
    if (!this.recipes.has(recipeId)) {
      return failurePlan(recipeId, craftCount, "unknown_recipe");
    }

    const recipe = this.recipes.get(recipeId);
    const requiredInputs = Object.freeze(recipe.inputs.map((input) => {
      const requiredQuantity = input.quantity * craftCount;
      const availableQuantity = this.inventory.getItemCount(input.itemId);
      return Object.freeze({
        itemId: input.itemId,
        quantity: requiredQuantity,
        availableQuantity,
        missingQuantity: Math.max(0, requiredQuantity - availableQuantity),
      });
    }));
    const missingInputs = Object.freeze(requiredInputs
      .filter((input) => input.missingQuantity > 0)
      .map((input) => Object.freeze({
        itemId: input.itemId,
        quantity: input.missingQuantity,
      })));
    const stationSatisfied = availableStationIds.includes(recipe.requiredStation);
    const inputsToConsume = multiplyQuantities(recipe.inputs, craftCount);
    const outputsToAdd = multiplyQuantities(recipe.outputs, craftCount);

    if (missingInputs.length > 0) {
      return createPlan(recipe, craftCount, requiredInputs, missingInputs, stationSatisfied,
        "missing_materials", inputsToConsume, outputsToAdd);
    }
    if (!stationSatisfied) {
      return createPlan(recipe, craftCount, requiredInputs, missingInputs, false,
        "station_required", inputsToConsume, outputsToAdd, false);
    }
    if (recipe.craftTimeSeconds > 0) {
      return createPlan(recipe, craftCount, requiredInputs, missingInputs, true,
        "timed_recipe_not_supported", inputsToConsume, outputsToAdd);
    }

    const draft = this.inventory.clone();
    for (const input of inputsToConsume) {
      const removed = draft.removeItem(input.itemId, input.quantity);
      if (removed !== input.quantity) {
        throw new Error("Crafting Plan 的材料检查与草稿消耗不一致。");
      }
    }
    for (const output of outputsToAdd) {
      const added = draft.addItem(output.itemId, output.quantity);
      if (added.acceptedQuantity !== output.quantity) {
        const reason = this.#classifyOutputFailure(draft, output, added.remainingQuantity);
        return createPlan(recipe, craftCount, requiredInputs, missingInputs, true,
          reason, inputsToConsume, outputsToAdd);
      }
    }

    return Object.freeze({
      canCraft: true,
      canCommit: true,
      recipeId,
      craftCount,
      requiredInputs,
      missingInputs,
      requiredStation: recipe.requiredStation,
      stationSatisfied: true,
      outputCapacitySatisfied: true,
      reason: "ok",
      inputsToConsume,
      outputsToAdd,
      finalInventory: draft.snapshot,
    });
  }

  craft(
    recipeId: string,
    craftCount = 1,
    availableStationIds: readonly string[] = DEFAULT_STATIONS,
  ): CraftResult {
    const plan = this.plan(recipeId, craftCount, availableStationIds);
    if (!plan.canCommit || !plan.finalInventory) {
      return Object.freeze({
        success: false,
        recipeId,
        craftedCount: 0,
        consumedInputs: Object.freeze([]),
        producedOutputs: Object.freeze([]),
        reason: plan.reason === "ok" ? "inventory_capacity" : plan.reason,
      });
    }
    this.inventory.replaceWithSnapshot(plan.finalInventory);
    return Object.freeze({
      success: true,
      recipeId,
      craftedCount: craftCount,
      consumedInputs: plan.inputsToConsume,
      producedOutputs: plan.outputsToAdd,
      reason: "ok",
    });
  }

  getMaxCraftableCount(
    recipeId: string,
    availableStationIds: readonly string[] = DEFAULT_STATIONS,
  ): number {
    if (!this.recipes.has(recipeId)) return 0;
    const recipe = this.recipes.get(recipeId);
    const materialLimit = Math.min(...recipe.inputs.map((input) =>
      Math.floor(this.inventory.getItemCount(input.itemId) / input.quantity)));
    let maximum = 0;
    for (let count = 1; count <= materialLimit; count += 1) {
      if (this.plan(recipeId, count, availableStationIds).canCommit) maximum = count;
    }
    return maximum;
  }

  #classifyOutputFailure(
    draft: Inventory,
    output: RecipeItemQuantity,
    remainingQuantity: number,
  ): "inventory_capacity" | "inventory_weight" {
    const remainingWeight = output.quantity === 0
      ? 0
      : this.items.get(output.itemId).weight * remainingQuantity;
    const availableWeight = draft.snapshot.maxWeightKilograms - draft.getTotalWeight();
    return remainingWeight > availableWeight + Number.EPSILON
      ? "inventory_weight"
      : "inventory_capacity";
  }
}

function multiplyQuantities(
  quantities: readonly RecipeItemQuantity[],
  count: number,
): readonly RecipeItemQuantity[] {
  return Object.freeze(quantities.map((entry) => Object.freeze({
    itemId: entry.itemId,
    quantity: entry.quantity * count,
  })));
}

function failurePlan(
  recipeId: string,
  craftCount: number,
  reason: "unknown_recipe" | "invalid_count",
): CraftingPlan {
  return Object.freeze({
    canCraft: false,
    canCommit: false,
    recipeId,
    craftCount,
    requiredInputs: Object.freeze([]),
    missingInputs: Object.freeze([]),
    requiredStation: "",
    stationSatisfied: false,
    outputCapacitySatisfied: false,
    reason,
    inputsToConsume: Object.freeze([]),
    outputsToAdd: Object.freeze([]),
  });
}

function createPlan(
  recipe: RecipeDefinition,
  craftCount: number,
  requiredInputs: readonly CraftInputAvailability[],
  missingInputs: readonly RecipeItemQuantity[],
  stationSatisfied: boolean,
  reason: CraftFailureReason,
  inputsToConsume: readonly RecipeItemQuantity[],
  outputsToAdd: readonly RecipeItemQuantity[],
  outputCapacitySatisfied = reason !== "inventory_capacity" && reason !== "inventory_weight",
): CraftingPlan {
  return Object.freeze({
    canCraft: false,
    canCommit: false,
    recipeId: recipe.id,
    craftCount,
    requiredInputs,
    missingInputs,
    requiredStation: recipe.requiredStation,
    stationSatisfied,
    outputCapacitySatisfied,
    reason,
    inputsToConsume,
    outputsToAdd,
  });
}
