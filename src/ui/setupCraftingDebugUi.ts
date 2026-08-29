import { CRAFTING_INPUT_CONFIG } from "../crafting/CraftingConfig";
import type { CraftingService } from "../crafting/CraftingService";
import type { CraftResult } from "../crafting/CraftingTypes";
import type { RecipeCatalog } from "../crafting/RecipeCatalog";
import type { ItemCatalog } from "../items/ItemCatalog";

export interface CraftingDebugUi {
  isOpen(): boolean;
  refresh(): void;
  dispose(): void;
}

interface CraftingDebugUiCallbacks {
  readonly onInventoryChanged: () => void;
}

/** 键盘式 Debug Crafting UI；所有规则均读取 CraftingService 结果。 */
export function setupCraftingDebugUi(
  canvas: HTMLCanvasElement,
  service: CraftingService,
  recipes: RecipeCatalog,
  items: ItemCatalog,
  callbacks: CraftingDebugUiCallbacks,
): CraftingDebugUi {
  const panel = getElement("crafting-panel");
  const inventoryPanel = getElement("inventory-panel");
  const recipePosition = getElement("crafting-recipe-position");
  const recipeName = getElement("crafting-recipe-name");
  const recipeDescription = getElement("crafting-recipe-description");
  const requirements = getElement<HTMLUListElement>("crafting-requirements");
  const output = getElement("crafting-output");
  const status = getElement("crafting-status");
  const feedback = getElement("crafting-feedback");
  const recipeList = recipes.getAll();
  let selectedIndex = 0;

  const render = (): void => {
    const recipe = recipeList[selectedIndex];
    if (!recipe) return;
    const evaluation = service.evaluate(recipe.id);
    recipePosition.textContent = `${selectedIndex + 1} / ${recipeList.length}`;
    recipeName.textContent = recipe.displayName;
    recipeDescription.textContent = recipe.description;
    requirements.replaceChildren(...evaluation.requiredInputs.map((input) => {
      const row = document.createElement("li");
      const name = document.createElement("span");
      const count = document.createElement("strong");
      name.textContent = items.get(input.itemId).displayName;
      count.textContent = `${input.quantity} / ${input.availableQuantity}`;
      count.dataset.satisfied = input.missingQuantity === 0 ? "true" : "false";
      row.append(name, count);
      return row;
    }));
    output.textContent = recipe.outputs
      .map((entry) => `${items.get(entry.itemId).displayName} ×${entry.quantity}`)
      .join("、");
    status.textContent = formatRequirementStatus(evaluation, items);
    status.dataset.available = evaluation.canCraft ? "true" : "false";
  };

  const toggle = (): void => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      inventoryPanel.hidden = true;
      feedback.hidden = true;
      render();
    }
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (document.pointerLockElement !== canvas || event.repeat) return;
    if (event.code === CRAFTING_INPUT_CONFIG.toggleKeyCode) {
      event.preventDefault();
      toggle();
      return;
    }
    if (panel.hidden) return;
    if (event.code === CRAFTING_INPUT_CONFIG.closeKeyCode) {
      panel.hidden = true;
      return;
    }
    if (
      event.code === CRAFTING_INPUT_CONFIG.previousRecipeKeyCode
      || event.code === CRAFTING_INPUT_CONFIG.nextRecipeKeyCode
    ) {
      event.preventDefault();
      const direction = event.code === CRAFTING_INPUT_CONFIG.nextRecipeKeyCode ? 1 : -1;
      selectedIndex = (selectedIndex + direction + recipeList.length) % recipeList.length;
      feedback.hidden = true;
      render();
      return;
    }
    if (event.code === CRAFTING_INPUT_CONFIG.craftKeyCode) {
      event.preventDefault();
      const recipe = recipeList[selectedIndex];
      if (!recipe) return;
      const result = service.craft(recipe.id);
      feedback.textContent = formatCraftResult(result, recipes, items);
      feedback.dataset.tone = result.success ? "success" : "warning";
      feedback.hidden = false;
      if (result.success) callbacks.onInventoryChanged();
      render();
    }
  };

  const handlePointerLockChange = (): void => {
    if (document.pointerLockElement !== canvas) panel.hidden = true;
  };

  window.addEventListener("keydown", handleKeyDown);
  document.addEventListener("pointerlockchange", handlePointerLockChange);

  return {
    isOpen: () => !panel.hidden,
    refresh(): void {
      if (!panel.hidden) render();
    },
    dispose(): void {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    },
  };
}

function formatRequirementStatus(
  result: ReturnType<CraftingService["evaluate"]>,
  items: ItemCatalog,
): string {
  if (result.canCraft) return "可以制作";
  if (result.reason === "missing_materials") {
    return `缺少 ${result.missingInputs
      .map((entry) => `${items.get(entry.itemId).displayName} ×${entry.quantity}`)
      .join("、")}`;
  }
  if (result.reason === "inventory_capacity") return "背包空间不足";
  if (result.reason === "inventory_weight") return "制作后将超过负重";
  if (result.reason === "station_required") return "缺少所需工作站";
  if (result.reason === "timed_recipe_not_supported") return "暂不支持耗时制作";
  return "当前无法制作";
}

function formatCraftResult(
  result: CraftResult,
  recipes: RecipeCatalog,
  items: ItemCatalog,
): string {
  if (result.success) {
    return `制作完成：${result.producedOutputs
      .map((entry) => `${items.get(entry.itemId).displayName} ×${entry.quantity}`)
      .join("、")}`;
  }
  if (result.reason === "missing_materials") return "制作失败：缺少材料";
  if (result.reason === "inventory_capacity") return "制作失败：背包空间不足";
  if (result.reason === "inventory_weight") return "制作失败：超过负重";
  if (result.reason === "station_required") return "制作失败：缺少工作站";
  if (result.reason === "timed_recipe_not_supported") return "制作失败：暂不支持耗时配方";
  return recipes.has(result.recipeId) ? "制作失败" : "制作失败：未知配方";
}

function getElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`缺少必需的界面元素：#${id}`);
  return element as T;
}
