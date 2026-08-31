import { describe, expect, it } from "vitest";
import {
  normalizeRotationDegrees,
  snapCoordinateToGrid,
} from "../src/building/BuildingGeometry";
import { BUILDING_INPUT_CONFIG } from "../src/building/BuildingConfig";

describe("Building Grid 与 Rotation", () => {
  it("Build Mode 输入集中配置为 B / R / Esc", () => {
    expect(BUILDING_INPUT_CONFIG).toEqual({
      toggleKeyCode: "KeyB",
      rotateKeyCode: "KeyR",
      cancelKeyCode: "Escape",
    });
  });
  it.each([
    [0.9, 0],
    [1, 2],
    [2.9, 2],
    [3, 4],
  ])("将正坐标 %s 吸附到 %s", (value, expected) => {
    expect(snapCoordinateToGrid(value, 2)).toBe(expected);
  });

  it.each([
    [-0.9, 0],
    [-1, 0],
    [-1.01, -2],
    [-3, -2],
  ])("正确处理负坐标和边界 %s → %s", (value, expected) => {
    expect(snapCoordinateToGrid(value, 2)).toBe(expected);
  });

  it.each([
    [450, 90],
    [-90, 270],
    [720, 0],
  ])("Rotation %s 归一化为 %s", (value, expected) => {
    expect(normalizeRotationDegrees(value)).toBe(expected);
  });
});
