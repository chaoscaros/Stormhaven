import { parseItemDefinition, type ItemDefinition } from "./ItemDefinition";

/** 已验证 ItemDefinition 的稳定 ID 查询表。 */
export class ItemCatalog {
  readonly #definitions: ReadonlyMap<string, ItemDefinition>;

  private constructor(definitions: readonly ItemDefinition[]) {
    this.#definitions = new Map(definitions.map((definition) => [definition.id, definition]));
  }

  static fromUnknown(value: unknown): ItemCatalog {
    if (!Array.isArray(value)) throw new Error("ItemDefinition 配置必须是数组。");
    const definitions = value.map(parseItemDefinition);
    const ids = new Set<string>();
    for (const definition of definitions) {
      if (ids.has(definition.id)) throw new Error(`ItemDefinition ID 重复：${definition.id}`);
      ids.add(definition.id);
    }
    return new ItemCatalog(Object.freeze(definitions));
  }

  get(id: string): ItemDefinition {
    const definition = this.#definitions.get(id);
    if (!definition) throw new Error(`不存在 ItemDefinition ID：${id}`);
    return definition;
  }

  has(id: string): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly ItemDefinition[] {
    return Object.freeze([...this.#definitions.values()]);
  }
}
