import { describe, expect, it } from "vitest";
import { segmentIntersectsPrecipitationBounds } from "../src/weather/presentation/PrecipitationCollision";
import { PrecipitationObstacleRegistry } from "../src/weather/presentation/PrecipitationObstacleRegistry";

const wall = {
  min: { x: -1, y: 0, z: -0.1 },
  max: { x: 1, y: 2.4, z: 0.1 },
};

describe("PrecipitationObstacleRegistry", () => {
  it("静态与动态障碍可以增量注册", () => {
    const registry = new PrecipitationObstacleRegistry();
    registry.add("static:cabin", wall);
    registry.add("building:wall", {
      min: { x: 2, y: 0, z: -0.1 },
      max: { x: 4, y: 2.4, z: 0.1 },
    });
    expect(registry.getAll()).toHaveLength(2);
  });

  it("remove 后不再产生碰撞", () => {
    const registry = new PrecipitationObstacleRegistry();
    registry.add("building:wall", wall);
    expect(registry.remove("building:wall")).toBe(true);
    expect(registry.getAll().some((bounds) =>
      segmentIntersectsPrecipitationBounds(
        { x: 0, y: 1, z: -1 },
        { x: 0, y: 1, z: 1 },
        bounds,
      ))).toBe(false);
  });

  it("update Bounds 立即生效", () => {
    const registry = new PrecipitationObstacleRegistry();
    registry.add("building:wall", wall);
    registry.update("building:wall", {
      min: { x: 5, y: 0, z: -0.1 },
      max: { x: 7, y: 2.4, z: 0.1 },
    });
    expect(registry.getAll()[0]?.min.x).toBe(5);
  });

  it("重复 ID 被明确拒绝", () => {
    const registry = new PrecipitationObstacleRegistry();
    registry.add("building:wall", wall);
    expect(() => registry.add("building:wall", wall)).toThrow(/重复/);
  });

  it("Snow Segment Collision 能命中新建 Wall AABB", () => {
    const registry = new PrecipitationObstacleRegistry();
    registry.add("building:wall", wall);
    expect(segmentIntersectsPrecipitationBounds(
      { x: 0, y: 1.2, z: -2 },
      { x: 0, y: 1.2, z: 2 },
      registry.getAll()[0]!,
    )).toBe(true);
  });
});
