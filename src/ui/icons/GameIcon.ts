export const GAME_ICON_IDS = Object.freeze([
  "empty",
  "inventory",
  "crafting",
  "building",
  "campfire",
  "wood",
  "stone",
  "stick",
  "cloth",
  "scrap_metal",
  "water_bottle",
  "canned_food",
  "raw_meat",
  "stone_axe",
  "foundation_wood",
  "wall_wood",
  "campfire_basic",
  "temperature",
  "shelter",
  "weather",
  "weight",
  "close",
  "pause",
  "resume",
  "warning",
  "info",
] as const);

export type GameIconId = (typeof GAME_ICON_IDS)[number];
export type GameIconWeight = "regular" | "bold" | "duotone" | "fill";
export type GameIconSize = 16 | 20 | 24 | 32 | 40 | 48 | 64;

const GAME_ICON_ID_SET: ReadonlySet<string> = new Set(GAME_ICON_IDS);

export function isGameIconId(value: string): value is GameIconId {
  return GAME_ICON_ID_SET.has(value);
}

export function resolveGameIconId(value: string | null | undefined): GameIconId {
  return value && isGameIconId(value) ? value : "info";
}
