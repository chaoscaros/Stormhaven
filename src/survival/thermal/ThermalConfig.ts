export interface ThermalStatusThresholds {
  readonly comfortableMin: number;
  readonly coolMin: number;
  readonly coldMin: number;
  readonly freezingMin: number;
}

export interface ThermalConfig {
  readonly neutralTemperatureCelsius: number;
  readonly coldThresholdCelsius: number;
  readonly freezingThresholdCelsius: number;
  readonly severeColdThresholdCelsius: number;
  readonly windStrengthAtMaxPenalty: number;
  readonly maxWindChillPenaltyCelsius: number;
  readonly thermalLossRateMildPerSecond: number;
  readonly thermalLossRateColdPerSecond: number;
  readonly thermalLossRateSeverePerSecond: number;
  readonly thermalRecoveryRatePerSecond: number;
  readonly minThermalValue: number;
  readonly maxThermalValue: number;
  readonly initialThermalValue: number;
  readonly statusThresholds: ThermalStatusThresholds;
}

/** 轻量验证 data/survival/thermal.json，不依赖 Schema Library。 */
export function parseThermalConfig(value: unknown): ThermalConfig {
  const record = asRecord(value, "Thermal Config");
  const statusRecord = asRecord(record.statusThresholds, "Thermal Status Thresholds");
  const config = {
    neutralTemperatureCelsius: readFinite(record, "neutralTemperatureCelsius"),
    coldThresholdCelsius: readFinite(record, "coldThresholdCelsius"),
    freezingThresholdCelsius: readFinite(record, "freezingThresholdCelsius"),
    severeColdThresholdCelsius: readFinite(record, "severeColdThresholdCelsius"),
    windStrengthAtMaxPenalty: readFinite(record, "windStrengthAtMaxPenalty"),
    maxWindChillPenaltyCelsius: readFinite(record, "maxWindChillPenaltyCelsius"),
    thermalLossRateMildPerSecond: readFinite(record, "thermalLossRateMildPerSecond"),
    thermalLossRateColdPerSecond: readFinite(record, "thermalLossRateColdPerSecond"),
    thermalLossRateSeverePerSecond: readFinite(record, "thermalLossRateSeverePerSecond"),
    thermalRecoveryRatePerSecond: readFinite(record, "thermalRecoveryRatePerSecond"),
    minThermalValue: readFinite(record, "minThermalValue"),
    maxThermalValue: readFinite(record, "maxThermalValue"),
    initialThermalValue: readFinite(record, "initialThermalValue"),
    statusThresholds: Object.freeze({
      comfortableMin: readFinite(statusRecord, "comfortableMin"),
      coolMin: readFinite(statusRecord, "coolMin"),
      coldMin: readFinite(statusRecord, "coldMin"),
      freezingMin: readFinite(statusRecord, "freezingMin"),
    }),
  } satisfies ThermalConfig;

  if (!(config.neutralTemperatureCelsius > config.coldThresholdCelsius
    && config.coldThresholdCelsius > config.freezingThresholdCelsius
    && config.freezingThresholdCelsius > config.severeColdThresholdCelsius)) {
    throw new Error("Thermal 温度阈值必须按 neutral > cold > freezing > severe 排列。");
  }
  if (!(config.minThermalValue < config.maxThermalValue)) {
    throw new Error("Thermal minThermalValue 必须小于 maxThermalValue。");
  }
  if (
    config.initialThermalValue < config.minThermalValue
    || config.initialThermalValue > config.maxThermalValue
  ) {
    throw new Error("Thermal initialThermalValue 必须位于 min/max 范围内。");
  }
  if (config.windStrengthAtMaxPenalty <= 0) {
    throw new Error("Thermal windStrengthAtMaxPenalty 必须大于 0。");
  }

  const nonNegativeFields = [
    "maxWindChillPenaltyCelsius",
    "thermalLossRateMildPerSecond",
    "thermalLossRateColdPerSecond",
    "thermalLossRateSeverePerSecond",
    "thermalRecoveryRatePerSecond",
  ] as const;
  for (const field of nonNegativeFields) {
    if (config[field] < 0) {
      throw new Error(`Thermal ${field} 不能小于 0。`);
    }
  }
  if (!(config.thermalLossRateMildPerSecond <= config.thermalLossRateColdPerSecond
    && config.thermalLossRateColdPerSecond <= config.thermalLossRateSeverePerSecond)) {
    throw new Error("Thermal Loss Rate 必须按 mild <= cold <= severe 排列。");
  }

  const thresholds = config.statusThresholds;
  if (!(config.maxThermalValue >= thresholds.comfortableMin
    && thresholds.comfortableMin > thresholds.coolMin
    && thresholds.coolMin > thresholds.coldMin
    && thresholds.coldMin > thresholds.freezingMin
    && thresholds.freezingMin > config.minThermalValue)) {
    throw new Error("Thermal Status Threshold 必须在 min/max 内严格降序排列。");
  }
  return Object.freeze(config);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

function readFinite(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Thermal ${field} 必须是有限数值。`);
  }
  return value;
}
