import { describe, expect, it } from "vitest";
import itemDefinitionsData from "../data/items/items.json";
import recipeDefinitionsData from "../data/crafting/recipes.json";
import { CraftingService } from "../src/crafting/CraftingService";
import { CRAFTING_INPUT_CONFIG } from "../src/crafting/CraftingConfig";
import { RecipeCatalog } from "../src/crafting/RecipeCatalog";
import { Inventory } from "../src/inventory/Inventory";
import { ItemCatalog } from "../src/items/ItemCatalog";

const items = ItemCatalog.fromUnknown(itemDefinitionsData);
const stoneAxeRecipe = recipeDefinitionsData[0];

describe("Craft Requirement", () => {
  it("Crafting 输入集中配置为 C / 方向键 / Enter", () => {
    expect(CRAFTING_INPUT_CONFIG).toMatchObject({
      toggleKeyCode: "KeyC",
      previousRecipeKeyCode: "ArrowUp",
      nextRecipeKeyCode: "ArrowDown",
      craftKeyCode: "Enter",
    });
  });

  it("材料全部满足时 canCraft 为 true", () => {
    const runtime = createRuntime();
    addAxeMaterials(runtime.inventory);
    expect(runtime.service.evaluate("stone_axe")).toMatchObject({
      canCraft: true,
      reason: "ok",
      stationSatisfied: true,
      outputCapacitySatisfied: true,
    });
  });

  it("缺一种材料时返回准确 Missing Quantity", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("stick", 2);
    runtime.inventory.addItem("stone", 1);
    expect(runtime.service.evaluate("stone_axe")).toMatchObject({
      stationSatisfied: true,
      missingInputs: [{ itemId: "stone", quantity: 1 }],
    });
  });

  it("缺多种材料时全部列出", () => {
    const missing = createRuntime().service.evaluate("stone_axe").missingInputs;
    expect(missing).toEqual([
      { itemId: "stick", quantity: 2 },
      { itemId: "stone", quantity: 2 },
    ]);
  });

  it("材料刚好时可以制作", () => {
    const runtime = createRuntime();
    addAxeMaterials(runtime.inventory);
    expect(runtime.service.getMaxCraftableCount("stone_axe")).toBe(1);
  });

  it("requiredStation 未满足时不可制作", () => {
    const runtime = createRuntime({ ...stoneAxeRecipe, requiredStation: "workbench" });
    addAxeMaterials(runtime.inventory);
    expect(runtime.service.evaluate("stone_axe")).toMatchObject({
      canCraft: false,
      reason: "station_required",
      stationSatisfied: false,
    });
  });

  it("耗时 Recipe 明确返回不支持", () => {
    const runtime = createRuntime({ ...stoneAxeRecipe, craftTimeSeconds: 5 });
    addAxeMaterials(runtime.inventory);
    expect(runtime.service.evaluate("stone_axe").reason)
      .toBe("timed_recipe_not_supported");
  });
});

describe("Atomic Craft Transaction", () => {
  it("成功制作后输入减少且输出增加", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("stick", 5);
    runtime.inventory.addItem("stone", 4);
    expect(runtime.service.craft("stone_axe")).toMatchObject({
      success: true,
      craftedCount: 1,
      reason: "ok",
    });
    expect(runtime.inventory.getItemCount("stick")).toBe(3);
    expect(runtime.inventory.getItemCount("stone")).toBe(2);
    expect(runtime.inventory.getItemCount("stone_axe")).toBe(1);
  });

  it("材料不足时 Inventory 完全不变", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("stick", 2);
    expectFailureIsAtomic(runtime, "missing_materials");
  });

  it("Output Slot 不足时 Inventory 完全不变", () => {
    const recipe = { ...stoneAxeRecipe, inputs: [{ itemId: "stone", quantity: 1 }] };
    const runtime = createRuntime(recipe, 2, 100);
    runtime.inventory.addItem("stone", 2);
    runtime.inventory.addItem("wood", 1);
    expectFailureIsAtomic(runtime, "inventory_capacity");
  });

  it("Output Weight 超限时 Inventory 完全不变", () => {
    const recipe = { ...stoneAxeRecipe, inputs: [{ itemId: "stick", quantity: 1 }] };
    const runtime = createRuntime(recipe, 4, 2);
    runtime.inventory.addItem("stick", 2);
    expectFailureIsAtomic(runtime, "inventory_weight");
  });

  it("Input 消耗释放 Slot 后可以成功", () => {
    const runtime = createRuntime(stoneAxeRecipe, 2, 100);
    addAxeMaterials(runtime.inventory);
    expect(runtime.inventory.getUsedSlots()).toBe(2);
    expect(runtime.service.craft("stone_axe").success).toBe(true);
    expect(runtime.inventory.getUsedSlots()).toBe(1);
  });

  it("Input 消耗释放 Weight 后可以成功", () => {
    const runtime = createRuntime(stoneAxeRecipe, 4, 7);
    addAxeMaterials(runtime.inventory);
    expect(runtime.inventory.getTotalWeight()).toBe(3.5);
    expect(runtime.service.craft("stone_axe").success).toBe(true);
    expect(runtime.inventory.getTotalWeight()).toBe(1.8);
  });

  it("多 Stack Input 能跨 Stack 消耗", () => {
    const recipe = {
      ...stoneAxeRecipe,
      inputs: [{ itemId: "stick", quantity: 32 }],
    };
    const runtime = createRuntime(recipe, 4, 100);
    runtime.inventory.addItem("stick", 35);
    expect(runtime.inventory.getUsedSlots()).toBe(2);
    expect(runtime.service.craft("stone_axe").success).toBe(true);
    expect(runtime.inventory.getItemCount("stick")).toBe(3);
  });

  it("Stackable Output 优先合并已有 Stack", () => {
    const recipe = {
      ...stoneAxeRecipe,
      inputs: [{ itemId: "stone", quantity: 1 }],
      outputs: [{ itemId: "wood", quantity: 2 }],
    };
    const runtime = createRuntime(recipe);
    runtime.inventory.addItem("stone", 1);
    runtime.inventory.addItem("wood", 3);
    expect(runtime.service.craft("stone_axe").success).toBe(true);
    expect(runtime.inventory.getItemCount("wood")).toBe(5);
    expect(runtime.inventory.getUsedSlots()).toBe(1);
  });

  it("不可堆叠 Output 正确占用新 Slot", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("stick", 4);
    runtime.inventory.addItem("stone", 4);
    expect(runtime.service.craft("stone_axe", 2).success).toBe(true);
    expect(runtime.inventory.getItemCount("stone_axe")).toBe(2);
    expect(runtime.inventory.snapshot.slots.filter((stack) => stack?.itemId === "stone_axe"))
      .toHaveLength(2);
  });

  it("Craft Count > 1 时数量正确", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("stick", 6);
    runtime.inventory.addItem("stone", 6);
    const result = runtime.service.craft("stone_axe", 3);
    expect(result).toMatchObject({ success: true, craftedCount: 3 });
    expect(result.consumedInputs).toEqual([
      { itemId: "stick", quantity: 6 },
      { itemId: "stone", quantity: 6 },
    ]);
  });

  it.each([0, -1, 1.5])("Invalid Count 被拒绝且不修改 Inventory：%s", (count) => {
    const runtime = createRuntime();
    addAxeMaterials(runtime.inventory);
    const before = runtime.inventory.snapshot;
    expect(runtime.service.craft("stone_axe", count).reason).toBe("invalid_count");
    expect(runtime.inventory.snapshot).toEqual(before);
  });

  it("Unknown Recipe 被拒绝", () => {
    expect(createRuntime().service.craft("missing")).toMatchObject({
      success: false,
      reason: "unknown_recipe",
    });
  });

  it("最大可制作数量同时受材料与输出 Slot 限制", () => {
    const runtime = createRuntime(stoneAxeRecipe, 4, 100);
    runtime.inventory.addItem("stick", 10);
    runtime.inventory.addItem("stone", 6);
    runtime.inventory.addItem("wood", 1);
    expect(runtime.service.getMaxCraftableCount("stone_axe")).toBe(1);
  });
});

function createRuntime(
  recipe: unknown = stoneAxeRecipe,
  maxSlots = 24,
  maxWeightKilograms = 100,
) {
  const inventory = new Inventory(items, { maxSlots, maxWeightKilograms });
  const recipes = RecipeCatalog.fromUnknown([recipe], items);
  return {
    inventory,
    service: new CraftingService(recipes, items, inventory),
  };
}

function addAxeMaterials(inventory: Inventory): void {
  inventory.addItem("stick", 2);
  inventory.addItem("stone", 2);
}

function expectFailureIsAtomic(
  runtime: ReturnType<typeof createRuntime>,
  reason: "missing_materials" | "inventory_capacity" | "inventory_weight",
): void {
  const before = runtime.inventory.snapshot;
  expect(runtime.service.craft("stone_axe")).toMatchObject({ success: false, reason });
  expect(runtime.inventory.snapshot).toEqual(before);
}
