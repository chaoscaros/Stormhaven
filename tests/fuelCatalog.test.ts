import { describe, expect, it } from "vitest";
import fuelDefinitionsData from "../data/survival/fuels.json";
import itemDefinitionsData from "../data/items/items.json";
import { ItemCatalog } from "../src/items/ItemCatalog";
import { FuelCatalog } from "../src/survival/campfire/FuelCatalog";

const items = ItemCatalog.fromUnknown(itemDefinitionsData);

describe("FuelCatalog", () => {
  it("加载合法 Wood FuelDefinition", () => {
    const catalog = FuelCatalog.fromUnknown(fuelDefinitionsData, items);
    expect(catalog.get("wood")).toEqual({ itemId: "wood", burnSecondsPerItem: 180 });
  });

  it("拒绝不存在的 Item ID", () => {
    expect(() => FuelCatalog.fromUnknown([
      { itemId: "missing", burnSecondsPerItem: 180 },
    ], items)).toThrow(/未知 Item ID/);
  });

  it.each([0, -1, Number.NaN])("拒绝非法 burnSecondsPerItem：%s", (value) => {
    expect(() => FuelCatalog.fromUnknown([
      { itemId: "wood", burnSecondsPerItem: value },
    ], items)).toThrow(/burnSecondsPerItem/);
  });

  it("拒绝重复 Fuel Item", () => {
    expect(() => FuelCatalog.fromUnknown([
      { itemId: "wood", burnSecondsPerItem: 180 },
      { itemId: "wood", burnSecondsPerItem: 240 },
    ], items)).toThrow(/重复/);
  });
});
