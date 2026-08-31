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
import fuelDefinitionsData from "../data/survival/fuels.json";
import { FuelCatalog } from "../src/survival/campfire/FuelCatalog";
import { CampfireSystem } from "../src/survival/campfire/CampfireSystem";
import { CampfireBuildingBinding } from "../src/survival/campfire/CampfireBuildingBinding";
import { HeatSourceSystem } from "../src/survival/heat/HeatSourceSystem";

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

  it("Campfire Build 原子创建 World Entity、Gameplay State 与禁用 HeatSource", () => {
    const runtime = createCampfireRuntime();
    runtime.inventory.addItem("stone", 4);
    runtime.inventory.addItem("wood", 2);
    const result = runtime.service.place({
      definitionId: "campfire_basic",
      playerPosition: { x: 0, y: 1.8, z: -3 },
      placement: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: 0, surface: "ground" },
    }, bindingPresentation(runtime.binding, definitions));

    expect(result).toMatchObject({ success: true, buildingEntityId: "building_000001" });
    expect(runtime.registry.getAll()).toHaveLength(1);
    expect(runtime.inventory.getItemCount("stone")).toBe(0);
    expect(runtime.inventory.getItemCount("wood")).toBe(0);
    const campfire = runtime.campfires.getByWorldBuildingId("building_000001");
    expect(campfire).toMatchObject({ status: "unlit", fuelSecondsRemaining: 0 });
    const targetId = runtime.campfires.getInteractionTargetId("building_000001");
    expect(targetId && runtime.campfires.getInteractionTarget(targetId)).toMatchObject({
      interactionType: "campfire",
    });
    expect(runtime.heat.getContribution({ x: 0, y: 0.25, z: 0 }).temperatureBonusCelsius).toBe(0);
  });

  it("Campfire Gameplay 激活后失败会与 Building/Inventory 一并回滚", () => {
    const runtime = createCampfireRuntime();
    runtime.inventory.addItem("stone", 4);
    runtime.inventory.addItem("wood", 2);
    const before = runtime.inventory.snapshot;
    const result = runtime.service.place({
      definitionId: "campfire_basic",
      playerPosition: { x: 0, y: 1.8, z: -3 },
      placement: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: 0, surface: "ground" },
    }, {
      prepare(entity) {
        const gameplay = runtime.binding.prepare(entity, definitions.get(entity.definitionId));
        return {
          activate(): void {
            gameplay.activate();
            throw new Error("simulated visual failure");
          },
          dispose: gameplay.dispose,
        };
      },
    });
    expect(result).toMatchObject({ success: false, reason: "presentation_failed" });
    expect(runtime.inventory.snapshot).toEqual(before);
    expect(runtime.registry.getAll()).toHaveLength(0);
    expect(runtime.campfires.getAll()).toHaveLength(0);
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

function createCampfireRuntime() {
  const inventory = new Inventory(items, { maxSlots: 24, maxWeightKilograms: 100 });
  const registry = new WorldBuildingRegistry();
  const heat = new HeatSourceSystem({
    maxCombinedHeatBonusCelsius: 32,
    profiles: [{
      id: "campfire_basic",
      displayName: "篝火",
      radiusMeters: 5,
      maxTemperatureBonusCelsius: 32,
    }],
  }, []);
  const campfires = new CampfireSystem(
    { fuelCapacitySeconds: 900, heatSourceProfileId: "campfire_basic" },
    FuelCatalog.fromUnknown(fuelDefinitionsData, items),
    inventory,
    heat,
  );
  const binding = new CampfireBuildingBinding(campfires);
  return {
    inventory,
    registry,
    heat,
    campfires,
    binding,
    service: new BuildService(definitions, inventory, registry, new PlacementValidator(registry)),
  };
}

function bindingPresentation(
  binding: CampfireBuildingBinding,
  catalog: BuildCatalog,
): BuildingPresentationFactory {
  return {
    prepare(entity) {
      const gameplay = binding.prepare(entity, catalog.get(entity.definitionId));
      return { activate: gameplay.activate, dispose: gameplay.dispose };
    },
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
