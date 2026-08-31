import { describe, expect, it } from "vitest";
import { HeatSourceSystem } from "../src/survival/heat/HeatSourceSystem";
import { parseSurvivalEnvironmentScenario } from "../src/survival/environment/SurvivalEnvironmentScenario";

const config = HeatSourceSystem.parseConfig({
  maxCombinedHeatBonusCelsius: 15,
  profiles: [{
    id: "heater",
    displayName: "测试炉",
    radiusMeters: 5,
    maxTemperatureBonusCelsius: 10,
  }],
});

function createSystem(placements: unknown[]) {
  const scenario = parseSurvivalEnvironmentScenario({ shelters: [], heatSources: placements });
  return new HeatSourceSystem(config, scenario.heatSources);
}

describe("HeatSourceSystem", () => {
  it("中心为最大值，半径边界及外部为零", () => {
    const system = createSystem([source("one", 0, true)]);

    expect(system.getContribution({ x: 0, y: 0, z: 0 }).temperatureBonusCelsius).toBe(10);
    expect(system.getContribution({ x: 5, y: 0, z: 0 }).temperatureBonusCelsius).toBe(0);
    expect(system.getContribution({ x: 6, y: 0, z: 0 }).temperatureBonusCelsius).toBe(0);
  });

  it("距离增大时平滑且单调递减", () => {
    const system = createSystem([source("one", 0, true)]);
    const values = [0, 1, 2, 3, 4, 5].map((x) =>
      system.getContribution({ x, y: 0, z: 0 }).temperatureBonusCelsius);

    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeLessThanOrEqual(values[index - 1] ?? 0);
    }
  });

  it("禁用热源不贡献温度", () => {
    const system = createSystem([source("one", 0, false)]);
    expect(system.getContribution({ x: 0, y: 0, z: 0 }).temperatureBonusCelsius).toBe(0);
  });

  it("多个热源相加但受全局上限约束", () => {
    const system = createSystem([source("one", 0, true), source("two", 0, true)]);
    const result = system.getContribution({ x: 0, y: 0, z: 0 });

    expect(result.temperatureBonusCelsius).toBe(15);
    expect(result.contributingSourceIds).toEqual(["one", "two"]);
  });

  it("支持 Runtime add / enable / position / remove", () => {
    const system = createSystem([]);
    system.add(source("dynamic", 0, false));
    expect(system.getContribution({ x: 0, y: 0, z: 0 }).temperatureBonusCelsius).toBe(0);
    system.setEnabled("dynamic", true);
    expect(system.getContribution({ x: 0, y: 0, z: 0 }).temperatureBonusCelsius).toBe(10);
    system.updatePosition("dynamic", { x: 20, y: 0, z: 0 });
    expect(system.getContribution({ x: 0, y: 0, z: 0 }).temperatureBonusCelsius).toBe(0);
    expect(system.remove("dynamic")).toBe(true);
    expect(system.has("dynamic")).toBe(false);
  });

  it("拒绝非正半径与重复 Profile ID", () => {
    expect(() => HeatSourceSystem.parseConfig({
      maxCombinedHeatBonusCelsius: 10,
      profiles: [{
        id: "bad",
        displayName: "无效",
        radiusMeters: 0,
        maxTemperatureBonusCelsius: 1,
      }],
    })).toThrow("必须大于 0");
    expect(() => HeatSourceSystem.parseConfig({
      maxCombinedHeatBonusCelsius: 10,
      profiles: [
        { id: "same", displayName: "一", radiusMeters: 1, maxTemperatureBonusCelsius: 1 },
        { id: "same", displayName: "二", radiusMeters: 1, maxTemperatureBonusCelsius: 1 },
      ],
    })).toThrow("ID 重复");
  });
});

function source(id: string, x: number, enabled: boolean) {
  return { id, profileId: "heater", position: { x, y: 0, z: 0 }, enabled };
}
