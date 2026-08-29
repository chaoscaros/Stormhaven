import { describe, expect, it } from "vitest";
import itemDefinitionsData from "../data/items/items.json";
import { createItemStack } from "../src/inventory/ItemStack";
import { ItemCatalog } from "../src/items/ItemCatalog";

describe("ItemDefinition / ItemCatalog", () => {
  it("解析合法 Items JSON", () => {
    const catalog = ItemCatalog.fromUnknown(itemDefinitionsData);
    expect(catalog.get("wood")).toMatchObject({ displayName: "木材", stackSize: 20 });
    expect(catalog.getAll()).toHaveLength(9);
    expect(catalog.get("stone_axe")).toMatchObject({ stackSize: 1, durability: 100 });
  });

  it("拒绝重复 Item ID", () => {
    expect(() => ItemCatalog.fromUnknown([
      itemDefinitionsData[0],
      itemDefinitionsData[0],
    ])).toThrow("ItemDefinition ID 重复：wood");
  });

  it("拒绝非正 stackSize", () => {
    expect(() => ItemCatalog.fromUnknown([
      { ...itemDefinitionsData[0], stackSize: 0 },
    ])).toThrow("stackSize 必须大于 0");
  });

  it("拒绝负重量", () => {
    expect(() => ItemCatalog.fromUnknown([
      { ...itemDefinitionsData[0], weight: -0.1 },
    ])).toThrow("weight 不能小于 0");
  });

  it("查询不存在的 Item ID 给出明确错误", () => {
    expect(() => ItemCatalog.fromUnknown(itemDefinitionsData).get("missing")).toThrow(
      "不存在 ItemDefinition ID：missing",
    );
  });
});

describe("ItemStack", () => {
  it("创建只引用稳定 Item ID 的不可变 Stack", () => {
    const stack = createItemStack("wood", 3);
    expect(stack).toEqual({ itemId: "wood", quantity: 3 });
    expect(Object.isFrozen(stack)).toBe(true);
    expect("displayName" in stack).toBe(false);
  });

  it.each([0, -1, 1.5])("拒绝非法 quantity：%s", (quantity) => {
    expect(() => createItemStack("wood", quantity)).toThrow(
      "quantity 必须是大于 0 的整数",
    );
  });
});
