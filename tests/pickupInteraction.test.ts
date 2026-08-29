import { describe, expect, it } from "vitest";
import itemDefinitionsData from "../data/items/items.json";
import pickupPlacementsData from "../data/world/first-blizzard-pickups.json";
import { InteractionService } from "../src/interaction/InteractionService";
import { INTERACTION_CONFIG } from "../src/interaction/InteractionConfig";
import { formatInteractionPrompt } from "../src/interaction/InteractionTarget";
import { Inventory } from "../src/inventory/Inventory";
import { ItemCatalog } from "../src/items/ItemCatalog";
import { createWorldPickup } from "../src/world/pickups/WorldPickup";
import { WorldPickupRegistry } from "../src/world/pickups/WorldPickupRegistry";
import { parseWorldPickupPlacements } from "../src/world/pickups/WorldPickupPlacement";

const catalog = ItemCatalog.fromUnknown(itemDefinitionsData);

describe("Pickup Transaction", () => {
  it("背包快捷键集中配置为 Tab", () => {
    expect(INTERACTION_CONFIG.inventoryKeyCode).toBe("Tab");
  });

  it("第一场暴雪场景配置可解析为唯一 Pickup", () => {
    const placements = parseWorldPickupPlacements(pickupPlacementsData, catalog);
    expect(placements).toHaveLength(6);
    expect(new Set(placements.map(({ pickup }) => pickup.id)).size).toBe(6);
  });

  it("场景配置引用未知 Item 时拒绝启动", () => {
    expect(() => parseWorldPickupPlacements([{
      id: "pickup_unknown",
      itemId: "unknown",
      quantity: 1,
      position: { x: 0, y: 0, z: 0 },
    }], catalog)).toThrow(/不存在 ItemDefinition ID/);
  });

  it("有空间时完整拾取并移除 World Pickup", () => {
    const runtime = createRuntime("wood", 5);
    const result = runtime.service.interact("pickup");
    expect(result).toMatchObject({ success: true, acceptedQuantity: 5, remainingQuantity: 0 });
    expect(runtime.inventory.getItemCount("wood")).toBe(5);
    expect(runtime.registry.get("pickup")).toBeUndefined();
  });

  it("Inventory 无空间时 Pickup 完全保留", () => {
    const inventory = new Inventory(catalog, { maxSlots: 1, maxWeightKilograms: 100 });
    inventory.addItem("stone", 20);
    const runtime = createRuntime("wood", 5, inventory);
    const result = runtime.service.interact("pickup");
    expect(result.reason).toBe("inventory_full");
    expect(result.acceptedQuantity).toBe(0);
    expect(runtime.registry.get("pickup")?.quantity).toBe(5);
  });

  it("Partial Add 后 Pickup 保留正确余量", () => {
    const inventory = new Inventory(catalog, { maxSlots: 24, maxWeightKilograms: 2.5 });
    const runtime = createRuntime("wood", 10, inventory);
    const result = runtime.service.interact("pickup");
    expect(result.acceptedQuantity).toBe(3);
    expect(result.remainingQuantity).toBe(7);
    expect(runtime.registry.get("pickup")?.quantity).toBe(7);
  });

  it("Pickup quantity 归零后 consumed 并从 Registry 移除", () => {
    const runtime = createRuntime("stone", 1);
    runtime.service.interact("pickup");
    expect(runtime.registry.get("pickup")).toBeUndefined();
  });

  it("重复 Interaction 不能复制物品", () => {
    const runtime = createRuntime("wood", 2);
    runtime.service.interact("pickup");
    const duplicate = runtime.service.interact("pickup");
    expect(duplicate.reason).toBe("invalid_target");
    expect(runtime.inventory.getItemCount("wood")).toBe(2);
  });

  it("未知 Item ID 明确失败且不消费 Pickup", () => {
    const inventory = new Inventory(catalog, { maxSlots: 24, maxWeightKilograms: 100 });
    const registry = new WorldPickupRegistry([createWorldPickup("pickup", "unknown", 2)]);
    const result = new InteractionService(catalog, inventory, registry).interact("pickup");
    expect(result.reason).toBe("unknown_item");
    expect(registry.get("pickup")?.quantity).toBe(2);
  });

  it("不存在 Pickup 明确返回 invalid_target", () => {
    const runtime = createRuntime("wood", 2);
    expect(runtime.service.interact("missing").reason).toBe("invalid_target");
  });

  it("Interaction Prompt 显示数量并使用展示名", () => {
    const runtime = createRuntime("wood", 3);
    const target = runtime.service.getTarget("pickup");
    expect(target && formatInteractionPrompt(target)).toBe("[E] 拾取 木材 ×3");
  });
});

function createRuntime(itemId: string, quantity: number, existingInventory?: Inventory) {
  const inventory = existingInventory
    ?? new Inventory(catalog, { maxSlots: 24, maxWeightKilograms: 100 });
  const registry = new WorldPickupRegistry([createWorldPickup("pickup", itemId, quantity)]);
  return {
    inventory,
    registry,
    service: new InteractionService(catalog, inventory, registry),
  };
}
