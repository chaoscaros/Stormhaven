import { describe, expect, it } from "vitest";
import buildingDefinitionsData from "../data/building/buildings.json";
import itemDefinitionsData from "../data/items/items.json";
import { BuildCatalog } from "../src/building/BuildCatalog";
import type { BuildingPresentationFactory } from "../src/building/BuildService";
import { BuildService } from "../src/building/BuildService";
import { PlacementValidator } from "../src/building/PlacementValidator";
import { WorldBuildingRegistry } from "../src/building/WorldBuildingRegistry";
import { Inventory } from "../src/inventory/Inventory";
import { ItemCatalog } from "../src/items/ItemCatalog";

const items = ItemCatalog.fromUnknown(itemDefinitionsData);
const definitions = BuildCatalog.fromUnknown(buildingDefinitionsData, items);
const successfulPresentation: BuildingPresentationFactory = {
  prepare: () => ({ activate: () => undefined, dispose: () => undefined }),
};

describe("Atomic Building Transaction", () => {
  it("资源充足时消费材料并注册 Foundation", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("wood", 8);
    const result = placeFoundation(runtime);
    expect(result).toMatchObject({ success: true, reason: "ok" });
    expect(runtime.inventory.getItemCount("wood")).toBe(4);
    expect(runtime.registry.getAll()).toHaveLength(1);
    expect(runtime.registry.getSnapPoints("wall")).toHaveLength(4);
  });

  it("资源不足时 Inventory 与 Registry 完全不变", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("wood", 3);
    expectFailureIsAtomic(runtime, () => placeFoundation(runtime), "not_enough_resources");
  });

  it("Placement 非法时 Inventory 与 Registry 完全不变", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("wood", 8);
    expectFailureIsAtomic(runtime, () => runtime.service.place({
      definitionId: "foundation_wood",
      playerPosition: { x: 0, y: 1.7, z: 0 },
      placement: { position: { x: 20, y: 0, z: 0 }, rotationDegrees: 0, surface: "ground" },
    }, successfulPresentation), "out_of_range");
  });

  it("Presentation Prepare 失败时不消费也不注册", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("wood", 8);
    expectFailureIsAtomic(runtime, () => runtime.service.place(foundationRequest(0), {
      prepare: () => { throw new Error("simulated"); },
    }), "presentation_failed");
  });

  it("Presentation Activate 失败时回滚 Inventory 与 Registry", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("wood", 8);
    let disposed = false;
    expectFailureIsAtomic(runtime, () => runtime.service.place(foundationRequest(0), {
      prepare: () => ({
        activate: () => { throw new Error("simulated"); },
        dispose: () => { disposed = true; },
      }),
    }), "presentation_failed");
    expect(disposed).toBe(true);
  });

  it("连续建造持续消费，资源耗尽后旧建筑保留", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("wood", 8);
    expect(placeFoundation(runtime, 0).success).toBe(true);
    expect(placeFoundation(runtime, 2).success).toBe(true);
    const beforeBuildings = runtime.registry.getAll();
    expect(placeFoundation(runtime, 4)).toMatchObject({
      success: false,
      reason: "not_enough_resources",
    });
    expect(runtime.inventory.getItemCount("wood")).toBe(0);
    expect(runtime.registry.getAll()).toEqual(beforeBuildings);
  });

  it("Foundation 后可消费资源建造 Wall 并占用 Snap Point", () => {
    const runtime = createRuntime();
    runtime.inventory.addItem("wood", 7);
    expect(placeFoundation(runtime).success).toBe(true);
    const snap = runtime.registry.getSnapPoint("building_000001:north");
    const result = runtime.service.place({
      definitionId: "wall_wood",
      playerPosition: { x: 0, y: 1.7, z: -2 },
      placement: {
        position: snap.position,
        rotationDegrees: 90,
        surface: "building",
        snapPointId: snap.id,
      },
    }, successfulPresentation);
    expect(result.success).toBe(true);
    expect(runtime.inventory.getItemCount("wood")).toBe(0);
    expect(runtime.registry.getSnapPoint(snap.id).occupied).toBe(true);
  });
});

function createRuntime() {
  const inventory = new Inventory(items, { maxSlots: 24, maxWeightKilograms: 100 });
  const registry = new WorldBuildingRegistry();
  const validator = new PlacementValidator(registry);
  return {
    inventory,
    registry,
    service: new BuildService(definitions, inventory, registry, validator),
  };
}

function foundationRequest(x: number) {
  return {
    definitionId: "foundation_wood",
    playerPosition: { x, y: 1.7, z: 2 },
    placement: { position: { x, y: 0, z: 0 }, rotationDegrees: 0, surface: "ground" as const },
  };
}

function placeFoundation(runtime: ReturnType<typeof createRuntime>, x = 0) {
  return runtime.service.place(foundationRequest(x), successfulPresentation);
}

function expectFailureIsAtomic(
  runtime: ReturnType<typeof createRuntime>,
  action: () => ReturnType<BuildService["place"]>,
  reason: string,
): void {
  const inventoryBefore = runtime.inventory.snapshot;
  const registryBefore = runtime.registry.getAll();
  expect(action()).toMatchObject({ success: false, reason });
  expect(runtime.inventory.snapshot).toEqual(inventoryBefore);
  expect(runtime.registry.getAll()).toEqual(registryBefore);
}
