import { describe, expect, it } from "vitest";
import { ShelterSystem } from "../src/survival/shelter/ShelterSystem";
import { parseSurvivalEnvironmentScenario } from "../src/survival/environment/SurvivalEnvironmentScenario";

const profiles = ShelterSystem.parseProfiles([
  {
    id: "cabin",
    displayName: "测试木屋",
    windProtection: 0.9,
    temperatureBonusCelsius: 3,
  },
]);
const scenario = parseSurvivalEnvironmentScenario({
  shelters: [{
    id: "cabin-01",
    profileId: "cabin",
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 4, z: 10 } },
  }],
  heatSources: [],
});
const system = new ShelterSystem(profiles, scenario.shelters);

describe("ShelterSystem", () => {
  it("内部坐标返回庇护状态与配置效果", () => {
    expect(system.getState({ x: 5, y: 1.8, z: 5 })).toMatchObject({
      isSheltered: true,
      shelterId: "cabin-01",
      windProtection: 0.9,
      temperatureBonusCelsius: 3,
    });
  });

  it("外部坐标返回零效果", () => {
    expect(system.getState({ x: -0.01, y: 1.8, z: 5 })).toEqual({
      isSheltered: false,
      windProtection: 0,
      temperatureBonusCelsius: 0,
    });
  });

  it("AABB 边界按内部处理", () => {
    expect(system.getState({ x: 0, y: 0, z: 10 }).isSheltered).toBe(true);
  });

  it("拒绝范围外的挡风配置", () => {
    expect(() => ShelterSystem.parseProfiles([{
      id: "invalid",
      displayName: "无效",
      windProtection: 1.01,
      temperatureBonusCelsius: 0,
    }])).toThrow("必须在 0 到 1 之间");
  });
});
