import { parseSpatialPoint, type SpatialPoint } from "../environment/SpatialPoint";

export interface AxisAlignedBounds {
  readonly min: SpatialPoint;
  readonly max: SpatialPoint;
}

/** 纯 AABB 空间判断；边界点按“位于 Volume 内”处理。 */
export class AxisAlignedVolume {
  readonly bounds: AxisAlignedBounds;

  constructor(bounds: AxisAlignedBounds) {
    validateBounds(bounds, "AxisAlignedVolume");
    this.bounds = Object.freeze({ min: bounds.min, max: bounds.max });
  }

  static parseBounds(value: unknown, label: string): AxisAlignedBounds {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`${label} 必须是 Bounds 对象。`);
    }
    const record = value as Record<string, unknown>;
    const bounds = Object.freeze({
      min: parseSpatialPoint(record.min, `${label}.min`),
      max: parseSpatialPoint(record.max, `${label}.max`),
    });
    validateBounds(bounds, label);
    return bounds;
  }

  contains(point: SpatialPoint): boolean {
    const { min, max } = this.bounds;
    return point.x >= min.x && point.x <= max.x
      && point.y >= min.y && point.y <= max.y
      && point.z >= min.z && point.z <= max.z;
  }
}

function validateBounds(bounds: AxisAlignedBounds, label: string): void {
  if (!(bounds.min.x < bounds.max.x
    && bounds.min.y < bounds.max.y
    && bounds.min.z < bounds.max.z)) {
    throw new Error(`${label} 的 min 必须在所有轴上严格小于 max。`);
  }
}
