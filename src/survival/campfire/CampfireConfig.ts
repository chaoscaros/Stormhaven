import type { CampfireConfig } from "./CampfireTypes";

export function parseCampfireConfig(value: unknown): CampfireConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Campfire 配置必须是对象。");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.fuelCapacitySeconds !== "number"
    || !Number.isFinite(record.fuelCapacitySeconds)
    || record.fuelCapacitySeconds <= 0
  ) {
    throw new Error("Campfire fuelCapacitySeconds 必须是大于 0 的有限数值。");
  }
  if (typeof record.heatSourceProfileId !== "string" || record.heatSourceProfileId.length === 0) {
    throw new Error("Campfire heatSourceProfileId 必须是非空字符串。");
  }
  return Object.freeze({
    fuelCapacitySeconds: record.fuelCapacitySeconds,
    heatSourceProfileId: record.heatSourceProfileId,
  });
}
