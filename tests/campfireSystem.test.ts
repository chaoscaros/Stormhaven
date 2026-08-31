import { describe, expect, it } from "vitest";
import fuelDefinitionsData from "../data/survival/fuels.json";
import itemDefinitionsData from "../data/items/items.json";
import { Inventory } from "../src/inventory/Inventory";
import { ItemCatalog } from "../src/items/ItemCatalog";
import { CampfireSystem } from "../src/survival/campfire/CampfireSystem";
import { FuelCatalog } from "../src/survival/campfire/FuelCatalog";
import { HeatSourceSystem } from "../src/survival/heat/HeatSourceSystem";

const items = ItemCatalog.fromUnknown(itemDefinitionsData);
const fuels = FuelCatalog.fromUnknown(fuelDefinitionsData, items);

describe("Campfire State 与 Fuel Transaction", () => {
  it("新 Campfire 默认 unlit 且 Fuel 为 0", () => {
    const runtime = createRuntime();
    const state = runtime.campfires.register("building_1", { x: 0, y: 0.25, z: 0 });
    expect(state).toMatchObject({ status: "unlit", fuelSecondsRemaining: 0, isLit: false });
    expect(runtime.heat.getContribution({ x: 0, y: 0.25, z: 0 }).temperatureBonusCelsius).toBe(0);
  });

  it("无燃料不能 Ignite", () => {
    const runtime = registeredRuntime();
    expect(runtime.campfires.ignite(runtime.id)).toMatchObject({ success: false, reason: "no_fuel" });
  });

  it("添加 Wood 原子消费 Inventory 并增加 Fuel", () => {
    const runtime = registeredRuntime();
    runtime.inventory.addItem("wood", 2);
    const result = runtime.campfires.addFuel(runtime.id, "wood");
    expect(result).toMatchObject({
      success: true,
      consumedQuantity: 1,
      addedFuelSeconds: 180,
      remainingFuelSeconds: 180,
    });
    expect(runtime.inventory.getItemCount("wood")).toBe(1);
  });

  it("没有 Wood 时失败且 Inventory 与 State 完全不变", () => {
    const runtime = registeredRuntime();
    expectFailureIsAtomic(runtime, () => runtime.campfires.addFuel(runtime.id, "wood"), "no_fuel_item");
  });

  it("Fuel Full 时失败且 Inventory 不变", () => {
    const runtime = registeredRuntime({ capacity: 180 });
    runtime.inventory.addItem("wood", 2);
    expect(runtime.campfires.addFuel(runtime.id, "wood").success).toBe(true);
    expectFailureIsAtomic(runtime, () => runtime.campfires.addFuel(runtime.id, "wood"), "fuel_full");
  });

  it("不足一整块 Wood 容量时拒绝而不切割物品", () => {
    const runtime = registeredRuntime({ capacity: 250 });
    runtime.inventory.addItem("wood", 2);
    runtime.campfires.addFuel(runtime.id, "wood");
    runtime.campfires.ignite(runtime.id);
    runtime.campfires.update(90);
    runtime.campfires.extinguish(runtime.id);
    expectFailureIsAtomic(runtime, () => runtime.campfires.addFuel(runtime.id, "wood"), "fuel_full");
  });

  it("非法 Fuel Item 不修改事务双方", () => {
    const runtime = registeredRuntime();
    runtime.inventory.addItem("stone", 1);
    expectFailureIsAtomic(runtime, () => runtime.campfires.addFuel(runtime.id, "stone"), "invalid_item");
  });

  it("有燃料可点燃，熄灭保留 Fuel，再点燃继续燃烧", () => {
    const runtime = registeredRuntime();
    runtime.inventory.addItem("wood", 1);
    runtime.campfires.addFuel(runtime.id, "wood");
    expect(runtime.campfires.ignite(runtime.id).success).toBe(true);
    runtime.campfires.update(30);
    expect(runtime.campfires.extinguish(runtime.id).success).toBe(true);
    expect(runtime.campfires.get(runtime.id)).toMatchObject({
      status: "unlit",
      isLit: false,
      fuelSecondsRemaining: 150,
    });
    expect(runtime.campfires.ignite(runtime.id).success).toBe(true);
    runtime.campfires.update(10);
    expect(runtime.campfires.get(runtime.id).fuelSecondsRemaining).toBe(140);
  });
});

describe("Campfire Burn 与 HeatSource Lifecycle", () => {
  it("Burning 随 Delta 消耗，Unlit 不消耗", () => {
    const runtime = fueledRuntime();
    runtime.campfires.update(20);
    expect(runtime.campfires.get(runtime.id).fuelSecondsRemaining).toBe(180);
    runtime.campfires.ignite(runtime.id);
    runtime.campfires.update(20);
    expect(runtime.campfires.get(runtime.id).fuelSecondsRemaining).toBe(160);
  });

  it("Fuel 到 0 自动熄灭且不会变负", () => {
    const runtime = fueledRuntime();
    runtime.campfires.ignite(runtime.id);
    runtime.campfires.update(999);
    expect(runtime.campfires.get(runtime.id)).toMatchObject({
      fuelSecondsRemaining: 0,
      isLit: false,
      status: "out_of_fuel",
    });
  });

  it("30/60/120 FPS 相同模拟时长 Fuel 一致", () => {
    const values = [30, 60, 120].map((fps) => {
      const runtime = fueledRuntime();
      runtime.campfires.ignite(runtime.id);
      for (let frame = 0; frame < fps * 60; frame += 1) runtime.campfires.update(1 / fps);
      return runtime.campfires.get(runtime.id).fuelSecondsRemaining;
    });
    expect(values[0]).toBeCloseTo(values[1] ?? 0, 8);
    expect(values[1]).toBeCloseTo(values[2] ?? 0, 8);
  });

  it("Lit 注册 Heat，距离增加贡献下降", () => {
    const runtime = fueledRuntime();
    runtime.campfires.ignite(runtime.id);
    const near = runtime.heat.getContribution({ x: 0, y: 0.25, z: 0 });
    const far = runtime.heat.getContribution({ x: 4, y: 0.25, z: 0 });
    expect(near.temperatureBonusCelsius).toBeGreaterThan(far.temperatureBonusCelsius);
    expect(far.temperatureBonusCelsius).toBeGreaterThan(0);
  });

  it("Extinguish、Out Of Fuel 与 Remove 后 Heat 均为 0", () => {
    const runtime = fueledRuntime();
    runtime.campfires.ignite(runtime.id);
    runtime.campfires.extinguish(runtime.id);
    expect(heatAtOrigin(runtime)).toBe(0);
    runtime.campfires.ignite(runtime.id);
    runtime.campfires.update(180);
    expect(heatAtOrigin(runtime)).toBe(0);
    expect(runtime.campfires.removeByWorldBuildingId("building_1")).toBe(true);
    expect(heatAtOrigin(runtime)).toBe(0);
  });

  it("Interaction Target 映射为 Campfire，不带 Pickup 语义", () => {
    const runtime = registeredRuntime();
    const targetId = runtime.campfires.getInteractionTargetId("building_1");
    expect(targetId && runtime.campfires.getInteractionTarget(targetId)).toMatchObject({
      interactionType: "campfire",
      displayName: "篝火",
      campfireId: runtime.id,
    });
  });
});

function createRuntime(options: { capacity?: number } = {}) {
  const inventory = new Inventory(items, { maxSlots: 24, maxWeightKilograms: 100 });
  const heat = new HeatSourceSystem({
    maxCombinedHeatBonusCelsius: 32,
    profiles: [{
      id: "campfire_basic",
      displayName: "篝火",
      radiusMeters: 5,
      maxTemperatureBonusCelsius: 32,
    }],
  }, []);
  return {
    inventory,
    heat,
    campfires: new CampfireSystem({
      fuelCapacitySeconds: options.capacity ?? 900,
      heatSourceProfileId: "campfire_basic",
    }, fuels, inventory, heat),
  };
}

function registeredRuntime(options: { capacity?: number } = {}) {
  const runtime = createRuntime(options);
  const state = runtime.campfires.register("building_1", { x: 0, y: 0.25, z: 0 });
  return { ...runtime, id: state.id };
}

function fueledRuntime() {
  const runtime = registeredRuntime();
  runtime.inventory.addItem("wood", 1);
  runtime.campfires.addFuel(runtime.id, "wood");
  return runtime;
}

function heatAtOrigin(runtime: ReturnType<typeof fueledRuntime>): number {
  return runtime.heat.getContribution({ x: 0, y: 0.25, z: 0 }).temperatureBonusCelsius;
}

function expectFailureIsAtomic(
  runtime: ReturnType<typeof registeredRuntime>,
  action: () => ReturnType<CampfireSystem["addFuel"]>,
  reason: string,
): void {
  const inventoryBefore = runtime.inventory.snapshot;
  const stateBefore = runtime.campfires.get(runtime.id);
  expect(action()).toMatchObject({ success: false, reason });
  expect(runtime.inventory.snapshot).toEqual(inventoryBefore);
  expect(runtime.campfires.get(runtime.id)).toEqual(stateBefore);
}
