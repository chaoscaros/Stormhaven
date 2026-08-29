import { describe, expect, it } from "vitest";
import itemDefinitionsData from "../data/items/items.json";
import { Inventory } from "../src/inventory/Inventory";
import { ItemCatalog } from "../src/items/ItemCatalog";

const catalog = ItemCatalog.fromUnknown(itemDefinitionsData);

describe("Inventory", () => {
  it("空 Inventory 可以加入物品", () => {
    const inventory = createInventory();
    expect(inventory.addItem("wood", 5).acceptedQuantity).toBe(5);
    expect(inventory.getItemCount("wood")).toBe(5);
  });

  it("相同 Item 优先填充已有 Stack", () => {
    const inventory = createInventory();
    inventory.addItem("wood", 17);
    inventory.addItem("wood", 3);
    expect(inventory.snapshot.slots[0]).toEqual({ itemId: "wood", quantity: 20 });
    expect(inventory.getUsedSlots()).toBe(1);
  });

  it("超过 Stack Size 时创建新 Stack", () => {
    const inventory = createInventory();
    inventory.addItem("wood", 25);
    expect(inventory.snapshot.slots.slice(0, 2)).toEqual([
      { itemId: "wood", quantity: 20 },
      { itemId: "wood", quantity: 5 },
    ]);
  });

  it("Slot 满后仅加入可容纳数量", () => {
    const inventory = createInventory(1, 100);
    const result = inventory.addItem("wood", 25);
    expect(result.acceptedQuantity).toBe(20);
    expect(result.remainingQuantity).toBe(5);
    expect(inventory.getUsedSlots()).toBe(1);
  });

  it("完全没有 Slot 容量时返回 inventory_full", () => {
    const inventory = createInventory(1, 100);
    inventory.addItem("wood", 20);
    expect(inventory.canAddItem("stone", 1)).toMatchObject({
      acceptedQuantity: 0,
      reason: "inventory_full",
    });
  });

  it("Weight Limit 支持 Partial Add", () => {
    const inventory = createInventory(24, 3);
    const result = inventory.addItem("wood", 10);
    expect(result.acceptedQuantity).toBe(3);
    expect(result.remainingQuantity).toBe(7);
    expect(inventory.getTotalWeight()).toBeCloseTo(2.4);
  });

  it("重量完全不足时返回 too_heavy", () => {
    const inventory = createInventory(24, 0.5);
    expect(inventory.canAddItem("stone", 1).reason).toBe("too_heavy");
  });

  it("removeItem 从后方 Stack 移除并返回实际数量", () => {
    const inventory = createInventory();
    inventory.addItem("wood", 25);
    expect(inventory.removeItem("wood", 8)).toBe(8);
    expect(inventory.getItemCount("wood")).toBe(17);
    expect(inventory.getUsedSlots()).toBe(1);
  });

  it("moveStack 可以移动到空 Slot", () => {
    const inventory = createInventory();
    inventory.addItem("wood", 5);
    expect(inventory.moveStack(0, 4)).toBe(true);
    expect(inventory.snapshot.slots[0]).toBeUndefined();
    expect(inventory.snapshot.slots[4]).toEqual({ itemId: "wood", quantity: 5 });
  });

  it("splitStack 将指定数量拆到空 Slot", () => {
    const inventory = createInventory();
    inventory.addItem("wood", 10);
    expect(inventory.splitStack(0, 1, 4)).toBe(true);
    expect(inventory.snapshot.slots.slice(0, 2)).toEqual([
      { itemId: "wood", quantity: 6 },
      { itemId: "wood", quantity: 4 },
    ]);
  });

  it("mergeStacks 不超过 Item stackSize", () => {
    const inventory = createInventory();
    inventory.addItem("wood", 25);
    inventory.moveStack(0, 2);
    expect(inventory.mergeStacks(1, 2)).toBe(0);
    expect(inventory.mergeStacks(2, 1)).toBe(15);
    expect(inventory.snapshot.slots[1]).toEqual({ itemId: "wood", quantity: 20 });
    expect(inventory.snapshot.slots[2]).toEqual({ itemId: "wood", quantity: 5 });
  });

  it("getItemCount 与 hasItem 使用稳定 ID", () => {
    const inventory = createInventory();
    inventory.addItem("stone", 4);
    expect(inventory.getItemCount("stone")).toBe(4);
    expect(inventory.hasItem("stone", 4)).toBe(true);
    expect(inventory.hasItem("stone", 5)).toBe(false);
  });

  it("总重量按 Definition × Quantity 动态计算", () => {
    const inventory = createInventory();
    inventory.addItem("wood", 2);
    inventory.addItem("stone", 3);
    expect(inventory.getTotalWeight()).toBeCloseTo(6.1);
  });

  it("Snapshot 不超过配置 Slot 与 Weight", () => {
    const inventory = createInventory(2, 3);
    inventory.addItem("wood", 100);
    expect(inventory.snapshot.slots).toHaveLength(2);
    expect(inventory.snapshot.usedSlots).toBeLessThanOrEqual(2);
    expect(inventory.snapshot.totalWeightKilograms).toBeLessThanOrEqual(3);
  });
});

function createInventory(maxSlots = 24, maxWeightKilograms = 100): Inventory {
  return new Inventory(catalog, { maxSlots, maxWeightKilograms });
}
