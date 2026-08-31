import { describe, expect, it } from "vitest";
import fuelDefinitionsData from "../data/survival/fuels.json";
import itemDefinitionsData from "../data/items/items.json";
import thermalConfigData from "../data/survival/thermal.json";
import weatherDefinitionsData from "../data/weather/weather.json";
import { createFirstBlizzardSurvivalEnvironment } from "../src/core/simulation/createFirstBlizzardSurvivalEnvironment";
import { Inventory } from "../src/inventory/Inventory";
import { ItemCatalog } from "../src/items/ItemCatalog";
import { CampfireSystem } from "../src/survival/campfire/CampfireSystem";
import { FuelCatalog } from "../src/survival/campfire/FuelCatalog";
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
const SHELTERED = { x: 0, y: 1.8, z: 7 };
const NEAR_CAMPFIRE = { x: 0, y: 1.8, z: 11.5 };

describe("Shelter + Player Campfire + Thermal Integration", () => {
  it("暴雪中室外下降、木屋无火下降较慢、点燃篝火后回暖", () => {
    const outdoor = simulate(OUTDOOR, 60, 60, false);
    const sheltered = simulate(SHELTERED, 60, 60, false);
    const heated = simulate(NEAR_CAMPFIRE, 60, 60, true);

    expect(outdoor.currentValue).toBeLessThan(thermalConfig.initialThermalValue);
    expect(sheltered.currentValue).toBeGreaterThan(outdoor.currentValue);
    expect(sheltered.currentValue).toBeLessThan(thermalConfig.initialThermalValue);
    expect(heated.currentValue).toBeGreaterThan(thermalConfig.initialThermalValue);
    expect(heated.trend).toBe("warming");
  });

  it("正常 First Blizzard Runtime 不再包含免费固定 HeatSource", () => {
    const environment = createFirstBlizzardSurvivalEnvironment();
    expect(environment.scenario.heatSources).toHaveLength(0);
    expect(environment.heatSourceSystem.getContribution(NEAR_CAMPFIRE).temperatureBonusCelsius).toBe(0);
  });

  it("带庇护与玩家篝火的 30/60/120 FPS 结果一致", () => {
    const values = [30, 60, 120].map((fps) =>
      simulate(NEAR_CAMPFIRE, fps, 60, true).currentValue);
    expect(values[0]).toBeCloseTo(values[1] ?? 0, 8);
    expect(values[1]).toBeCloseTo(values[2] ?? 0, 8);
  });
});

function simulate(position: SpatialPoint, fps: number, seconds: number, lightCampfire: boolean) {
  const environment = createFirstBlizzardSurvivalEnvironment();
  const items = ItemCatalog.fromUnknown(itemDefinitionsData);
  const inventory = new Inventory(items, { maxSlots: 24, maxWeightKilograms: 100 });
  const campfires = new CampfireSystem(
    { fuelCapacitySeconds: 900, heatSourceProfileId: "campfire_basic" },
    FuelCatalog.fromUnknown(fuelDefinitionsData, items),
    inventory,
    environment.heatSourceSystem,
  );
  const campfire = campfires.register("building_test", { x: 0, y: 0.37, z: 11.5 });
  if (lightCampfire) {
    inventory.addItem("wood", 1);
    campfires.addFuel(campfire.id, "wood");
    campfires.ignite(campfire.id);
  }
  const shelter = environment.shelterSystem.getState(position);
  const model = new ThermalModel(thermalConfig);
  for (let frame = 0; frame < fps * seconds; frame += 1) {
    const deltaSeconds = 1 / fps;
    campfires.update(deltaSeconds);
    const heat = environment.heatSourceSystem.getContribution(position);
    const thermalEnvironment = new ThermalEnvironmentBuilder().build(weather, shelter, heat);
    model.update(createThermalInputs(weather, thermalEnvironment, deltaSeconds));
  }
  return model.snapshot;
}
