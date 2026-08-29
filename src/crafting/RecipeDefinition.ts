import type { ItemCatalog } from "../items/ItemCatalog";

export interface RecipeItemQuantity {
  readonly itemId: string;
  readonly quantity: number;
}

export interface RecipeDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly inputs: readonly RecipeItemQuantity[];
  readonly outputs: readonly RecipeItemQuantity[];
  readonly craftTimeSeconds: number;
  readonly requiredStation: string;
  readonly tags: readonly string[];
}

export function parseRecipeDefinition(
  value: unknown,
  index: number,
  itemCatalog: ItemCatalog,
): RecipeDefinition {
  const label = `RecipeDefinition[${index}]`;
  const record = asRecord(value, label);
  const id = readStableId(record.id, `${label}.id`);
  const inputs = readItemQuantities(record.inputs, `${label}.inputs`, itemCatalog);
  const outputs = readItemQuantities(record.outputs, `${label}.outputs`, itemCatalog);
  const craftTimeSeconds = readFinite(record.craftTimeSeconds, `${label}.craftTimeSeconds`);
  if (craftTimeSeconds < 0) throw new Error(`${label}.craftTimeSeconds 不能小于 0。`);
  const requiredStation = readStableId(record.requiredStation, `${label}.requiredStation`);
  const tags = readStringArray(record.tags, `${label}.tags`);
  return Object.freeze({
    id,
    displayName: readString(record.displayName, `${label}.displayName`),
    description: readString(record.description, `${label}.description`),
    inputs,
    outputs,
    craftTimeSeconds,
    requiredStation,
    tags,
  });
}

function readItemQuantities(
  value: unknown,
  label: string,
  itemCatalog: ItemCatalog,
): readonly RecipeItemQuantity[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} 必须是非空数组。`);
  }
  const itemIds = new Set<string>();
  const quantities = value.map((entry, entryIndex) => {
    const entryLabel = `${label}[${entryIndex}]`;
    const record = asRecord(entry, entryLabel);
    const itemId = readStableId(record.itemId, `${entryLabel}.itemId`);
    itemCatalog.get(itemId);
    if (itemIds.has(itemId)) throw new Error(`${label} 不能重复 Item ID：${itemId}`);
    itemIds.add(itemId);
    const quantity = readFinite(record.quantity, `${entryLabel}.quantity`);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`${entryLabel}.quantity 必须是大于 0 的整数。`);
    }
    return Object.freeze({ itemId, quantity });
  });
  return Object.freeze(quantities);
}

function readStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${label} 必须是字符串数组。`);
  const values = value.map((entry, index) => readString(entry, `${label}[${index}]`));
  if (new Set(values).size !== values.length) throw new Error(`${label} 不能重复。`);
  return Object.freeze(values);
}

function readStableId(value: unknown, label: string): string {
  const id = readString(value, label);
  if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new Error(`${label} 必须是英文 snake_case。`);
  return id;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} 必须是非空字符串。`);
  }
  return value;
}

function readFinite(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} 必须是有限数值。`);
  }
  return value;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}
