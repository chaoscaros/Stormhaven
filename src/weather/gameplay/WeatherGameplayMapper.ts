import type { WeatherDefinition } from "../WeatherDefinition";
import type { WeatherGameplayState } from "./WeatherGameplayState";

/** 将 Weather Domain 的当前/目标定义映射为连续 Gameplay 参数。 */
export class WeatherGameplayMapper {
  map(
    current: WeatherDefinition,
    target?: WeatherDefinition,
    transitionProgress = 0,
  ): WeatherGameplayState {
    const progress = target ? clamp01(transitionProgress) : 0;
    const destination = target ?? current;
    return Object.freeze({
      currentWeatherId: current.id,
      ...(target ? { targetWeatherId: target.id } : {}),
      transitionProgress: progress,
      ambientTemperatureCelsius: interpolate(
        current.ambientTemperature,
        destination.ambientTemperature,
        progress,
      ),
      temperatureModifierCelsius: interpolate(
        current.temperatureModifier,
        destination.temperatureModifier,
        progress,
      ),
      windStrength: interpolate(current.windStrength, destination.windStrength, progress),
      visibilityMeters: interpolate(current.visibility, destination.visibility, progress),
      precipitation: interpolate(current.precipitation, destination.precipitation, progress),
      wetnessRate: interpolate(current.wetnessRate, destination.wetnessRate, progress),
      movementModifier: interpolate(
        current.movementModifier,
        destination.movementModifier,
        progress,
      ),
      solarEfficiency: interpolate(
        current.solarEfficiency,
        destination.solarEfficiency,
        progress,
      ),
    });
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function interpolate(from: number, to: number, progress: number): number {
  if (progress === 0) return from;
  if (progress === 1) return to;
  return from + (to - from) * progress;
}
