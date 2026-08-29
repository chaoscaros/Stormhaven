export interface PrecipitationPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PrecipitationCollisionBounds {
  readonly min: PrecipitationPoint;
  readonly max: PrecipitationPoint;
}

/** 线段与 AABB 的 Slab 检测，用于避免高速降水粒子单帧穿透静态障碍。 */
export function segmentIntersectsPrecipitationBounds(
  start: PrecipitationPoint,
  end: PrecipitationPoint,
  bounds: PrecipitationCollisionBounds,
): boolean {
  let entry = 0;
  let exit = 1;
  for (const axis of ["x", "y", "z"] as const) {
    const origin = start[axis];
    const delta = end[axis] - origin;
    const minimum = bounds.min[axis];
    const maximum = bounds.max[axis];
    if (Math.abs(delta) < Number.EPSILON) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) return false;
  }
  return true;
}
