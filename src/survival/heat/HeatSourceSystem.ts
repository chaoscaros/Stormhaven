import type { HeatSourcePlacement } from "../environment/SurvivalEnvironmentScenario";
import { distanceBetween, type SpatialPoint } from "../environment/SpatialPoint";

export interface HeatSourceProfile {
  readonly id: string;
  readonly displayName: string;
  readonly radiusMeters: number;
  readonly maxTemperatureBonusCelsius: number;
}

export interface HeatSourceConfig {
  readonly maxCombinedHeatBonusCelsius: number;
  readonly profiles: readonly HeatSourceProfile[];
}

export interface HeatContributionSnapshot {
  readonly temperatureBonusCelsius: number;
  readonly contributingSourceIds: readonly string[];
  readonly dominantSourceId?: string;
  readonly dominantDisplayName?: string;
}

interface RegisteredHeatSource {
  readonly placement: HeatSourcePlacement;
  readonly profile: HeatSourceProfile;
}

const NO_HEAT: HeatContributionSnapshot = Object.freeze({
  temperatureBonusCelsius: 0,
  contributingSourceIds: Object.freeze([]),
});

/** 计算纯坐标处的通用热源贡献，不依赖渲染与交互。 */
export class HeatSourceSystem {
  readonly #maxCombinedHeatBonusCelsius: number;
  readonly #sources: readonly RegisteredHeatSource[];

  constructor(config: HeatSourceConfig, placements: readonly HeatSourcePlacement[]) {
    this.#maxCombinedHeatBonusCelsius = config.maxCombinedHeatBonusCelsius;
    const profiles = new Map(config.profiles.map((profile) => [profile.id, profile]));
    this.#sources = Object.freeze(placements.map((placement) => {
      const profile = profiles.get(placement.profileId);
      if (!profile) throw new Error(`不存在 HeatSource Profile ID：${placement.profileId}`);
      return Object.freeze({ placement, profile });
    }));
  }

  static parseConfig(value: unknown): HeatSourceConfig {
    const record = asRecord(value, "HeatSource 配置");
    const maximum = readFinite(
      record.maxCombinedHeatBonusCelsius,
      "HeatSource maxCombinedHeatBonusCelsius",
    );
    if (maximum < 0) {
      throw new Error("HeatSource maxCombinedHeatBonusCelsius 不能小于 0。");
    }
    if (!Array.isArray(record.profiles)) {
      throw new Error("HeatSource profiles 必须是数组。");
    }
    const profiles = record.profiles.map((entry, index) => parseProfile(entry, index));
    const ids = new Set<string>();
    for (const profile of profiles) {
      if (ids.has(profile.id)) throw new Error(`HeatSource Profile ID 重复：${profile.id}`);
      ids.add(profile.id);
    }
    return Object.freeze({
      maxCombinedHeatBonusCelsius: maximum,
      profiles: Object.freeze(profiles),
    });
  }

  static empty(): HeatSourceSystem {
    return new HeatSourceSystem(
      Object.freeze({ maxCombinedHeatBonusCelsius: 0, profiles: Object.freeze([]) }),
      [],
    );
  }

  getContribution(position: SpatialPoint): HeatContributionSnapshot {
    let total = 0;
    let dominant: RegisteredHeatSource | undefined;
    let dominantBonus = 0;
    const sourceIds: string[] = [];

    for (const source of this.#sources) {
      if (!source.placement.enabled) continue;
      const distance = distanceBetween(position, source.placement.position);
      if (distance >= source.profile.radiusMeters) continue;
      const normalizedDistance = distance / source.profile.radiusMeters;
      const smoothDistance = normalizedDistance * normalizedDistance
        * (3 - 2 * normalizedDistance);
      const bonus = source.profile.maxTemperatureBonusCelsius * (1 - smoothDistance);
      if (bonus <= 0) continue;
      total += bonus;
      sourceIds.push(source.placement.id);
      if (bonus > dominantBonus) {
        dominant = source;
        dominantBonus = bonus;
      }
    }

    if (sourceIds.length === 0) return NO_HEAT;
    return Object.freeze({
      temperatureBonusCelsius: Math.min(total, this.#maxCombinedHeatBonusCelsius),
      contributingSourceIds: Object.freeze(sourceIds),
      ...(dominant
        ? {
            dominantSourceId: dominant.placement.id,
            dominantDisplayName: dominant.profile.displayName,
          }
        : {}),
    });
  }
}

function parseProfile(value: unknown, index: number): HeatSourceProfile {
  const record = asRecord(value, `HeatSource Profile[${index}]`);
  const id = readString(record.id, `HeatSource Profile[${index}].id`);
  const displayName = readString(
    record.displayName,
    `HeatSource Profile[${index}].displayName`,
  );
  const radiusMeters = readFinite(
    record.radiusMeters,
    `HeatSource Profile[${index}].radiusMeters`,
  );
  const maxTemperatureBonusCelsius = readFinite(
    record.maxTemperatureBonusCelsius,
    `HeatSource Profile[${index}].maxTemperatureBonusCelsius`,
  );
  if (radiusMeters <= 0) {
    throw new Error(`HeatSource Profile[${index}].radiusMeters 必须大于 0。`);
  }
  if (maxTemperatureBonusCelsius < 0) {
    throw new Error(
      `HeatSource Profile[${index}].maxTemperatureBonusCelsius 不能小于 0。`,
    );
  }
  return Object.freeze({ id, displayName, radiusMeters, maxTemperatureBonusCelsius });
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} 必须是非空字符串。`);
  }
  return value;
}

function readFinite(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} 必须是有限数值。`);
  }
  return value;
}
