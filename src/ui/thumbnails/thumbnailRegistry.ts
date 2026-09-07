import type { HotbarEntry } from "../hotbar/HotbarModel";
import { resolveGameIconId, type GameIconId } from "../icons/GameIcon";

export interface GameplayThumbnail {
  readonly id: string;
  readonly url?: string;
  readonly fallbackIcon: GameIconId;
}

export const ITEM_THUMBNAIL_IDS = Object.freeze([
  "wood", "stone", "stick", "cloth", "scrap_metal", "water_bottle",
  "canned_food", "raw_meat", "stone_axe",
] as const);
export const BUILD_THUMBNAIL_IDS = Object.freeze([
  "foundation_wood", "wall_wood", "campfire_basic",
] as const);

function registry(ids: readonly string[]): ReadonlyMap<string, GameplayThumbnail> {
  return new Map(ids.map((id) => [id, Object.freeze({
    id,
    url: `${import.meta.env.BASE_URL}assets/thumbnails/${id}.webp`,
    fallbackIcon: resolveGameIconId(id),
  })]));
}

const items = registry(ITEM_THUMBNAIL_IDS);
const builds = registry(BUILD_THUMBNAIL_IDS);
const UNKNOWN: GameplayThumbnail = Object.freeze({ id: "unknown", fallbackIcon: "info" });
const EMPTY: GameplayThumbnail = Object.freeze({ id: "empty", fallbackIcon: "empty" });

/** Presentation-owned lookup; identifiers and saves never acquire image paths. */
export function getGameplayThumbnailForItem(id: string | undefined): GameplayThumbnail {
  return id ? items.get(id) ?? UNKNOWN : UNKNOWN;
}

export function getGameplayThumbnailForBuild(id: string | undefined): GameplayThumbnail {
  return id ? builds.get(id) ?? UNKNOWN : UNKNOWN;
}

export function getDisplayVisualForHotbarEntry(entry: HotbarEntry): GameplayThumbnail {
  if (entry.type === "empty") return EMPTY;
  return entry.type === "item"
    ? getGameplayThumbnailForItem(entry.id)
    : getGameplayThumbnailForBuild(entry.id);
}
