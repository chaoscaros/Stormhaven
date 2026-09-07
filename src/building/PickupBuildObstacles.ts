import type { WorldPickupPlacement } from "../world/pickups/WorldPickupPlacement";
import type { WorldPickupRegistry } from "../world/pickups/WorldPickupRegistry";
import type { BuildingBounds, BuildingVector3 } from "./BuildingTypes";

/** Conservative placement envelopes around the scenario's legacy pickup centers.
 * These cover both fallback proxies and current art, without blocking player movement.
 * Update this contract when pickup art or placement anchors change.
 */
const SIZES: Readonly<Record<string, BuildingVector3>> = {
  wood: { x: 0.95, y: 0.24, z: 0.38 },
  stone: { x: 0.64, y: 0.6, z: 0.6 },
  stick: { x: 1.12, y: 0.24, z: 0.62 },
  water_bottle: { x: 0.32, y: 0.8, z: 0.32 },
  canned_food: { x: 0.4, y: 0.6, z: 0.4 },
};
const FALLBACK_SIZE = { x: 0.45, y: 0.45, z: 0.45 };

/** Reads live quantities on every query, including after save restoration. No Mesh/DOM. */
export class PickupBuildObstacles {
  readonly #entries: readonly { readonly id: string; readonly bounds: BuildingBounds }[];

  constructor(placements: readonly WorldPickupPlacement[], private readonly registry: WorldPickupRegistry) {
    this.#entries = placements.map(({ pickup, position }) => {
      const size = SIZES[pickup.itemId] ?? FALLBACK_SIZE;
      return {
        id: pickup.id,
        bounds: Object.freeze({
          min: Object.freeze({ x: position.x - size.x / 2, y: position.y - size.y / 2, z: position.z - size.z / 2 }),
          max: Object.freeze({ x: position.x + size.x / 2, y: position.y + size.y / 2, z: position.z + size.z / 2 }),
        }),
      };
    });
  }

  getBounds(): readonly BuildingBounds[] {
    return this.#entries.filter(({ id }) => {
      const pickup = this.registry.get(id);
      return pickup !== undefined && !pickup.consumed && pickup.quantity > 0;
    }).map(({ bounds }) => bounds);
  }
}
