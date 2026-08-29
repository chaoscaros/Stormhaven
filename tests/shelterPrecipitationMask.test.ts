import { describe, expect, it } from "vitest";
import weatherVisualsData from "../data/weather/weather-visuals.json";
import { applyShelterPrecipitationMask } from "../src/weather/presentation/applyShelterPrecipitationMask";
import { WeatherVisualMapper } from "../src/weather/presentation/WeatherVisualMapper";
import { WeatherVisualProfileCatalog } from "../src/weather/presentation/WeatherVisualProfileCatalog";

const blizzard = new WeatherVisualMapper(
  WeatherVisualProfileCatalog.fromUnknown(weatherVisualsData),
).map("blizzard");

describe("Shelter Precipitation Mask", () => {
  it("室内将局部降雪强度与发射率归零", () => {
    const masked = applyShelterPrecipitationMask(blizzard, true);

    expect(masked.snowIntensity).toBe(0);
    expect(masked.snowEmitRate).toBe(0);
    expect(masked.fogDensity).toBe(blizzard.fogDensity);
  });

  it("室外保持原始天气视觉状态", () => {
    expect(applyShelterPrecipitationMask(blizzard, false)).toBe(blizzard);
  });
});
