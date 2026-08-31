import type { PrecipitationCollisionBounds } from "./PrecipitationCollision";

/** 共享降水 AABB 注册表；固定世界和动态建筑通过稳定 ID 增量维护。 */
export class PrecipitationObstacleRegistry {
  readonly #bounds = new Map<string, PrecipitationCollisionBounds>();
  #snapshot: readonly PrecipitationCollisionBounds[] = Object.freeze([]);

  add(id: string, bounds: PrecipitationCollisionBounds): void {
    if (id.trim().length === 0) throw new Error("Precipitation Obstacle ID 不能为空。");
    if (this.#bounds.has(id)) throw new Error(`Precipitation Obstacle ID 重复：${id}`);
    this.#bounds.set(id, freezeBounds(bounds));
    this.#refreshSnapshot();
  }

  update(id: string, bounds: PrecipitationCollisionBounds): void {
    if (!this.#bounds.has(id)) throw new Error(`不存在 Precipitation Obstacle ID：${id}`);
    this.#bounds.set(id, freezeBounds(bounds));
    this.#refreshSnapshot();
  }

  remove(id: string): boolean {
    const removed = this.#bounds.delete(id);
    if (removed) this.#refreshSnapshot();
    return removed;
  }

  has(id: string): boolean {
    return this.#bounds.has(id);
  }

  getAll(): readonly PrecipitationCollisionBounds[] {
    return this.#snapshot;
  }

  #refreshSnapshot(): void {
    this.#snapshot = Object.freeze([...this.#bounds.values()]);
  }
}

function freezeBounds(bounds: PrecipitationCollisionBounds): PrecipitationCollisionBounds {
  for (const value of [
    bounds.min.x, bounds.min.y, bounds.min.z,
    bounds.max.x, bounds.max.y, bounds.max.z,
  ]) {
    if (!Number.isFinite(value)) throw new Error("Precipitation Obstacle Bounds 必须是有限数值。");
  }
  if (
    bounds.min.x > bounds.max.x
    || bounds.min.y > bounds.max.y
    || bounds.min.z > bounds.max.z
  ) throw new Error("Precipitation Obstacle Bounds min 不能大于 max。");
  return Object.freeze({
    min: Object.freeze({ ...bounds.min }),
    max: Object.freeze({ ...bounds.max }),
  });
}
