import type { ItemCatalog } from "../items/ItemCatalog";
import { parseRecipeDefinition, type RecipeDefinition } from "./RecipeDefinition";

/** 启动时完成校验的稳定 Recipe ID 查询表。 */
export class RecipeCatalog {
  readonly #recipes: ReadonlyMap<string, RecipeDefinition>;

  private constructor(recipes: readonly RecipeDefinition[]) {
    this.#recipes = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  }

  static fromUnknown(value: unknown, itemCatalog: ItemCatalog): RecipeCatalog {
    if (!Array.isArray(value)) throw new Error("RecipeDefinition 配置必须是数组。");
    const recipes = value.map((entry, index) =>
      parseRecipeDefinition(entry, index, itemCatalog));
    const ids = new Set<string>();
    for (const recipe of recipes) {
      if (ids.has(recipe.id)) throw new Error(`RecipeDefinition ID 重复：${recipe.id}`);
      ids.add(recipe.id);
    }
    return new RecipeCatalog(Object.freeze(recipes));
  }

  get(id: string): RecipeDefinition {
    const recipe = this.#recipes.get(id);
    if (!recipe) throw new Error(`不存在 RecipeDefinition ID：${id}`);
    return recipe;
  }

  has(id: string): boolean {
    return this.#recipes.has(id);
  }

  getAll(): readonly RecipeDefinition[] {
    return Object.freeze([...this.#recipes.values()]);
  }
}
