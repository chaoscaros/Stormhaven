import { parseSpatialPoint, type SpatialPoint } from "./SpatialPoint";
import { AxisAlignedVolume, type AxisAlignedBounds } from "../shelter/AxisAlignedVolume";

export interface ShelterPlacement {
  readonly id: string;
  readonly profileId: string;
  readonly bounds: AxisAlignedBounds;
}

export interface HeatSourcePlacement {
  readonly id: string;
  readonly profileId: string;
  readonly position: SpatialPoint;
  readonly enabled: boolean;
}

export interface SurvivalEnvironmentScenario {
  readonly shelters: readonly ShelterPlacement[];
  readonly heatSources: readonly HeatSourcePlacement[];
}

/** 解析世界/Scenario 对 Shelter 与 HeatSource 的空间注册。 */
export function parseSurvivalEnvironmentScenario(
  value: unknown,
): SurvivalEnvironmentScenario {
  const record = asRecord(value, "Survival Environment Scenario");
  if (!Array.isArray(record.shelters) || !Array.isArray(record.heatSources)) {
    throw new Error("Survival Environment Scenario 必须包含 shelters 和 heatSources 数组。");
  }
  const shelters = record.shelters.map((entry, index) => {
    const placement = asRecord(entry, `Shelter Placement[${index}]`);
    return Object.freeze({
      id: readId(placement.id, `Shelter Placement[${index}].id`),
      profileId: readId(placement.profileId, `Shelter Placement[${index}].profileId`),
      bounds: AxisAlignedVolume.parseBounds(
        placement.bounds,
        `Shelter Placement[${index}].bounds`,
      ),
    });
  });
  const heatSources = record.heatSources.map((entry, index) => {
    const placement = asRecord(entry, `HeatSource Placement[${index}]`);
    if (typeof placement.enabled !== "boolean") {
      throw new Error(`HeatSource Placement[${index}].enabled 必须是布尔值。`);
    }
    return Object.freeze({
      id: readId(placement.id, `HeatSource Placement[${index}].id`),
      profileId: readId(
        placement.profileId,
        `HeatSource Placement[${index}].profileId`,
      ),
      position: parseSpatialPoint(
        placement.position,
        `HeatSource Placement[${index}].position`,
      ),
      enabled: placement.enabled,
    });
  });
  assertUniqueIds(shelters, "Shelter Placement");
  assertUniqueIds(heatSources, "HeatSource Placement");
  return Object.freeze({
    shelters: Object.freeze(shelters),
    heatSources: Object.freeze(heatSources),
  });
}

function assertUniqueIds(entries: readonly { readonly id: string }[], label: string): void {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`${label} ID 重复：${entry.id}`);
    ids.add(entry.id);
  }
}

function readId(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} 必须是非空字符串。`);
  }
  return value;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}
