import { describe, expect, it } from "vitest";
import weatherDefinitionsData from "../data/weather/weather.json";
import { WeatherCatalog } from "../src/weather/WeatherCatalog";
import { WeatherGameplayMapper } from "../src/weather/gameplay/WeatherGameplayMapper";

const catalog = WeatherCatalog.fromUnknown(weatherDefinitionsData);
const mapper = new WeatherGameplayMapper();

describe("WeatherGameplayMapper", () => {
  it("无 Transition 时返回当前天气 Gameplay 参数", () => {
    const state = mapper.map(catalog.get("clear"));

    expect(state).toMatchObject({
      currentWeatherId: "clear",
      ambientTemperatureCelsius: -5,
      temperatureModifierCelsius: 0,
      windStrength: 3,
      transitionProgress: 0,
    });
  });

  it("Transition 0.5 时温度和风力位于两端中点", () => {
    const state = mapper.map(
      catalog.get("clear"),
      catalog.get("blizzard"),
      0.5,
    );

    expect(state.ambientTemperatureCelsius).toBe(-11.5);
    expect(state.temperatureModifierCelsius).toBe(-6);
    expect(state.windStrength).toBe(15.5);
    expect(state.transitionProgress).toBe(0.5);
  });

  it("将 Transition Progress clamp 到 0..1", () => {
    const clear = catalog.get("clear");
    const blizzard = catalog.get("blizzard");

    expect(mapper.map(clear, blizzard, -1).ambientTemperatureCelsius).toBe(-5);
    expect(mapper.map(clear, blizzard, 2).ambientTemperatureCelsius).toBe(-18);
  });
});
