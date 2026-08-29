import { describe, expect, it } from "vitest";
import weatherDefinitionsData from "../data/weather/weather.json";
import { WeatherCatalog } from "../src/weather/WeatherCatalog";
import type { WeatherId } from "../src/weather/WeatherDefinition";

describe("WeatherCatalog", () => {
  it("通过稳定 ID 获取天气定义", () => {
    const catalog = WeatherCatalog.fromUnknown(weatherDefinitionsData);

    expect(catalog.get("blizzard")).toMatchObject({
      id: "blizzard",
      displayName: "暴雪",
      movementModifier: 0.55,
    });
  });

  it("不存在的 ID 会产生明确错误", () => {
    const catalog = WeatherCatalog.fromUnknown(weatherDefinitionsData);

    expect(() => catalog.get("storm" as WeatherId)).toThrow("不存在天气 ID：storm");
  });

  it("拒绝重复 Weather ID", () => {
    const clear = weatherDefinitionsData[0];

    expect(() => WeatherCatalog.fromUnknown([clear, clear])).toThrow("天气 ID 重复：clear");
  });
});
