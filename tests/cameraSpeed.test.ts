import { describe, expect, it } from "vitest";
import { toBabylonCameraSpeed } from "../src/player/cameraSpeed";

describe("Babylon Camera Speed 换算", () => {
  it("保持米/秒配置的相对速度", () => {
    const walkSpeed = toBabylonCameraSpeed(4.5);
    const runSpeed = toBabylonCameraSpeed(7.5);

    expect(runSpeed / walkSpeed).toBeCloseTo(7.5 / 4.5);
    expect(runSpeed).toBeGreaterThan(walkSpeed);
  });

  it("拒绝负数或非有限速度", () => {
    expect(() => toBabylonCameraSpeed(-1)).toThrow();
    expect(() => toBabylonCameraSpeed(Number.NaN)).toThrow();
  });
});
