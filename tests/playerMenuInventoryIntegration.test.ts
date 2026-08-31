import { describe, expect, it } from "vitest";
import itemDefinitionsData from "../data/items/items.json";
import recipeDefinitionsData from "../data/crafting/recipes.json";
import buildingDefinitionsData from "../data/building/buildings.json";
import { BuildCatalog } from "../src/building/BuildCatalog";
import { BuildService, type BuildingPresentationFactory } from "../src/building/BuildService";
import { PlacementValidator } from "../src/building/PlacementValidator";
import { WorldBuildingRegistry } from "../src/building/WorldBuildingRegistry";
import { CraftingService } from "../src/crafting/CraftingService";
import { RecipeCatalog } from "../src/crafting/RecipeCatalog";
import { Inventory } from "../src/inventory/Inventory";
import { ItemCatalog } from "../src/items/ItemCatalog";

const presentation: BuildingPresentationFactory = {
  prepare: () => ({ activate: () => undefined, dispose: () => undefined }),
};

describe("Player Menu 共享 Inventory 联动", () => {
  it("Craft 成功后 Inventory Snapshot 与 Crafting 需求同步更新", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("stick", 2);
    runtime.inventory.addItem("stone", 2);
    expect(runtime.crafting.evaluate("stone_axe").canCraft).toBe(true);

    expect(runtime.crafting.craft("stone_axe").success).toBe(true);
    expect(runtime.inventory.snapshot.slots.some((stack) => stack?.itemId === "stone_axe")).toBe(true);
    expect(runtime.crafting.evaluate("stone_axe")).toMatchObject({
      canCraft: false,
      reason: "missing_materials",
    });
  });

  it("Building 材料状态和成功放置都读取同一份最新 Inventory", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("wood", 3);
    expect(runtime.building.plan(foundationRequest()).requirements).toEqual([
      { itemId: "wood", quantity: 4, availableQuantity: 3, missingQuantity: 1 },
    ]);
    runtime.inventory.addItem("wood", 5);
    expect(runtime.building.plan(foundationRequest()).requirements[0]).toMatchObject({
      availableQuantity: 8,
      missingQuantity: 0,
    });

    expect(runtime.building.place(foundationRequest(), presentation).success).toBe(true);
    expect(runtime.inventory.getItemCount("wood")).toBe(4);
    expect(runtime.building.plan({
      ...foundationRequest(),
      placement: { position: { x: 2, y: 0, z: 0 }, rotationDegrees: 0, surface: "ground" },
    }).requirements[0]).toMatchObject({ availableQuantity: 4, missingQuantity: 0 });
  });
});

function createRuntime() {
  const items = ItemCatalog.fromUnknown(itemDefinitionsData);
  const inventory = new Inventory(items, { maxSlots: 24, maxWeightKilograms: 100 });
  const recipes = RecipeCatalog.fromUnknown(recipeDefinitionsData, items);
  const builds = BuildCatalog.fromUnknown(buildingDefinitionsData, items);
  const registry = new WorldBuildingRegistry();
  return {
    inventory,
    crafting: new CraftingService(recipes, items, inventory),
    building: new BuildService(builds, inventory, registry, new PlacementValidator(registry)),
  };
}

function foundationRequest() {
  return {
    definitionId: "foundation_wood",
    playerPosition: { x: 0, y: 1.7, z: 2 },
    placement: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: 0, surface: "ground" as const },
  };
}
