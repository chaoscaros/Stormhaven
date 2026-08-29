import type { WeatherGameplayState } from "../../weather/gameplay/WeatherGameplayState";
import type { ThermalUpdateInputs } from "./ThermalModel";
import type { ThermalEnvironmentSnapshot } from "./ThermalEnvironment";

/** Weather Gameplay State → Thermal 的窄输入适配点，供未来热源/庇护扩展。 */
export function createThermalInputs(
  weather: WeatherGameplayState,
  environment: ThermalEnvironmentSnapshot,
  deltaSeconds: number,
): ThermalUpdateInputs {
  return Object.freeze({
    ambientTemperatureCelsius: weather.ambientTemperatureCelsius,
    temperatureModifierCelsius: weather.temperatureModifierCelsius,
    windStrength: environment.effectiveWindStrength,
    shelterTemperatureBonusCelsius: environment.shelterTemperatureBonusCelsius,
    externalHeatBonusCelsius: environment.externalHeatBonusCelsius,
    deltaSeconds,
  });
}
