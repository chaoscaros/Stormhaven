import { describe, expect, it } from "vitest";
import buildingDefinitionsData from "../data/building/buildings.json";
import itemDefinitionsData from "../data/items/items.json";
import { BuildCatalog } from "../src/building/BuildCatalog";
import { PlacementValidator } from "../src/building/PlacementValidator";
import { WorldBuildingRegistry } from "../src/building/WorldBuildingRegistry";
import { ItemCatalog } from "../src/items/ItemCatalog";

const items = ItemCatalog.fromUnknown(itemDefinitionsData);
const definitions = BuildCatalog.fromUnknown(buildingDefinitionsData, items);

describe("PlacementValidator", () => {
  it("合法 Ground Foundation 吸附到 Grid", () => {
    const result = createRuntime().validator.validate(definitions.get("foundation_wood"), {
      playerPosition: { x: 0, y: 1.7, z: 0 },
      candidate: groundCandidate(2.9, -1.2),
    });
    expect(result).toMatchObject({
      valid: true,
      reason: "ok",
      placement: { position: { x: 2, y: 0.1, z: -1 } },
    });
  });

  it("超出最大距离失败", () => {
    const result = createRuntime().validator.validate(definitions.get("foundation_wood"), {
      playerPosition: { x: 0, y: 1.7, z: 0 },
      candidate: groundCandidate(20, 0),
    });
    expect(result).toMatchObject({ valid: false, reason: "out_of_range" });
  });

  it("与已有 Building 重叠失败", () => {
    const runtime = createRuntime();
    registerFoundation(runtime.registry);
    const result = runtime.validator.validate(definitions.get("foundation_wood"), {
      playerPosition: { x: 0, y: 1.7, z: 2 },
      candidate: groundCandidate(0, 0),
    });
    expect(result).toMatchObject({ valid: false, reason: "blocked" });
  });

  it("Wall 没有 Snap Point 时失败", () => {
    const result = createRuntime().validator.validate(definitions.get("wall_wood"), {
      playerPosition: { x: 0, y: 1.7, z: 0 },
      candidate: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: 0, surface: "none" },
    });
    expect(result).toMatchObject({ valid: false, reason: "snap_required" });
  });

  it("Wall 可吸附到 Foundation Edge", () => {
    const runtime = createRuntime();
    registerFoundation(runtime.registry);
    const north = runtime.registry.getSnapPoint("foundation_test:north");
    const result = runtime.validator.validate(definitions.get("wall_wood"), {
      playerPosition: { x: 0, y: 1.7, z: -2 },
      candidate: {
        position: north.position,
        rotationDegrees: 270,
        surface: "building",
        snapPointId: north.id,
      },
    });
    expect(result).toMatchObject({
      valid: true,
      placement: { rotationDegrees: 0, position: { x: 0, y: 1.4, z: -1 } },
    });
  });

  it("已占用 Snap Point 失败", () => {
    const runtime = createRuntime();
    registerFoundation(runtime.registry);
    runtime.registry.register({
      id: "wall_existing",
      definitionId: "wall_wood",
      position: { x: 0, y: 1.4, z: -1 },
      rotationDegrees: 0,
    }, definitions.get("wall_wood"), "foundation_test:north");
    const result = runtime.validator.validate(definitions.get("wall_wood"), {
      playerPosition: { x: 0, y: 1.7, z: -2 },
      candidate: {
        position: { x: 0, y: 0.2, z: -1 },
        rotationDegrees: 0,
        surface: "building",
        snapPointId: "foundation_test:north",
      },
    });
    expect(result).toMatchObject({ valid: false, reason: "snap_occupied" });
  });

  it("Campfire Utility 可直接放置在 Ground 且保留地面高度", () => {
    const result = createRuntime().validator.validate(definitions.get("campfire_basic"), {
      playerPosition: { x: 0, y: 1.8, z: -3 },
      candidate: groundCandidate(0.7, 0.8, 0.12),
    });
    expect(result).toMatchObject({
      valid: true,
      placement: { position: { x: 0.7, y: 0.37, z: 0.8 }, surface: "ground" },
    });
  });

  it("Campfire 不能与现有建筑重叠", () => {
    const runtime = createRuntime();
    registerFoundation(runtime.registry);
    const result = runtime.validator.validate(definitions.get("campfire_basic"), {
      playerPosition: { x: 0, y: 1.8, z: 3 },
      candidate: groundCandidate(0, 0),
    });
    expect(result).toMatchObject({ valid: false, reason: "blocked" });
  });

  it("Campfire 不能穿过固定场景墙体放置", () => {
    const registry = new WorldBuildingRegistry();
    const validator = new PlacementValidator(registry, [{
      min: { x: -1, y: 0, z: -0.2 },
      max: { x: 1, y: 3, z: 0.2 },
    }]);
    const result = validator.validate(definitions.get("campfire_basic"), {
      playerPosition: { x: 0, y: 1.8, z: -3 },
      candidate: groundCandidate(0, 0),
    });
    expect(result).toMatchObject({ valid: false, reason: "blocked" });
  });

  it("Campfire 不能放在玩家身体所在位置", () => {
    const result = createRuntime().validator.validate(definitions.get("campfire_basic"), {
      playerPosition: { x: 0, y: 1.8, z: 0 },
      candidate: groundCandidate(0, 0),
    });
    expect(result).toMatchObject({ valid: false, reason: "blocked_by_player" });
  });
});

function createRuntime() {
  const registry = new WorldBuildingRegistry();
  return { registry, validator: new PlacementValidator(registry) };
}

function registerFoundation(registry: WorldBuildingRegistry): void {
  registry.register({
    id: "foundation_test",
    definitionId: "foundation_wood",
    position: { x: 0, y: 0.1, z: 0 },
    rotationDegrees: 0,
  }, definitions.get("foundation_wood"));
}

function groundCandidate(x: number, z: number, y = 0) {
  return { position: { x, y, z }, rotationDegrees: 0, surface: "ground" as const };
}
