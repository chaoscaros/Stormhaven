import type { ItemCatalog } from "../items/ItemCatalog";
import { parseBuildDefinition } from "./BuildDefinition";
import type { BuildDefinition } from "./BuildingTypes";

/** 启动时完成校验的稳定 BuildDefinition 查询表。 */
export class BuildCatalog {
  readonly #definitions: ReadonlyMap<string, BuildDefinition>;

  private constructor(definitions: readonly BuildDefinition[]) {
    this.#definitions = new Map(definitions.map((definition) => [definition.id, definition]));
  }

  static fromUnknown(value: unknown, items: ItemCatalog): BuildCatalog {
    if (!Array.isArray(value)) throw new Error("BuildDefinition 配置必须是数组。");
    const definitions = value.map((entry, index) => parseBuildDefinition(entry, index, items));
    const ids = new Set<string>();
    for (const definition of definitions) {
      if (ids.has(definition.id)) throw new Error(`BuildDefinition ID 重复：${definition.id}`);
      ids.add(definition.id);
    }
    return new BuildCatalog(Object.freeze(definitions));
  }

  get(id: string): BuildDefinition {
    const definition = this.#definitions.get(id);
    if (!definition) throw new Error(`不存在 BuildDefinition ID：${id}`);
    return definition;
  }

  has(id: string): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly BuildDefinition[] {
    return Object.freeze([...this.#definitions.values()]);
  }
}
