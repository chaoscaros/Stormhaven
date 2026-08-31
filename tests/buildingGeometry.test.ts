import { describe, expect, it } from "vitest";
import {
  normalizeRotationDegrees,
  snapCoordinateToGrid,
} from "../src/building/BuildingGeometry";
import { BUILDING_CONFIG, BUILDING_INPUT_CONFIG } from "../src/building/BuildingConfig";

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

  it("使用场景原点让地基边缘与测试木屋外沿无缝相接", () => {
    expect(BUILDING_CONFIG.foundationGridOriginMeters).toEqual({ x: 0, z: 1 });
    const frontFoundationCenter = snapCoordinateToGrid(
      3.6,
      BUILDING_CONFIG.gridSizeMeters,
      BUILDING_CONFIG.foundationGridOriginMeters.z,
    );
    const backFoundationCenter = snapCoordinateToGrid(
      14.6,
      BUILDING_CONFIG.gridSizeMeters,
      BUILDING_CONFIG.foundationGridOriginMeters.z,
    );
    expect(frontFoundationCenter + BUILDING_CONFIG.gridSizeMeters / 2).toBe(4);
    expect(backFoundationCenter - BUILDING_CONFIG.gridSizeMeters / 2).toBe(14);
  });

  it.each([
    [450, 90],
    [-90, 270],
    [720, 0],
  ])("Rotation %s 归一化为 %s", (value, expected) => {
    expect(normalizeRotationDegrees(value)).toBe(expected);
  });
});
