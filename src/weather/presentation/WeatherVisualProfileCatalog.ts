import { WEATHER_IDS, isWeatherId, type WeatherId } from "../WeatherDefinition";
import type {
  VisualColor,
  VisualDirection,
  WeatherVisualProfile,
} from "./WeatherVisualState";

const UNIT_INTERVAL_FIELDS = [
  "skyCloudiness",
  "snowIntensity",
] as const;
const NON_NEGATIVE_FIELDS = [
  "skyBrightness",
  "fogDensity",
  "hemisphericLightIntensity",
  "directionalLightIntensity",
  "snowEmitRate",
  "snowParticleSpeed",
  "snowParticleSize",
  "windVisualStrength",
] as const;

/** 验证并索引 data-driven 天气视觉配置。 */
export class WeatherVisualProfileCatalog {
  readonly #profiles = new Map<WeatherId, WeatherVisualProfile>();

  static fromUnknown(value: unknown): WeatherVisualProfileCatalog {
    if (!Array.isArray(value)) {
      throw new Error("天气视觉配置必须是数组。");
    }
    const catalog = new WeatherVisualProfileCatalog();
    for (const rawProfile of value) {
      const profile = parseProfile(rawProfile);
      if (catalog.#profiles.has(profile.id)) {
        throw new Error(`天气视觉 ID 重复：${profile.id}`);
      }
      catalog.#profiles.set(profile.id, profile);
    }
    for (const id of WEATHER_IDS) {
      if (!catalog.#profiles.has(id)) {
        throw new Error(`缺少天气视觉 ID：${id}`);
      }
    }
    return catalog;
  }

  get(id: WeatherId): WeatherVisualProfile {
    const profile = this.#profiles.get(id);
    if (!profile) {
      throw new Error(`不存在天气视觉 ID：${id}`);
    }
    return profile;
  }
}

function parseProfile(value: unknown): WeatherVisualProfile {
  if (!isRecord(value) || !isWeatherId(value.id)) {
    throw new Error("天气视觉配置包含无效 ID。");
  }
  const id = value.id;
  const parsed = {
    id,
    skyBrightness: readNumber(value, "skyBrightness", id),
    skyCloudiness: readNumber(value, "skyCloudiness", id),
    horizonColor: readTuple(value, "horizonColor", id, true),
    zenithColor: readTuple(value, "zenithColor", id, true),
    fogDensity: readNumber(value, "fogDensity", id),
    fogColor: readTuple(value, "fogColor", id, true),
    hemisphericLightIntensity: readNumber(value, "hemisphericLightIntensity", id),
    directionalLightIntensity: readNumber(value, "directionalLightIntensity", id),
    snowIntensity: readNumber(value, "snowIntensity", id),
    snowEmitRate: readNumber(value, "snowEmitRate", id),
    snowParticleSpeed: readNumber(value, "snowParticleSpeed", id),
    snowParticleSize: readNumber(value, "snowParticleSize", id),
    windDirection: readTuple(value, "windDirection", id, false),
    windVisualStrength: readNumber(value, "windVisualStrength", id),
  } satisfies WeatherVisualProfile;

  for (const field of UNIT_INTERVAL_FIELDS) {
    if (parsed[field] < 0 || parsed[field] > 1) {
      throw new Error(`天气视觉 ${id}.${field} 必须位于 0 到 1。`);
    }
  }
  for (const field of NON_NEGATIVE_FIELDS) {
    if (parsed[field] < 0) {
      throw new Error(`天气视觉 ${id}.${field} 不能小于 0。`);
    }
  }
  return Object.freeze(parsed);
}

function readNumber(record: Record<string, unknown>, field: string, id: WeatherId): number {
  const value = record[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`天气视觉 ${id}.${field} 必须是有限数值。`);
  }
  return value;
}

function readTuple(
  record: Record<string, unknown>,
  field: string,
  id: WeatherId,
  unitInterval: boolean,
): VisualColor | VisualDirection {
  const value = record[field];
  if (
    !Array.isArray(value)
    || value.length !== 3
    || value.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))
  ) {
    throw new Error(`天气视觉 ${id}.${field} 必须包含 3 个有限数值。`);
  }
  if (unitInterval && value.some((entry) => entry < 0 || entry > 1)) {
    throw new Error(`天气视觉 ${id}.${field} 的颜色分量必须位于 0 到 1。`);
  }
  return Object.freeze([value[0], value[1], value[2]]) as VisualColor | VisualDirection;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
