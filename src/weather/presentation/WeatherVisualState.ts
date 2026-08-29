import type { WeatherId } from "../WeatherDefinition";

export type VisualColor = readonly [red: number, green: number, blue: number];
export type VisualDirection = readonly [x: number, y: number, z: number];

/** 与 Babylon 解耦、可插值的完整天气视觉状态。 */
export interface WeatherVisualState {
  readonly skyBrightness: number;
  readonly skyCloudiness: number;
  readonly horizonColor: VisualColor;
  readonly zenithColor: VisualColor;
  readonly fogDensity: number;
  readonly fogColor: VisualColor;
  readonly hemisphericLightIntensity: number;
  readonly directionalLightIntensity: number;
  readonly snowIntensity: number;
  readonly snowEmitRate: number;
  readonly snowParticleSpeed: number;
  readonly snowParticleSize: number;
  readonly windDirection: VisualDirection;
  readonly windVisualStrength: number;
}

export interface WeatherVisualProfile extends WeatherVisualState {
  readonly id: WeatherId;
}
