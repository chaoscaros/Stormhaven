export const THERMAL_STATUS_IDS = [
  "comfortable",
  "cool",
  "cold",
  "freezing",
  "critical",
] as const;

export type ThermalStatus = (typeof THERMAL_STATUS_IDS)[number];
export type ThermalTrend = "warming" | "stable" | "cooling";

export interface ThermalSnapshot {
  readonly currentValue: number;
  readonly effectiveTemperatureCelsius: number;
  readonly windChillPenaltyCelsius: number;
  readonly normalizedWindStrength: number;
  readonly changeRatePerSecond: number;
  readonly trend: ThermalTrend;
  readonly status: ThermalStatus;
}
