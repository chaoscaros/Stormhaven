import {
  isWeatherId,
  type WeatherDefinition,
  type WeatherId,
} from "./WeatherDefinition";

const NORMALIZED_MIN = 0;
const NORMALIZED_MAX = 1;

/** 验证并保存 Data Driven 天气定义；不负责网络、文件或渲染。 */
export class WeatherCatalog {
  readonly #definitions: ReadonlyMap<WeatherId, WeatherDefinition>;

  constructor(definitions: readonly WeatherDefinition[]) {
    const definitionMap = new Map<WeatherId, WeatherDefinition>();
    for (const definition of definitions) {
      if (definitionMap.has(definition.id)) {
        throw new Error(`天气 ID 重复：${definition.id}`);
      }
      definitionMap.set(definition.id, Object.freeze({ ...definition }));
    }
    this.#definitions = definitionMap;
  }

  static fromUnknown(value: unknown): WeatherCatalog {
    if (!Array.isArray(value)) {
      throw new Error("天气配置必须是数组。");
    }
    return new WeatherCatalog(value.map(parseWeatherDefinition));
  }

  get(id: WeatherId): WeatherDefinition {
    const definition = this.#definitions.get(id);
    if (!definition) {
      throw new Error(`不存在天气 ID：${id}`);
    }
    return definition;
  }

  has(id: WeatherId): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly WeatherDefinition[] {
    return Object.freeze([...this.#definitions.values()]);
  }
}

function parseWeatherDefinition(value: unknown, index: number): WeatherDefinition {
  const record = asRecord(value, `天气配置[${index}]`);
  const id = record.id;
  if (!isWeatherId(id)) {
    throw new Error(`天气配置[${index}].id 不是受支持的稳定 ID。`);
  }

  return Object.freeze({
    id,
    displayName: readNonEmptyString(record, "displayName", index),
    ambientTemperature: readFiniteNumber(record, "ambientTemperature", index),
    temperatureModifier: readFiniteNumber(record, "temperatureModifier", index),
    windStrength: readNonNegativeNumber(record, "windStrength", index),
    visibility: readNonNegativeNumber(record, "visibility", index),
    precipitation: readNormalizedNumber(record, "precipitation", index),
    wetnessRate: readNonNegativeNumber(record, "wetnessRate", index),
    movementModifier: readNormalizedNumber(record, "movementModifier", index),
    solarEfficiency: readNormalizedNumber(record, "solarEfficiency", index),
  });
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

function readNonEmptyString(
  record: Record<string, unknown>,
  key: string,
  index: number,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`天气配置[${index}].${key} 必须是非空字符串。`);
  }
  return value;
}

function readFiniteNumber(
  record: Record<string, unknown>,
  key: string,
  index: number,
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`天气配置[${index}].${key} 必须是有限数值。`);
  }
  return value;
}

function readNonNegativeNumber(
  record: Record<string, unknown>,
  key: string,
  index: number,
): number {
  const value = readFiniteNumber(record, key, index);
  if (value < 0) {
    throw new Error(`天气配置[${index}].${key} 不能小于 0。`);
  }
  return value;
}

function readNormalizedNumber(
  record: Record<string, unknown>,
  key: string,
  index: number,
): number {
  const value = readFiniteNumber(record, key, index);
  if (value < NORMALIZED_MIN || value > NORMALIZED_MAX) {
    throw new Error(`天气配置[${index}].${key} 必须在 0 到 1 之间。`);
  }
  return value;
}
