import type { WeatherId } from "../WeatherDefinition";
import type { WeatherVisualProfileCatalog } from "./WeatherVisualProfileCatalog";
import type {
  VisualColor,
  VisualDirection,
  WeatherVisualState,
} from "./WeatherVisualState";

/** 纯函数式天气视觉插值；不导入 Babylon 或 DOM。 */
export class WeatherVisualMapper {
  constructor(private readonly profiles: WeatherVisualProfileCatalog) {}

  map(
    currentWeatherId: WeatherId,
    targetWeatherId?: WeatherId,
    transitionProgress = 0,
  ): WeatherVisualState {
    const current = this.profiles.get(currentWeatherId);
    if (!targetWeatherId) {
      return cloneState(current);
    }
    const target = this.profiles.get(targetWeatherId);
    const progress = clamp01(transitionProgress);
    if (progress === 0) return cloneState(current);
    if (progress === 1) return cloneState(target);
    return Object.freeze({
      skyBrightness: lerp(current.skyBrightness, target.skyBrightness, progress),
      skyCloudiness: lerp(current.skyCloudiness, target.skyCloudiness, progress),
      horizonColor: lerpTuple(current.horizonColor, target.horizonColor, progress),
      zenithColor: lerpTuple(current.zenithColor, target.zenithColor, progress),
      fogDensity: lerp(current.fogDensity, target.fogDensity, progress),
      fogColor: lerpTuple(current.fogColor, target.fogColor, progress),
      hemisphericLightIntensity: lerp(
        current.hemisphericLightIntensity,
        target.hemisphericLightIntensity,
        progress,
      ),
      directionalLightIntensity: lerp(
        current.directionalLightIntensity,
        target.directionalLightIntensity,
        progress,
      ),
      snowIntensity: lerp(current.snowIntensity, target.snowIntensity, progress),
      snowEmitRate: lerp(current.snowEmitRate, target.snowEmitRate, progress),
      snowParticleSpeed: lerp(
        current.snowParticleSpeed,
        target.snowParticleSpeed,
        progress,
      ),
      snowParticleSize: lerp(
        current.snowParticleSize,
        target.snowParticleSize,
        progress,
      ),
      windDirection: lerpTuple(
        current.windDirection,
        target.windDirection,
        progress,
      ),
      windVisualStrength: lerp(
        current.windVisualStrength,
        target.windVisualStrength,
        progress,
      ),
    });
  }
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function lerpTuple(
  from: VisualColor | VisualDirection,
  to: VisualColor | VisualDirection,
  progress: number,
): VisualColor | VisualDirection {
  return Object.freeze([
    lerp(from[0], to[0], progress),
    lerp(from[1], to[1], progress),
    lerp(from[2], to[2], progress),
  ]);
}

function cloneState(state: WeatherVisualState): WeatherVisualState {
  return Object.freeze({
    skyBrightness: state.skyBrightness,
    skyCloudiness: state.skyCloudiness,
    horizonColor: Object.freeze([...state.horizonColor]) as VisualColor,
    zenithColor: Object.freeze([...state.zenithColor]) as VisualColor,
    fogDensity: state.fogDensity,
    fogColor: Object.freeze([...state.fogColor]) as VisualColor,
    hemisphericLightIntensity: state.hemisphericLightIntensity,
    directionalLightIntensity: state.directionalLightIntensity,
    snowIntensity: state.snowIntensity,
    snowEmitRate: state.snowEmitRate,
    snowParticleSpeed: state.snowParticleSpeed,
    snowParticleSize: state.snowParticleSize,
    windDirection: Object.freeze([...state.windDirection]) as VisualDirection,
    windVisualStrength: state.windVisualStrength,
  });
}
