import type { BuildDefinition, BuildingBounds, SnapPoint, WorldBuilding } from "./BuildingTypes";
import { createBuildingBounds, createFoundationWallSnapPoints } from "./BuildingGeometry";

interface RegisteredBuilding {
  readonly entity: WorldBuilding;
  readonly bounds: BuildingBounds;
  readonly consumedSnapPointId?: string;
}

/** 当前运行会话的纯 World Building 与 Snap Point 注册表，不持有 Babylon Mesh。 */
export class WorldBuildingRegistry {
  readonly #buildings = new Map<string, RegisteredBuilding>();
  readonly #snapPoints = new Map<string, SnapPoint>();

  has(id: string): boolean {
    return this.#buildings.has(id);
  }

  get(id: string): WorldBuilding {
    const registered = this.#buildings.get(id);
    if (!registered) throw new Error(`不存在 WorldBuilding ID：${id}`);
    return registered.entity;
  }

  getAll(): readonly WorldBuilding[] {
    return Object.freeze([...this.#buildings.values()].map(({ entity }) => entity));
  }

  getBounds(): readonly BuildingBounds[] {
    return Object.freeze([...this.#buildings.values()].map(({ bounds }) => bounds));
  }

  getSnapPoint(id: string): SnapPoint {
    const point = this.#snapPoints.get(id);
    if (!point) throw new Error(`不存在 SnapPoint ID：${id}`);
    return point;
  }

  getSnapPoints(type?: SnapPoint["type"]): readonly SnapPoint[] {
    return Object.freeze([...this.#snapPoints.values()]
      .filter((point) => type === undefined || point.type === type));
  }

  assertCanRegister(entity: WorldBuilding, snapPointId?: string): void {
    if (this.#buildings.has(entity.id)) throw new Error(`WorldBuilding ID 重复：${entity.id}`);
    if (snapPointId) {
      const point = this.getSnapPoint(snapPointId);
      if (point.occupied) throw new Error(`SnapPoint 已占用：${snapPointId}`);
    }
  }

  register(entity: WorldBuilding, definition: BuildDefinition, snapPointId?: string): void {
    this.assertCanRegister(entity, snapPointId);
    const bounds = createBuildingBounds(definition, entity.position, entity.rotationDegrees);
    this.#buildings.set(entity.id, Object.freeze({
      entity,
      bounds,
      ...(snapPointId ? { consumedSnapPointId: snapPointId } : {}),
    }));
    for (const point of createFoundationWallSnapPoints(entity, definition)) {
      if (this.#snapPoints.has(point.id)) throw new Error(`SnapPoint ID 重复：${point.id}`);
      this.#snapPoints.set(point.id, point);
    }
    if (snapPointId) {
      const point = this.getSnapPoint(snapPointId);
      this.#snapPoints.set(snapPointId, Object.freeze({ ...point, occupied: true }));
    }
  }

  /** 仅供事务失败回滚和 Runtime Dispose；当前没有 Demolish Gameplay。 */
  unregister(id: string): boolean {
    const registered = this.#buildings.get(id);
    if (!registered) return false;
    this.#buildings.delete(id);
    for (const [pointId, point] of this.#snapPoints) {
      if (point.ownerBuildingId === id) this.#snapPoints.delete(pointId);
    }
    if (registered.consumedSnapPointId) {
      const point = this.#snapPoints.get(registered.consumedSnapPointId);
      if (point) {
        this.#snapPoints.set(point.id, Object.freeze({ ...point, occupied: false }));
      }
    }
    return true;
  }
}
