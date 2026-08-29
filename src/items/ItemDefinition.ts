export const ITEM_CATEGORIES = [
  "resource",
  "food",
  "drink",
  "material",
  "tool",
  "misc",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface ItemDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly category: ItemCategory;
  readonly stackSize: number;
  /** 单件重量，单位 kg。 */
  readonly weight: number;
  readonly durability: number | null;
  readonly icon: string | null;
  readonly tags: readonly string[];
}

export function parseItemDefinition(value: unknown, index: number): ItemDefinition {
  const record = asRecord(value, `ItemDefinition[${index}]`);
  const id = readString(record.id, `ItemDefinition[${index}].id`);
  if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    throw new Error(`ItemDefinition[${index}].id 必须是英文 snake_case。`);
  }
  const category = readString(record.category, `ItemDefinition[${index}].category`);
  if (!ITEM_CATEGORIES.includes(category as ItemCategory)) {
    throw new Error(`ItemDefinition[${index}].category 不受支持：${category}`);
  }
  const stackSize = readInteger(record.stackSize, `ItemDefinition[${index}].stackSize`);
  if (stackSize <= 0) throw new Error(`ItemDefinition[${index}].stackSize 必须大于 0。`);
  const weight = readFinite(record.weight, `ItemDefinition[${index}].weight`);
  if (weight < 0) throw new Error(`ItemDefinition[${index}].weight 不能小于 0。`);
  const durability = readNullableFinite(
    record.durability,
    `ItemDefinition[${index}].durability`,
  );
  if (durability !== null && durability <= 0) {
    throw new Error(`ItemDefinition[${index}].durability 必须大于 0 或为 null。`);
  }
  const icon = record.icon === null
    ? null
    : readString(record.icon, `ItemDefinition[${index}].icon`);
  if (!Array.isArray(record.tags)) {
    throw new Error(`ItemDefinition[${index}].tags 必须是字符串数组。`);
  }
  const tags = record.tags.map((tag, tagIndex) =>
    readString(tag, `ItemDefinition[${index}].tags[${tagIndex}]`));
  if (new Set(tags).size !== tags.length) {
    throw new Error(`ItemDefinition[${index}].tags 不能重复。`);
  }
  return Object.freeze({
    id,
    displayName: readString(record.displayName, `ItemDefinition[${index}].displayName`),
    description: readString(record.description, `ItemDefinition[${index}].description`),
    category: category as ItemCategory,
    stackSize,
    weight,
    durability,
    icon,
    tags: Object.freeze(tags),
  });
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
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

function readInteger(value: unknown, label: string): number {
  const number = readFinite(value, label);
  if (!Number.isInteger(number)) throw new Error(`${label} 必须是整数。`);
  return number;
}

function readNullableFinite(value: unknown, label: string): number | null {
  return value === null ? null : readFinite(value, label);
}
