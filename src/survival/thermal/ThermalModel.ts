import {
  calculateEffectiveTemperature,
  type EffectiveTemperatureInputs,
} from "./EffectiveTemperature";
import type { ThermalConfig } from "./ThermalConfig";
import type {
  ThermalSnapshot,
  ThermalStatus,
  ThermalTrend,
} from "./ThermalState";

export interface ThermalUpdateInputs extends EffectiveTemperatureInputs {
  readonly deltaSeconds: number;
}

/** 0..100 体热储备模型；不是人体核心体温，也不产生 Health Damage。 */
export class ThermalModel {
  #currentValue: number;
  #snapshot: ThermalSnapshot;

  constructor(private readonly config: ThermalConfig) {
    this.#currentValue = config.initialThermalValue;
    this.#snapshot = Object.freeze({
      currentValue: this.#currentValue,
      effectiveTemperatureCelsius: config.neutralTemperatureCelsius,
      windChillPenaltyCelsius: 0,
      normalizedWindStrength: 0,
      changeRatePerSecond: 0,
      trend: "stable",
      status: this.#getStatus(this.#currentValue),
    });
  }

  get snapshot(): ThermalSnapshot {
    return this.#snapshot;
  }

  update(inputs: ThermalUpdateInputs): ThermalSnapshot {
    if (!Number.isFinite(inputs.deltaSeconds) || inputs.deltaSeconds < 0) {
      throw new Error("Thermal deltaSeconds 必须是大于或等于 0 的有限数值。");
    }
    const environment = calculateEffectiveTemperature(inputs, this.config);
    const intendedRate = this.#calculateChangeRate(
      environment.effectiveTemperatureCelsius,
    );
    const previousValue = this.#currentValue;
    this.#currentValue = clamp(
      previousValue + intendedRate * inputs.deltaSeconds,
      this.config.minThermalValue,
      this.config.maxThermalValue,
    );
    const actualRate = inputs.deltaSeconds > 0
      ? (this.#currentValue - previousValue) / inputs.deltaSeconds
      : this.#rateAtBoundary(intendedRate);
    this.#snapshot = Object.freeze({
      currentValue: this.#currentValue,
      ...environment,
      changeRatePerSecond: actualRate,
      trend: toTrend(actualRate),
      status: this.#getStatus(this.#currentValue),
    });
    return this.#snapshot;
  }

  #calculateChangeRate(effectiveTemperatureCelsius: number): number {
    const config = this.config;
    if (effectiveTemperatureCelsius >= config.neutralTemperatureCelsius) {
      return config.thermalRecoveryRatePerSecond;
    }
    if (effectiveTemperatureCelsius >= config.coldThresholdCelsius) {
      return -interpolateByTemperature(
        effectiveTemperatureCelsius,
        config.neutralTemperatureCelsius,
        config.coldThresholdCelsius,
        0,
        config.thermalLossRateMildPerSecond,
      );
    }
    if (effectiveTemperatureCelsius >= config.freezingThresholdCelsius) {
      return -interpolateByTemperature(
        effectiveTemperatureCelsius,
        config.coldThresholdCelsius,
        config.freezingThresholdCelsius,
        config.thermalLossRateMildPerSecond,
        config.thermalLossRateColdPerSecond,
      );
    }
    if (effectiveTemperatureCelsius >= config.severeColdThresholdCelsius) {
      return -interpolateByTemperature(
        effectiveTemperatureCelsius,
        config.freezingThresholdCelsius,
        config.severeColdThresholdCelsius,
        config.thermalLossRateColdPerSecond,
        config.thermalLossRateSeverePerSecond,
      );
    }
    return -config.thermalLossRateSeverePerSecond;
  }

  #rateAtBoundary(rate: number): number {
    if (this.#currentValue <= this.config.minThermalValue && rate < 0) return 0;
    if (this.#currentValue >= this.config.maxThermalValue && rate > 0) return 0;
    return rate;
  }

  #getStatus(value: number): ThermalStatus {
    const thresholds = this.config.statusThresholds;
    if (value >= thresholds.comfortableMin) return "comfortable";
    if (value >= thresholds.coolMin) return "cool";
    if (value >= thresholds.coldMin) return "cold";
    if (value >= thresholds.freezingMin) return "freezing";
    return "critical";
  }
}

function interpolateByTemperature(
  temperature: number,
  warmThreshold: number,
  coldThreshold: number,
  warmRate: number,
  coldRate: number,
): number {
  const progress = (warmThreshold - temperature) / (warmThreshold - coldThreshold);
  return warmRate + (coldRate - warmRate) * progress;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function toTrend(rate: number): ThermalTrend {
  if (rate > 0) return "warming";
  if (rate < 0) return "cooling";
  return "stable";
}
