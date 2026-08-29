import type { WeatherGameplayState } from "../../weather/gameplay/WeatherGameplayState";
import type { ThermalUpdateInputs } from "./ThermalModel";

/** Weather Gameplay State → Thermal 的窄输入适配点，供未来热源/庇护扩展。 */
export function createThermalInputs(
  weather: WeatherGameplayState,
  deltaSeconds: number,
): ThermalUpdateInputs {
  return Object.freeze({
    ambientTemperatureCelsius: weather.ambientTemperatureCelsius,
    temperatureModifierCelsius: weather.temperatureModifierCelsius,
    windStrength: weather.windStrength,
    deltaSeconds,
  });
}
