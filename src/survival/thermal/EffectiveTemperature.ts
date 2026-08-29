import type { ThermalConfig } from "./ThermalConfig";

export interface EffectiveTemperatureInputs {
  readonly ambientTemperatureCelsius: number;
  readonly temperatureModifierCelsius: number;
  readonly windStrength: number;
  readonly shelterTemperatureBonusCelsius: number;
  readonly externalHeatBonusCelsius: number;
}

export interface EffectiveTemperatureSnapshot {
  readonly effectiveTemperatureCelsius: number;
  readonly windChillPenaltyCelsius: number;
  readonly normalizedWindStrength: number;
}

/** 游戏化风寒曲线；不尝试模拟真实人体医学或气象公式。 */
export function calculateEffectiveTemperature(
  inputs: EffectiveTemperatureInputs,
  config: ThermalConfig,
): EffectiveTemperatureSnapshot {
  validateInputs(inputs);
  const normalizedWindStrength = clamp01(
    inputs.windStrength / config.windStrengthAtMaxPenalty,
  );
  const smoothedWindStrength = smoothStep(normalizedWindStrength);
  const windChillPenaltyCelsius =
    config.maxWindChillPenaltyCelsius * smoothedWindStrength;
  return Object.freeze({
    effectiveTemperatureCelsius:
      inputs.ambientTemperatureCelsius
      + inputs.temperatureModifierCelsius
      + inputs.shelterTemperatureBonusCelsius
      + inputs.externalHeatBonusCelsius
      - windChillPenaltyCelsius,
    windChillPenaltyCelsius,
    normalizedWindStrength,
  });
}

function validateInputs(inputs: EffectiveTemperatureInputs): void {
  const requiredValues = [
    ["ambientTemperatureCelsius", inputs.ambientTemperatureCelsius],
    ["temperatureModifierCelsius", inputs.temperatureModifierCelsius],
    ["windStrength", inputs.windStrength],
    ["shelterTemperatureBonusCelsius", inputs.shelterTemperatureBonusCelsius],
    ["externalHeatBonusCelsius", inputs.externalHeatBonusCelsius],
  ] as const;
  for (const [field, value] of requiredValues) {
    if (!Number.isFinite(value)) {
      throw new Error(`Effective Temperature ${field} 必须是有限数值。`);
    }
  }
  if (inputs.windStrength < 0) {
    throw new Error("Effective Temperature windStrength 不能小于 0。");
  }
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}
