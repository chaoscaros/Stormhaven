import { describe, expect, it } from "vitest";
import buildingDefinitionsData from "../data/building/buildings.json";
import itemDefinitionsData from "../data/items/items.json";
import { BuildCatalog } from "../src/building/BuildCatalog";
import { ItemCatalog } from "../src/items/ItemCatalog";

const items = ItemCatalog.fromUnknown(itemDefinitionsData);

describe("BuildCatalog", () => {
  it("加载 Foundation 与 Wall 的合法定义", () => {
    const catalog = BuildCatalog.fromUnknown(buildingDefinitionsData, items);
    expect(catalog.getAll()).toHaveLength(2);
    expect(catalog.get("foundation_wood")).toMatchObject({
      category: "foundation",
      snapType: "grid",
      cost: [{ itemId: "wood", quantity: 4 }],
    });
    expect(catalog.get("wall_wood")).toMatchObject({
      category: "wall",
      snapType: "foundation_edge",
    });
  });

  it("拒绝重复 Build ID", () => {
    expect(() => BuildCatalog.fromUnknown([
      buildingDefinitionsData[0],
      buildingDefinitionsData[0],
    ], items)).toThrow(/重复/);
  });

  it("拒绝不存在的 Cost Item ID", () => {
    expect(() => createCatalog({ cost: [{ itemId: "missing", quantity: 1 }] }))
      .toThrow(/未知 Item ID/);
  });

  it.each([0, -1, 1.5])("拒绝非法 Cost quantity：%s", (quantity) => {
    expect(() => createCatalog({ cost: [{ itemId: "wood", quantity }] }))
      .toThrow(/quantity/);
  });

  it.each([
    { x: 0, y: 1, z: 1 },
    { x: 1, y: -1, z: 1 },
    { x: 1, y: 1, z: Number.NaN },
  ])("拒绝非法 Size：$x/$y/$z", (size) => {
    expect(() => createCatalog({ size })).toThrow(/size/);
  });

  it.each([0, -90, 70])("拒绝非法 Rotation Step：%s", (rotationStep) => {
    expect(() => createCatalog({ rotationStep })).toThrow(/rotationStep/);
  });
});

function createCatalog(overrides: Record<string, unknown>): BuildCatalog {
  return BuildCatalog.fromUnknown([{ ...buildingDefinitionsData[0], ...overrides }], items);
}
