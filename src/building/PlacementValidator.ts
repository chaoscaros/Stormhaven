import { BUILDING_CONFIG } from "./BuildingConfig";
import { boundsOverlap, createBuildingBounds, normalizeRotationDegrees, snapCoordinateToGrid } from "./BuildingGeometry";
import type {
  BuildDefinition,
  BuildPlacement,
  BuildingBounds,
  BuildingVector3,
  PlacementValidationResult,
  SnapPoint,
} from "./BuildingTypes";
import type { WorldBuildingRegistry } from "./WorldBuildingRegistry";

export interface PlacementValidationContext {
  readonly playerPosition: BuildingVector3;
  readonly candidate: BuildPlacement;
}

/** 纯 AABB/距离/Support 放置校验；不依赖 Ray、Mesh 或 Scene。 */
export class PlacementValidator {
  constructor(
    private readonly registry: WorldBuildingRegistry,
    private readonly staticBounds: readonly BuildingBounds[] = Object.freeze([]),
  ) {}

  validate(
    definition: BuildDefinition,
    context: PlacementValidationContext,
  ): PlacementValidationResult {
    const resolved = this.#resolvePlacement(definition, context.candidate);
    if ("reason" in resolved) return Object.freeze({ valid: false, reason: resolved.reason });
    const bounds = createBuildingBounds(definition, resolved.position, resolved.rotationDegrees);
    if (distance(context.playerPosition, resolved.position) > BUILDING_CONFIG.maximumBuildDistanceMeters) {
      return Object.freeze({ valid: false, reason: "out_of_range", bounds, placement: resolved });
    }
    const blocked = [...this.staticBounds, ...this.registry.getBounds()].some((existing) =>
      boundsOverlap(bounds, existing, BUILDING_CONFIG.overlapEpsilonMeters));
    if (blocked) return Object.freeze({ valid: false, reason: "blocked", bounds, placement: resolved });
    return Object.freeze({ valid: true, reason: "ok", bounds, placement: resolved });
  }

  #resolvePlacement(
    definition: BuildDefinition,
    candidate: BuildPlacement,
  ): BuildPlacement | { readonly reason: PlacementValidationResult["reason"] } {
    if (definition.category === "foundation") {
      if (candidate.surface !== "ground") return { reason: "invalid_surface" };
      return Object.freeze({
        position: Object.freeze({
          x: snapCoordinateToGrid(
            candidate.position.x,
            BUILDING_CONFIG.gridSizeMeters,
            BUILDING_CONFIG.foundationGridOriginMeters.x,
          ),
          y: definition.size.y / 2,
          z: snapCoordinateToGrid(
            candidate.position.z,
            BUILDING_CONFIG.gridSizeMeters,
            BUILDING_CONFIG.foundationGridOriginMeters.z,
          ),
        }),
        rotationDegrees: normalizeRotationDegrees(candidate.rotationDegrees),
        surface: "ground" as const,
      });
    }
    if (!candidate.snapPointId) return { reason: "snap_required" };
    let snapPoint: SnapPoint;
    try {
      snapPoint = this.registry.getSnapPoint(candidate.snapPointId);
    } catch {
      return { reason: "snap_required" };
    }
    if (snapPoint.occupied) return { reason: "snap_occupied" };
    if (snapPoint.type !== "wall") return { reason: "unsupported" };
    return Object.freeze({
      position: Object.freeze({
        x: snapPoint.position.x,
        y: snapPoint.position.y + definition.size.y / 2,
        z: snapPoint.position.z,
      }),
      rotationDegrees: snapPoint.rotationDegrees,
      surface: "building" as const,
      snapPointId: snapPoint.id,
    });
  }
}

function distance(first: BuildingVector3, second: BuildingVector3): number {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
}
