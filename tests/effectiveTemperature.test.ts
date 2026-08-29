import { describe, expect, it } from "vitest";
import thermalConfigData from "../data/survival/thermal.json";
import weatherDefinitionsData from "../data/weather/weather.json";
import { calculateEffectiveTemperature } from "../src/survival/thermal/EffectiveTemperature";
import { parseThermalConfig } from "../src/survival/thermal/ThermalConfig";
import { WeatherCatalog } from "../src/weather/WeatherCatalog";
import { WeatherGameplayMapper } from "../src/weather/gameplay/WeatherGameplayMapper";

const config = parseThermalConfig(thermalConfigData);

describe("EffectiveTemperature", () => {
  it("Wind Strength 0 不产生风寒惩罚", () => {
    const result = calculateEffectiveTemperature(
      {
        ambientTemperatureCelsius: -5,
        temperatureModifierCelsius: 0,
        windStrength: 0,
      },
      config,
    );

    expect(result.windChillPenaltyCelsius).toBe(0);
    expect(result.effectiveTemperatureCelsius).toBe(-5);
  });

  it("达到配置风力上限时产生最大风寒惩罚", () => {
    const result = calculateEffectiveTemperature(
      {
        ambientTemperatureCelsius: -5,
        temperatureModifierCelsius: 0,
        windStrength: config.windStrengthAtMaxPenalty,
      },
      config,
    );

    expect(result.windChillPenaltyCelsius).toBe(config.maxWindChillPenaltyCelsius);
  });

  it("Blizzard Gameplay State 的体感温度低于 Clear", () => {
    const catalog = WeatherCatalog.fromUnknown(weatherDefinitionsData);
    const mapper = new WeatherGameplayMapper();
    const clear = mapper.map(catalog.get("clear"));
    const blizzard = mapper.map(catalog.get("blizzard"));
    const clearEffective = calculateEffectiveTemperature(clear, config);
    const blizzardEffective = calculateEffectiveTemperature(blizzard, config);

    expect(blizzardEffective.effectiveTemperatureCelsius).toBeLessThan(
      clearEffective.effectiveTemperatureCelsius,
    );
  });
});
