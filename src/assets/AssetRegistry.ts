/** Presentation-only IDs. Gameplay definitions and Save v1 never contain these URLs. */
export const GAME_ASSET_IDS = [
  "pickup_wood", "pickup_stone", "pickup_stick", "pickup_water_bottle",
  "pickup_canned_food", "pickup_raw_meat", "building_foundation_wood",
  "building_wall_wood", "building_campfire", "environment_cabin",
] as const;
export type GameAssetId = typeof GAME_ASSET_IDS[number];
export type AssetStage = "environment" | "items" | "buildings";
export interface AssetDefinition {
  readonly id: GameAssetId;
  readonly stage: AssetStage;
  readonly urls: readonly string[];
  readonly scale: number;
  readonly rotationOffset: number;
  /** Offset from the existing domain placement to the model's bottom-center. */
  readonly positionOffset: Readonly<{ x: number; y: number; z: number }>;
}

function asset(id: GameAssetId, stage: AssetStage, files: readonly string[], y = 0): AssetDefinition {
  return Object.freeze({ id, stage, urls: Object.freeze(files.map(file => `assets/models/${stage === "buildings" ? "buildings" : stage}/${file}.glb`)),
    scale: 1, rotationOffset: 0, positionOffset: Object.freeze({ x: 0, y, z: 0 }) });
}

export const ASSET_DEFINITIONS: readonly AssetDefinition[] = Object.freeze([
  asset("pickup_wood", "items", ["split-log"], -.12),
  asset("pickup_stone", "items", ["granite-1", "granite-2", "granite-3"], -.3),
  asset("pickup_stick", "items", ["branched-stick"], -.12),
  asset("pickup_water_bottle", "items", ["water-bottle"], -.4),
  asset("pickup_canned_food", "items", ["ration-can"], -.28),
  asset("pickup_raw_meat", "items", ["raw-meat"], -.225),
  asset("building_foundation_wood", "buildings", ["wood-foundation"]),
  asset("building_wall_wood", "buildings", ["wood-wall"]),
  asset("building_campfire", "buildings", ["campfire"]),
  asset("environment_cabin", "environment", ["cabin"]),
]);

export class AssetRegistry {
  readonly #entries = new Map<string, AssetDefinition>();
  constructor(definitions: readonly AssetDefinition[] = ASSET_DEFINITIONS) {
    for (const definition of definitions) {
      if (this.#entries.has(definition.id)) throw new Error(`Duplicate asset ID: ${definition.id}`);
      if (!Number.isFinite(definition.scale) || definition.scale <= 0
        || !Number.isFinite(definition.rotationOffset)
        || !Object.values(definition.positionOffset).every(Number.isFinite)
        || definition.urls.length === 0
        || definition.urls.some(url => !/^assets\/models\/(items|buildings|environment)\/[a-z0-9-]+\.glb$/.test(url))) {
        throw new Error(`Invalid asset metadata: ${definition.id}`);
      }
      this.#entries.set(definition.id, definition);
    }
  }
  get(id: string): AssetDefinition | undefined { return this.#entries.get(id); }
  getAll(): readonly AssetDefinition[] { return [...this.#entries.values()]; }
}

export function pickupAssetId(itemId: string): string { return `pickup_${itemId}`; }
export function buildingAssetId(definitionId: string): string {
  return ({ foundation_wood: "building_foundation_wood", wall_wood: "building_wall_wood", campfire_basic: "building_campfire" } as Readonly<Record<string, string>>)[definitionId] ?? `building_${definitionId}`;
}

/** Stable per-entity visual variation; never advances gameplay RNG or changes Save. */
export function assetVariantIndex(instanceId: string, count: number): number {
  let hash = 2166136261;
  for (const char of instanceId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % count;
}

export function localAssetUrl(path: string): string { return `${import.meta.env.BASE_URL}${path}`; }
