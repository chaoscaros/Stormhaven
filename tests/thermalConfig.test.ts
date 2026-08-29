import { describe, expect, it } from "vitest";
import thermalConfigData from "../data/survival/thermal.json";
import { parseThermalConfig } from "../src/survival/thermal/ThermalConfig";

describe("ThermalConfig", () => {
  it("解析当前 Data Driven Thermal 配置", () => {
    const config = parseThermalConfig(thermalConfigData);

    expect(config).toMatchObject({
      initialThermalValue: 80,
      windStrengthAtMaxPenalty: 28,
      maxWindChillPenaltyCelsius: 12,
    });
  });

  it("拒绝非法温度阈值顺序", () => {
    const invalid = { ...thermalConfigData, coldThresholdCelsius: 0 };

    expect(() => parseThermalConfig(invalid)).toThrow(
      "温度阈值必须按 neutral > cold > freezing > severe",
    );
  });

  it("拒绝负数 Rate", () => {
    const invalid = { ...thermalConfigData, thermalLossRateColdPerSecond: -0.1 };

    expect(() => parseThermalConfig(invalid)).toThrow(
      "thermalLossRateColdPerSecond 不能小于 0",
    );
  });

  it("拒绝超出 min/max 的初始值", () => {
    const invalid = { ...thermalConfigData, initialThermalValue: 101 };

    expect(() => parseThermalConfig(invalid)).toThrow(
      "initialThermalValue 必须位于 min/max 范围内",
    );
  });
});
