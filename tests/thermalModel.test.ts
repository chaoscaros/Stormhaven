import { describe, expect, it } from "vitest";
import thermalConfigData from "../data/survival/thermal.json";
import {
  parseThermalConfig,
  type ThermalConfig,
} from "../src/survival/thermal/ThermalConfig";
import { ThermalModel } from "../src/survival/thermal/ThermalModel";

const config = parseThermalConfig(thermalConfigData);

describe("ThermalModel", () => {
  it("温暖环境让 Thermal Value 恢复", () => {
    const model = new ThermalModel(config);
    const before = model.snapshot.currentValue;

    const snapshot = model.update(inputs(12, 0, 0, 60));

    expect(snapshot.currentValue).toBeGreaterThan(before);
    expect(snapshot.trend).toBe("warming");
  });

  it("寒冷环境让 Thermal Value 下降", () => {
    const model = new ThermalModel(config);

    const snapshot = model.update(inputs(-12, 0, 0, 60));

    expect(snapshot.currentValue).toBeLessThan(config.initialThermalValue);
    expect(snapshot.trend).toBe("cooling");
  });

  it("严重寒冷比轻度寒冷下降更快", () => {
    const mild = new ThermalModel(config).update(inputs(-7, 0, 0, 1));
    const severe = new ThermalModel(config).update(inputs(-40, 0, 0, 1));

    expect(Math.abs(severe.changeRatePerSecond)).toBeGreaterThan(
      Math.abs(mild.changeRatePerSecond),
    );
  });

  it("30/60/120 FPS 模拟 60 秒结果一致", () => {
    const values = [30, 60, 120].map((fps) => simulateAtFps(fps, 60));

    expect(values[0]).toBeCloseTo(values[1] ?? 0, 8);
    expect(values[1]).toBeCloseTo(values[2] ?? 0, 8);
  });

  it("deltaSeconds 0 不改变 Thermal Value", () => {
    const model = new ThermalModel(config);

    model.update(inputs(-30, 0, 20, 0));

    expect(model.snapshot.currentValue).toBe(config.initialThermalValue);
  });

  it("拒绝负 deltaSeconds", () => {
    const model = new ThermalModel(config);

    expect(() => model.update(inputs(-10, 0, 0, -1))).toThrow(
      "deltaSeconds 必须是大于或等于 0",
    );
  });

  it("Thermal Value 不低于 min", () => {
    const model = new ThermalModel(config);

    model.update(inputs(-50, 0, 28, 100_000));

    expect(model.snapshot.currentValue).toBe(config.minThermalValue);
  });

  it("Thermal Value 不高于 max", () => {
    const model = new ThermalModel(config);

    model.update(inputs(20, 0, 0, 100_000));

    expect(model.snapshot.currentValue).toBe(config.maxThermalValue);
  });

  it.each([
    [75, "comfortable"],
    [55, "cool"],
    [35, "cold"],
    [15, "freezing"],
    [0, "critical"],
  ] as const)("Thermal Value %s 对应状态 %s", (initialValue, status) => {
    const model = new ThermalModel(withInitialValue(initialValue));

    expect(model.snapshot.status).toBe(status);
  });
});

function inputs(
  ambientTemperatureCelsius: number,
  temperatureModifierCelsius: number,
  windStrength: number,
  deltaSeconds: number,
) {
  return {
    ambientTemperatureCelsius,
    temperatureModifierCelsius,
    windStrength,
    shelterTemperatureBonusCelsius: 0,
    externalHeatBonusCelsius: 0,
    deltaSeconds,
  };
}

function simulateAtFps(fps: number, seconds: number): number {
  const model = new ThermalModel(config);
  for (let frame = 0; frame < fps * seconds; frame += 1) {
    model.update(inputs(-18, -12, 28, 1 / fps));
  }
  return model.snapshot.currentValue;
}

function withInitialValue(initialThermalValue: number): ThermalConfig {
  return parseThermalConfig({ ...thermalConfigData, initialThermalValue });
}
