import type { ItemCatalog } from "../../items/ItemCatalog";

export interface FuelDefinition {
  readonly itemId: string;
  readonly burnSecondsPerItem: number;
}

const STABLE_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

export function parseFuelDefinition(
  value: unknown,
  index: number,
  items: ItemCatalog,
): FuelDefinition {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`FuelDefinition[${index}] 必须是对象。`);
  }
  const record = value as Record<string, unknown>;
  if (typeof record.itemId !== "string" || !STABLE_ID_PATTERN.test(record.itemId)) {
    throw new Error(`FuelDefinition[${index}].itemId 必须是英文 snake_case 稳定 ID。`);
  }
  if (!items.has(record.itemId)) {
    throw new Error(`FuelDefinition 引用了未知 Item ID：${record.itemId}`);
  }
  if (
    typeof record.burnSecondsPerItem !== "number"
    || !Number.isFinite(record.burnSecondsPerItem)
    || record.burnSecondsPerItem <= 0
  ) {
    throw new Error(`${record.itemId}.burnSecondsPerItem 必须是大于 0 的有限数值。`);
  }
  return Object.freeze({
    itemId: record.itemId,
    burnSecondsPerItem: record.burnSecondsPerItem,
  });
}
