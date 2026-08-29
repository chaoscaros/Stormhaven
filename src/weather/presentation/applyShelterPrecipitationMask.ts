import type { WeatherVisualState } from "./WeatherVisualState";

/** Shelter v0.1 的局部降水遮罩；只影响相机周围粒子，不修改 Weather Domain。 */
export function applyShelterPrecipitationMask(
  state: WeatherVisualState,
  isSheltered: boolean,
): WeatherVisualState {
  if (!isSheltered) return state;
  return Object.freeze({
    ...state,
    snowIntensity: 0,
    snowEmitRate: 0,
  });
}
