import { describe, expect, it } from "vitest";
import { PlayerVerticalMotion } from "../src/player/PlayerVerticalMotion";

describe("PlayerVerticalMotion", () => {
  it("在地面触发跳跃后产生向上位移", () => {
    const motion = createMotion();

    expect(motion.tryJump(true)).toBe(true);
    expect(motion.update(1 / 60, true)).toBeGreaterThan(0);
    expect(motion.velocityMetersPerSecond).toBeGreaterThan(0);
  });

  it("离地时拒绝再次跳跃", () => {
    const motion = createMotion();

    motion.tryJump(true);

    expect(motion.tryJump(false)).toBe(false);
    expect(motion.velocityMetersPerSecond).toBe(7);
  });

  it("落地且速度向下时停止垂直运动", () => {
    const motion = createMotion();

    motion.tryJump(true);
    motion.update(1, false);

    expect(motion.update(1 / 60, true)).toBe(0);
    expect(motion.velocityMetersPerSecond).toBe(0);
  });
});

function createMotion(): PlayerVerticalMotion {
  return new PlayerVerticalMotion({
    gravityMetersPerSecondSquared: 9.81,
    jumpSpeedMetersPerSecond: 7,
  });
}
