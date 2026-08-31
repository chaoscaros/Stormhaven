import type {
  BuildDefinition,
  BuildingBounds,
  BuildingVector3,
  SnapPoint,
  WorldBuilding,
} from "./BuildingTypes";

export function snapCoordinateToGrid(value: number, gridSize: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(gridSize) || gridSize <= 0) {
    throw new Error("Grid Snap 需要有限坐标和正数 Grid Size。");
  }
  const snapped = Math.round(value / gridSize) * gridSize;
  return Object.is(snapped, -0) ? 0 : snapped;
}

export function normalizeRotationDegrees(rotationDegrees: number): number {
  if (!Number.isFinite(rotationDegrees)) throw new Error("Rotation 必须是有限数值。");
  return ((rotationDegrees % 360) + 360) % 360;
}

export function getRotatedFootprint(
  size: BuildingVector3,
  rotationDegrees: number,
): BuildingVector3 {
  const normalized = normalizeRotationDegrees(rotationDegrees);
  const quarterTurns = Math.round(normalized / 90) % 2;
  return Object.freeze(quarterTurns === 1
    ? { x: size.z, y: size.y, z: size.x }
    : { x: size.x, y: size.y, z: size.z });
}

export function createBuildingBounds(
  definition: BuildDefinition,
  position: BuildingVector3,
  rotationDegrees: number,
): BuildingBounds {
  const size = getRotatedFootprint(definition.size, rotationDegrees);
  return Object.freeze({
    min: Object.freeze({
      x: position.x - size.x / 2,
      y: position.y - size.y / 2,
      z: position.z - size.z / 2,
    }),
    max: Object.freeze({
      x: position.x + size.x / 2,
      y: position.y + size.y / 2,
      z: position.z + size.z / 2,
    }),
  });
}

export function boundsOverlap(
  first: BuildingBounds,
  second: BuildingBounds,
  epsilon = 0,
): boolean {
  return first.min.x < second.max.x - epsilon
    && first.max.x > second.min.x + epsilon
    && first.min.y < second.max.y - epsilon
    && first.max.y > second.min.y + epsilon
    && first.min.z < second.max.z - epsilon
    && first.max.z > second.min.z + epsilon;
}

/** Foundation 的 Snap Point 保存墙体底边中心，Wall 放置时再叠加自身半高。 */
export function createFoundationWallSnapPoints(
  building: WorldBuilding,
  definition: BuildDefinition,
): readonly SnapPoint[] {
  if (definition.category !== "foundation") return Object.freeze([]);
  const size = getRotatedFootprint(definition.size, building.rotationDegrees);
  const topY = building.position.y + size.y / 2;
  const points = [
    { suffix: "north", x: building.position.x, z: building.position.z - size.z / 2, rotation: 0 },
    { suffix: "east", x: building.position.x + size.x / 2, z: building.position.z, rotation: 90 },
    { suffix: "south", x: building.position.x, z: building.position.z + size.z / 2, rotation: 180 },
    { suffix: "west", x: building.position.x - size.x / 2, z: building.position.z, rotation: 270 },
  ];
  return Object.freeze(points.map((point) => Object.freeze({
    id: `${building.id}:${point.suffix}`,
    ownerBuildingId: building.id,
    type: "wall" as const,
    position: Object.freeze({ x: point.x, y: topY, z: point.z }),
    rotationDegrees: point.rotation,
    occupied: false,
  })));
}
