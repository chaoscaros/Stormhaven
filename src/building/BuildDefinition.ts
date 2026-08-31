import type { ItemCatalog } from "../items/ItemCatalog";
import type {
  BuildCategory,
  BuildCost,
  BuildDefinition,
  BuildSnapType,
  BuildingVector3,
} from "./BuildingTypes";

const BUILD_CATEGORIES = new Set<BuildCategory>(["foundation", "wall", "utility"]);
const BUILD_SNAP_TYPES = new Set<BuildSnapType>(["grid", "foundation_edge", "ground"]);
const STABLE_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

export function parseBuildDefinition(
  value: unknown,
  index: number,
  items: ItemCatalog,
): BuildDefinition {
  if (!isRecord(value)) throw new Error(`BuildDefinition[${index}] 必须是对象。`);
  const id = readStableId(value.id, `BuildDefinition[${index}].id`);
  const displayName = readNonEmptyString(value.displayName, `${id}.displayName`);
  const description = readNonEmptyString(value.description, `${id}.description`);
  const category = readEnum(value.category, BUILD_CATEGORIES, `${id}.category`);
  const snapType = readEnum(value.snapType, BUILD_SNAP_TYPES, `${id}.snapType`);
  const cost = parseCost(value.cost, id, items);
  const size = parsePositiveVector(value.size, `${id}.size`);
  const rotationStep = readPositiveFinite(value.rotationStep, `${id}.rotationStep`);
  if (360 % rotationStep !== 0) {
    throw new Error(`${id}.rotationStep 必须能整除 360。`);
  }
  if (typeof value.collision !== "boolean") throw new Error(`${id}.collision 必须是布尔值。`);
  if (!Array.isArray(value.tags) || !value.tags.every((tag) => typeof tag === "string")) {
    throw new Error(`${id}.tags 必须是字符串数组。`);
  }
  if (category === "foundation" && snapType !== "grid") {
    throw new Error(`${id} 的 Foundation 必须使用 grid Snap。`);
  }
  if (category === "wall" && snapType !== "foundation_edge") {
    throw new Error(`${id} 的 Wall 必须使用 foundation_edge Snap。`);
  }
  if (category === "utility" && snapType !== "ground") {
    throw new Error(`${id} 的 Utility 必须使用 ground Snap。`);
  }
  return Object.freeze({
    id,
    displayName,
    description,
    category,
    cost,
    size,
    snapType,
    rotationStep,
    collision: value.collision,
    tags: Object.freeze([...value.tags]),
  });
}

function parseCost(value: unknown, id: string, items: ItemCatalog): readonly BuildCost[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${id}.cost 不能为空。`);
  const seen = new Set<string>();
  return Object.freeze(value.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`${id}.cost[${index}] 必须是对象。`);
    const itemId = readStableId(entry.itemId, `${id}.cost[${index}].itemId`);
    if (!items.has(itemId)) throw new Error(`${id}.cost 引用了未知 Item ID：${itemId}`);
    if (seen.has(itemId)) throw new Error(`${id}.cost 重复引用 Item ID：${itemId}`);
    seen.add(itemId);
    if (!Number.isInteger(entry.quantity) || (entry.quantity as number) <= 0) {
      throw new Error(`${id}.cost[${index}].quantity 必须是大于 0 的整数。`);
    }
    return Object.freeze({ itemId, quantity: entry.quantity as number });
  }));
}

function parsePositiveVector(value: unknown, label: string): BuildingVector3 {
  if (!isRecord(value)) throw new Error(`${label} 必须是对象。`);
  return Object.freeze({
    x: readPositiveFinite(value.x, `${label}.x`),
    y: readPositiveFinite(value.y, `${label}.y`),
    z: readPositiveFinite(value.z, `${label}.z`),
  });
}

function readPositiveFinite(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} 必须是大于 0 的有限数值。`);
  }
  return value;
}

function readNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} 必须是非空字符串。`);
  }
  return value;
}

function readStableId(value: unknown, label: string): string {
  const id = readNonEmptyString(value, label);
  if (!STABLE_ID_PATTERN.test(id)) throw new Error(`${label} 必须是英文 snake_case 稳定 ID。`);
  return id;
}

function readEnum<T extends string>(value: unknown, allowed: Set<T>, label: string): T {
  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new Error(`${label} 不合法：${String(value)}`);
  }
  return value as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
