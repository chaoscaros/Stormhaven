import { describe, expect, it } from "vitest";
import itemDefinitionsData from "../data/items/items.json";
import recipeDefinitionsData from "../data/crafting/recipes.json";
import { RecipeCatalog } from "../src/crafting/RecipeCatalog";
import { ItemCatalog } from "../src/items/ItemCatalog";

const items = ItemCatalog.fromUnknown(itemDefinitionsData);
const stoneAxeRecipe = recipeDefinitionsData[0];

describe("RecipeDefinition / RecipeCatalog", () => {
  it("合法 Recipe JSON 成功解析", () => {
    const catalog = RecipeCatalog.fromUnknown(recipeDefinitionsData, items);
    expect(catalog.get("stone_axe")).toMatchObject({
      displayName: "石斧",
      requiredStation: "hand",
      craftTimeSeconds: 0,
    });
  });

  it("重复 Recipe ID 被拒绝", () => {
    expect(() => RecipeCatalog.fromUnknown([stoneAxeRecipe, stoneAxeRecipe], items))
      .toThrow("RecipeDefinition ID 重复：stone_axe");
  });

  it("不存在 Item ID 被拒绝", () => {
    expect(() => createCatalog({
      ...stoneAxeRecipe,
      inputs: [{ itemId: "missing", quantity: 1 }],
    })).toThrow("不存在 ItemDefinition ID：missing");
  });

  it.each([0, -1, 1.5])("Input quantity 非正整数时被拒绝：%s", (quantity) => {
    expect(() => createCatalog({
      ...stoneAxeRecipe,
      inputs: [{ itemId: "stone", quantity }],
    })).toThrow("quantity 必须是大于 0 的整数");
  });

  it.each([0, -1, 1.5])("Output quantity 非正整数时被拒绝：%s", (quantity) => {
    expect(() => createCatalog({
      ...stoneAxeRecipe,
      outputs: [{ itemId: "stone_axe", quantity }],
    })).toThrow("quantity 必须是大于 0 的整数");
  });

  it("重复 Input Item ID 被拒绝", () => {
    expect(() => createCatalog({
      ...stoneAxeRecipe,
      inputs: [
        { itemId: "stone", quantity: 1 },
        { itemId: "stone", quantity: 2 },
      ],
    })).toThrow("inputs 不能重复 Item ID：stone");
  });

  it("重复 Output Item ID 被拒绝", () => {
    expect(() => createCatalog({
      ...stoneAxeRecipe,
      outputs: [
        { itemId: "stone_axe", quantity: 1 },
        { itemId: "stone_axe", quantity: 1 },
      ],
    })).toThrow("outputs 不能重复 Item ID：stone_axe");
  });

  it("负 craftTimeSeconds 被拒绝", () => {
    expect(() => createCatalog({ ...stoneAxeRecipe, craftTimeSeconds: -1 }))
      .toThrow("craftTimeSeconds 不能小于 0");
  });

  it("按稳定 ID 查询 Recipe", () => {
    expect(RecipeCatalog.fromUnknown(recipeDefinitionsData, items).get("stone_axe").id)
      .toBe("stone_axe");
  });

  it("不存在 Recipe ID 返回明确错误", () => {
    expect(() => RecipeCatalog.fromUnknown(recipeDefinitionsData, items).get("missing"))
      .toThrow("不存在 RecipeDefinition ID：missing");
  });

  it("Recipe 列表完整且保持数据顺序", () => {
    expect(RecipeCatalog.fromUnknown(recipeDefinitionsData, items).getAll().map(({ id }) => id))
      .toEqual(["stone_axe"]);
  });
});

function createCatalog(recipe: unknown): RecipeCatalog {
  return RecipeCatalog.fromUnknown([recipe], items);
}
