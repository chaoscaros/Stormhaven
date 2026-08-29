import { describe, expect, it } from "vitest";
import weatherDefinitionsData from "../data/weather/weather.json";
import { WeatherCatalog } from "../src/weather/WeatherCatalog";
import { WeatherManager } from "../src/weather/WeatherManager";
import { WeatherTransition } from "../src/weather/WeatherTransition";

describe("WeatherTransition", () => {
  it("按照 delta game seconds 计算过渡进度", () => {
    const transition = new WeatherTransition("clear", "blizzard", 120);

    transition.update(60);

    expect(transition.snapshot.progress).toBe(0.5);
    expect(transition.snapshot.completed).toBe(false);
  });

  it("不同刷新率下得到一致进度", () => {
    const lowRate = new WeatherTransition("clear", "blizzard", 120);
    const highRate = new WeatherTransition("clear", "blizzard", 120);

    for (let index = 0; index < 30; index += 1) lowRate.update(2);
    for (let index = 0; index < 120; index += 1) highRate.update(0.5);

    expect(lowRate.snapshot.progress).toBe(highRate.snapshot.progress);
  });
});

describe("WeatherManager", () => {
  it("Transition 完成后更新 currentWeather", () => {
    const catalog = WeatherCatalog.fromUnknown(weatherDefinitionsData);
    const manager = new WeatherManager(catalog, "clear");

    manager.transitionTo("blizzard", 120);
    manager.update(60);
    expect(manager.currentWeather.id).toBe("clear");
    expect(manager.transition?.progress).toBe(0.5);

    const events = manager.update(60);
    expect(manager.currentWeather.id).toBe("blizzard");
    expect(manager.transition).toBeUndefined();
    expect(events.map((event) => event.type)).toEqual([
      "weather-transition-completed",
      "weather-changed",
    ]);
  });
});
