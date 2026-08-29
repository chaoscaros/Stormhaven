import { describe, expect, it } from "vitest";
import thermalConfigData from "../data/survival/thermal.json";
import weatherDefinitionsData from "../data/weather/weather.json";
import firstBlizzardScheduleData from "../data/weather/first-blizzard-schedule.json";
import { GameSimulation } from "../src/core/simulation/GameSimulation";
import { parseThermalConfig } from "../src/survival/thermal/ThermalConfig";
import { WeatherCatalog } from "../src/weather/WeatherCatalog";
import { parseWeatherSchedule } from "../src/weather/WeatherSchedule";

describe("First Blizzard Thermal Integration", () => {
  it("14:00 Thermal Loss 很低，18:00 Blizzard 明显更高", () => {
    const simulation = new GameSimulation(
      {
        initialTime: { day: 1, hour: 14, minute: 0 },
        timeScale: 240,
        maxDeltaSeconds: 0.25,
      },
      WeatherCatalog.fromUnknown(weatherDefinitionsData),
      parseWeatherSchedule(firstBlizzardScheduleData),
      parseThermalConfig(thermalConfigData),
    );
    const clearRate = simulation.snapshot.thermal.changeRatePerSecond;

    for (let frame = 0; frame < 240; frame += 1) {
      simulation.update(0.25);
    }

    expect(simulation.snapshot.time).toMatchObject({ hour: 18, minute: 0 });
    expect(simulation.snapshot.weather.id).toBe("blizzard");
    expect(Math.abs(simulation.snapshot.thermal.changeRatePerSecond)).toBeGreaterThan(
      Math.abs(clearRate) * 10,
    );
    expect(simulation.snapshot.thermal.currentValue).toBeLessThan(
      parseThermalConfig(thermalConfigData).initialThermalValue,
    );
  });
});
