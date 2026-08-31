import { describe, expect, it } from "vitest";
import itemDefinitionsData from "../data/items/items.json";
import {
  GAME_ICON_IDS,
  isGameIconId,
  resolveGameIconId,
} from "../src/ui/icons/GameIcon";

describe("GameIcon semantic IDs", () => {
  it("首批 UI、物品、建筑、HUD 与系统语义均已登记", () => {
    expect(GAME_ICON_IDS).toEqual(expect.arrayContaining([
      "inventory", "crafting", "building",
      "wood", "stone", "stick", "cloth", "scrap_metal",
      "water_bottle", "canned_food", "raw_meat", "stone_axe",
      "foundation_wood", "wall_wood", "campfire_basic",
      "temperature", "shelter", "weather", "weight",
      "close", "pause", "resume", "warning", "info",
    ]));
  });

  it("Items JSON 只保存稳定游戏 Icon ID", () => {
    for (const definition of itemDefinitionsData) {
      expect(isGameIconId(definition.icon), definition.id).toBe(true);
      expect(definition.icon).not.toContain("@phosphor-icons");
      expect(definition.icon).not.toContain(".svg");
    }
  });

  it("未知展示 ID 安全回退到 info", () => {
    expect(resolveGameIconId("future_item")).toBe("info");
    expect(resolveGameIconId(null)).toBe("info");
  });
});
