import type { ItemCatalog } from "../../items/ItemCatalog";
import { parseFuelDefinition, type FuelDefinition } from "./FuelDefinition";

/** 启动时完成校验的 Fuel Item → Burn Duration 查询表。 */
export class FuelCatalog {
  readonly #definitions: ReadonlyMap<string, FuelDefinition>;

  private constructor(definitions: readonly FuelDefinition[]) {
    this.#definitions = new Map(definitions.map((definition) => [definition.itemId, definition]));
  }

  static fromUnknown(value: unknown, items: ItemCatalog): FuelCatalog {
    if (!Array.isArray(value)) throw new Error("FuelDefinition 配置必须是数组。");
    const definitions = value.map((entry, index) => parseFuelDefinition(entry, index, items));
    const ids = new Set<string>();
    for (const definition of definitions) {
      if (ids.has(definition.itemId)) {
        throw new Error(`FuelDefinition itemId 重复：${definition.itemId}`);
      }
      ids.add(definition.itemId);
    }
    return new FuelCatalog(Object.freeze(definitions));
  }

  has(itemId: string): boolean {
    return this.#definitions.has(itemId);
  }

  get(itemId: string): FuelDefinition {
    const definition = this.#definitions.get(itemId);
    if (!definition) throw new Error(`不存在 FuelDefinition Item ID：${itemId}`);
    return definition;
  }

  getAll(): readonly FuelDefinition[] {
    return Object.freeze([...this.#definitions.values()]);
  }
}
