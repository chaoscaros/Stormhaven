import type { ItemCatalog } from "../../items/ItemCatalog";
import { parseSpatialPoint, type SpatialPoint } from "../../survival/environment/SpatialPoint";
import { createWorldPickup, type WorldPickup } from "./WorldPickup";

export interface WorldPickupPlacement {
  readonly pickup: WorldPickup;
  readonly position: SpatialPoint;
}

export function parseWorldPickupPlacements(
  value: unknown,
  catalog: ItemCatalog,
): readonly WorldPickupPlacement[] {
  if (!Array.isArray(value)) throw new Error("World Pickup Placement 配置必须是数组。");
  const ids = new Set<string>();
  const placements = value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`World Pickup Placement[${index}] 必须是对象。`);
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.itemId !== "string") {
      throw new Error(`World Pickup Placement[${index}] 的 id/itemId 必须是字符串。`);
    }
    catalog.get(record.itemId);
    if (ids.has(record.id)) throw new Error(`World Pickup Placement ID 重复：${record.id}`);
    ids.add(record.id);
    return Object.freeze({
      pickup: createWorldPickup(record.id, record.itemId, readQuantity(record.quantity, index)),
      position: parseSpatialPoint(record.position, `World Pickup Placement[${index}].position`),
    });
  });
  return Object.freeze(placements);
}

function readQuantity(value: unknown, index: number): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`World Pickup Placement[${index}].quantity 必须是大于 0 的整数。`);
  }
  return value as number;
}
