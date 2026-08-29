import { describe, expect, it } from "vitest";
import thermalConfigData from "../data/survival/thermal.json";
import weatherDefinitionsData from "../data/weather/weather.json";
import { createFirstBlizzardSurvivalEnvironment } from "../src/core/simulation/createFirstBlizzardSurvivalEnvironment";
import type { SpatialPoint } from "../src/survival/environment/SpatialPoint";
import { ThermalModel } from "../src/survival/thermal/ThermalModel";
import { parseThermalConfig } from "../src/survival/thermal/ThermalConfig";
import { ThermalEnvironmentBuilder } from "../src/survival/thermal/ThermalEnvironment";
import { createThermalInputs } from "../src/survival/thermal/createThermalInputs";
import { WeatherCatalog } from "../src/weather/WeatherCatalog";
import { WeatherGameplayMapper } from "../src/weather/gameplay/WeatherGameplayMapper";

const thermalConfig = parseThermalConfig(thermalConfigData);
const weather = new WeatherGameplayMapper().map(
  WeatherCatalog.fromUnknown(weatherDefinitionsData).get("blizzard"),
);
const OUTDOOR = { x: 0, y: 1.8, z: 0 };
const SHELTERED_FAR = { x: 0, y: 1.8, z: 5 };
const NEAR_HEATER = { x: 0, y: 1.8, z: 11.5 };

describe("Shelter + Heat Source + Thermal Integration", () => {
  it("暴雪中室外下降、木屋减缓下降、测试炉附近回暖", () => {
    const outdoor = simulate(OUTDOOR, 60, 60);
    const sheltered = simulate(SHELTERED_FAR, 60, 60);
    const heated = simulate(NEAR_HEATER, 60, 60);

    expect(outdoor.currentValue).toBeLessThan(thermalConfig.initialThermalValue);
    expect(sheltered.currentValue).toBeGreaterThan(outdoor.currentValue);
    expect(heated.currentValue).toBeGreaterThan(thermalConfig.initialThermalValue);
    expect(heated.trend).toBe("warming");
  });

  it("带庇护与热源的 30/60/120 FPS 结果一致", () => {
    const values = [30, 60, 120].map((fps) => simulate(NEAR_HEATER, fps, 60).currentValue);

    expect(values[0]).toBeCloseTo(values[1] ?? 0, 8);
    expect(values[1]).toBeCloseTo(values[2] ?? 0, 8);
  });
});

function simulate(position: SpatialPoint, fps: number, seconds: number) {
  const environment = createFirstBlizzardSurvivalEnvironment();
  const shelter = environment.shelterSystem.getState(position);
  const heat = environment.heatSourceSystem.getContribution(position);
  const thermalEnvironment = new ThermalEnvironmentBuilder().build(weather, shelter, heat);
  const model = new ThermalModel(thermalConfig);
  for (let frame = 0; frame < fps * seconds; frame += 1) {
    model.update(createThermalInputs(weather, thermalEnvironment, 1 / fps));
  }
  return model.snapshot;
}
