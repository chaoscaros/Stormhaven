export interface SpatialPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function parseSpatialPoint(value: unknown, label: string): SpatialPoint {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是坐标对象。`);
  }
  const record = value as Record<string, unknown>;
  return Object.freeze({
    x: readCoordinate(record.x, `${label}.x`),
    y: readCoordinate(record.y, `${label}.y`),
    z: readCoordinate(record.z, `${label}.z`),
  });
}

export function distanceBetween(a: SpatialPoint, b: SpatialPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function readCoordinate(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} 必须是有限数值。`);
  }
  return value;
}
