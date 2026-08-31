import { describe, expect, it } from "vitest";
import buildingDefinitionsData from "../data/building/buildings.json";
import itemDefinitionsData from "../data/items/items.json";
import { BuildCatalog } from "../src/building/BuildCatalog";
import { createBuildingBounds } from "../src/building/BuildingGeometry";
import { BuildService } from "../src/building/BuildService";
import { PlacementValidator } from "../src/building/PlacementValidator";
import { WorldBuildingRegistry } from "../src/building/WorldBuildingRegistry";
import { Inventory } from "../src/inventory/Inventory";
import { ItemCatalog } from "../src/items/ItemCatalog";
import { segmentIntersectsPrecipitationBounds } from "../src/weather/presentation/PrecipitationCollision";
import { PrecipitationObstacleRegistry } from "../src/weather/presentation/PrecipitationObstacleRegistry";

describe("Building → Dynamic Precipitation Obstacle Integration", () => {
  it("成功建成的 Wall 激活障碍并阻挡 Snow Segment", () => {
    const items = ItemCatalog.fromUnknown(itemDefinitionsData);
    const definitions = BuildCatalog.fromUnknown(buildingDefinitionsData, items);
    const inventory = new Inventory(items, { maxSlots: 24, maxWeightKilograms: 100 });
    const buildings = new WorldBuildingRegistry();
    const obstacles = new PrecipitationObstacleRegistry();
    const service = new BuildService(
      definitions,
      inventory,
      buildings,
      new PlacementValidator(buildings),
    );
    inventory.addItem("wood", 7);
    expect(service.place({
      definitionId: "foundation_wood",
      playerPosition: { x: 0, y: 1.7, z: 2 },
      placement: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: 0, surface: "ground" },
    }, createObstaclePresentation(definitions, obstacles)).success).toBe(true);
    const north = buildings.getSnapPoint("building_000001:north");
    expect(service.place({
      definitionId: "wall_wood",
      playerPosition: { x: 0, y: 1.7, z: -2 },
      placement: {
        position: north.position,
        rotationDegrees: 0,
        surface: "building",
        snapPointId: north.id,
      },
    }, createObstaclePresentation(definitions, obstacles)).success).toBe(true);

    expect(obstacles.has("building:building_000002")).toBe(true);
    expect(obstacles.getAll().some((bounds) => segmentIntersectsPrecipitationBounds(
      { x: 0, y: 1.5, z: -2 },
      { x: 0, y: 1.5, z: 0 },
      bounds,
    ))).toBe(true);
  });
});

function createObstaclePresentation(
  definitions: BuildCatalog,
  obstacles: PrecipitationObstacleRegistry,
) {
  return {
    prepare: (entity: Parameters<import("../src/building/BuildService").BuildingPresentationFactory["prepare"]>[0]) => ({
      activate: (): void => {
        obstacles.add(
          `building:${entity.id}`,
          createBuildingBounds(
            definitions.get(entity.definitionId),
            entity.position,
            entity.rotationDegrees,
          ),
        );
      },
      dispose: (): void => {
        obstacles.remove(`building:${entity.id}`);
      },
    }),
  };
}
