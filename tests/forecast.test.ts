import { describe, expect, it } from "vitest";
import weatherDefinitionsData from "../data/weather/weather.json";
import firstBlizzardScheduleData from "../data/weather/first-blizzard-schedule.json";
import { GameSimulation } from "../src/core/simulation/GameSimulation";
import { createGameTimeSnapshot, toTotalGameMinutes } from "../src/core/time/GameTime";
import { ForecastSystem } from "../src/weather/ForecastSystem";
import { WeatherCatalog } from "../src/weather/WeatherCatalog";
import { parseWeatherSchedule } from "../src/weather/WeatherSchedule";
import thermalConfigData from "../data/survival/thermal.json";
import { parseThermalConfig } from "../src/survival/thermal/ThermalConfig";

const catalog = WeatherCatalog.fromUnknown(weatherDefinitionsData);
const schedule = parseWeatherSchedule(firstBlizzardScheduleData);
const thermalConfig = parseThermalConfig(thermalConfigData);

describe("ForecastSystem", () => {
  it("Day 1 14:00 可以查询到 18:00 Blizzard", () => {
    const forecast = new ForecastSystem(schedule);

    const entry = forecast.getNextForecast(snapshotAt(1, 14, 0));

    expect(entry).toMatchObject({
      weatherId: "blizzard",
      startsAt: { day: 1, hour: 18, minute: 0 },
    });
  });

  it("未到开始时间不会提前切换天气", () => {
    const simulation = createSimulation(1, 17, 59);

    simulation.update(0.5);

    expect(simulation.snapshot.weather.id).toBe("clear");
  });

  it("从 17:59 一次跨到 18:01 不会遗漏 Blizzard", () => {
    const simulation = createSimulation(1, 17, 59);

    const update = simulation.update(2);

    expect(update.snapshot.time).toMatchObject({ day: 1, hour: 18, minute: 1 });
    expect(update.snapshot.weather.id).toBe("blizzard");
    expect(update.events.some((event) => event.type === "weather-changed")).toBe(true);
  });

  it("17:30 开始过渡，并在 17:45 达到 50%", () => {
    const simulation = createSimulation(1, 17, 29);

    simulation.update(1);
    expect(simulation.snapshot.transition).toMatchObject({
      targetWeatherId: "blizzard",
      progress: 0,
    });

    simulation.update(15);
    expect(simulation.snapshot.transition?.progress).toBe(0.5);
    expect(simulation.snapshot.weather.id).toBe("clear");
  });

  it("Runtime clamp 避免后台恢复时一次推进过多时间", () => {
    const simulation = new GameSimulation(
      {
        initialTime: { day: 1, hour: 14, minute: 0 },
        timeScale: 60,
        maxDeltaSeconds: 0.25,
      },
      catalog,
      schedule,
      thermalConfig,
    );

    simulation.update(3_600);

    expect(simulation.snapshot.time.totalGameMinutes).toBe(14 * 60 + 0.25);
  });
});

function createSimulation(day: number, hour: number, minute: number): GameSimulation {
  return new GameSimulation(
    {
      initialTime: { day, hour, minute },
      timeScale: 60,
      maxDeltaSeconds: 60,
    },
    catalog,
    schedule,
    thermalConfig,
  );
}

function snapshotAt(day: number, hour: number, minute: number) {
  return createGameTimeSnapshot(toTotalGameMinutes({ day, hour, minute }));
}
