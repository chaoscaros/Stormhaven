import type { WeatherGameplayState } from "../../weather/gameplay/WeatherGameplayState";
import type { HeatContributionSnapshot } from "../heat/HeatSourceSystem";
import type { ShelterState } from "../shelter/ShelterSystem";

export interface ThermalEnvironmentSnapshot {
  readonly rawWindStrength: number;
  readonly effectiveWindStrength: number;
  readonly windProtection: number;
  readonly shelterTemperatureBonusCelsius: number;
  readonly externalHeatBonusCelsius: number;
}

/** 将天气、庇护与热源组合成 ThermalModel 可消费的环境快照。 */
export class ThermalEnvironmentBuilder {
  build(
    weather: WeatherGameplayState,
    shelter: ShelterState,
    heat: HeatContributionSnapshot,
  ): ThermalEnvironmentSnapshot {
    const effectiveWindStrength = weather.windStrength * (1 - shelter.windProtection);
    return Object.freeze({
      rawWindStrength: weather.windStrength,
      effectiveWindStrength,
      windProtection: shelter.windProtection,
      shelterTemperatureBonusCelsius: shelter.temperatureBonusCelsius,
      externalHeatBonusCelsius: heat.temperatureBonusCelsius,
    });
  }
}
