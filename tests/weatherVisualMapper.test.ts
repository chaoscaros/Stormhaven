import { describe, expect, it } from "vitest";
import weatherVisualsData from "../data/weather/weather-visuals.json";
import { WeatherVisualMapper } from "../src/weather/presentation/WeatherVisualMapper";
import { WeatherVisualProfileCatalog } from "../src/weather/presentation/WeatherVisualProfileCatalog";

function createMapper(): WeatherVisualMapper {
  return new WeatherVisualMapper(
    WeatherVisualProfileCatalog.fromUnknown(weatherVisualsData),
  );
}

describe("WeatherVisualMapper", () => {
  it("clear 且无过渡时返回 clear 视觉值", () => {
    const state = createMapper().map("clear");

    expect(state.skyBrightness).toBe(1);
    expect(state.fogDensity).toBe(0.0018);
    expect(state.snowEmitRate).toBe(0);
  });

  it("clear 到 blizzard 的 0.5 返回两端中点", () => {
    const catalog = WeatherVisualProfileCatalog.fromUnknown(weatherVisualsData);
    const state = new WeatherVisualMapper(catalog).map("clear", "blizzard", 0.5);

    expect(state.fogDensity).toBeCloseTo(
      (catalog.get("clear").fogDensity + catalog.get("blizzard").fogDensity) / 2,
    );
    expect(state.horizonColor[0]).toBeCloseTo(0.49);
    expect(state.snowEmitRate).toBe(625);
  });

  it("将小于 0 的进度 clamp 到 0", () => {
    const mapper = createMapper();

    expect(mapper.map("clear", "blizzard", -3)).toEqual(mapper.map("clear"));
  });

  it("将大于 1 的进度 clamp 到 1", () => {
    const mapper = createMapper();

    expect(mapper.map("clear", "blizzard", 4)).toEqual(mapper.map("blizzard"));
  });

  it("blizzard 的雾密度高于 clear", () => {
    const mapper = createMapper();

    expect(mapper.map("blizzard").fogDensity).toBeGreaterThan(
      mapper.map("clear").fogDensity,
    );
  });

  it("blizzard 的降雪强度高于 snow", () => {
    const mapper = createMapper();

    expect(mapper.map("blizzard").snowIntensity).toBeGreaterThan(
      mapper.map("snow").snowIntensity,
    );
  });
});

describe("WeatherVisualProfileCatalog", () => {
  it("拒绝缺少的 Weather ID", () => {
    const withoutSnow = weatherVisualsData.filter((profile) => profile.id !== "snow");

    expect(() => WeatherVisualProfileCatalog.fromUnknown(withoutSnow)).toThrow(
      "缺少天气视觉 ID：snow",
    );
  });

  it("拒绝重复的 Weather ID", () => {
    expect(() =>
      WeatherVisualProfileCatalog.fromUnknown([
        ...weatherVisualsData,
        weatherVisualsData[0],
      ]),
    ).toThrow("天气视觉 ID 重复：clear");
  });

  it("拒绝非法范围", () => {
    const invalid = weatherVisualsData.map((profile) =>
      profile.id === "blizzard" ? { ...profile, snowIntensity: 1.2 } : profile,
    );

    expect(() => WeatherVisualProfileCatalog.fromUnknown(invalid)).toThrow(
      "天气视觉 blizzard.snowIntensity 必须位于 0 到 1",
    );
  });
});
