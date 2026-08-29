import { describe, expect, it } from "vitest";
import { segmentIntersectsPrecipitationBounds } from "../src/weather/presentation/PrecipitationCollision";

const roof = {
  min: { x: -5, y: 4, z: 4 },
  max: { x: 5, y: 4.3, z: 14 },
};

describe("Precipitation Collision", () => {
  it("检测从屋顶上方向室内移动的粒子", () => {
    expect(segmentIntersectsPrecipitationBounds(
      { x: 0, y: 6, z: 9 },
      { x: 0, y: 3, z: 9 },
      roof,
    )).toBe(true);
  });

  it("不会阻挡从入口开口通过且未碰到墙体的粒子", () => {
    expect(segmentIntersectsPrecipitationBounds(
      { x: 0, y: 2, z: 3 },
      { x: 0, y: 2, z: 5 },
      roof,
    )).toBe(false);
  });

  it("单帧跨过薄障碍时仍能检测碰撞", () => {
    expect(segmentIntersectsPrecipitationBounds(
      { x: 4.9, y: 4.6, z: 13.9 },
      { x: 4.9, y: 3.7, z: 13.9 },
      roof,
    )).toBe(true);
  });

  it("完全位于障碍外且平行的线段不碰撞", () => {
    expect(segmentIntersectsPrecipitationBounds(
      { x: 8, y: 5, z: 9 },
      { x: 8, y: 2, z: 9 },
      roof,
    )).toBe(false);
  });
});
