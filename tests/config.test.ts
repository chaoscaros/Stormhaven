import { describe, expect, it } from "vitest";
import { PLAYER_CONFIG, WORLD_CONFIG } from "../src/core/config";

describe("基础工程配置", () => {
  it("使用 Vertical Slice 规划的世界尺寸", () => {
    expect(WORLD_CONFIG.sizeMeters).toBe(500);
    expect(WORLD_CONFIG.groundThicknessMeters).toBeGreaterThan(0);
  });

  it("奔跑速度必须大于行走速度", () => {
    expect(PLAYER_CONFIG.runSpeedMetersPerSecond).toBeGreaterThan(
      PLAYER_CONFIG.walkSpeedMetersPerSecond,
    );
  });
});
