import type { WeatherId } from "../WeatherDefinition";

/** 供 Gameplay 消费的插值天气数据；所有字段均与 Babylon/DOM 解耦。 */
export interface WeatherGameplayState {
  readonly currentWeatherId: WeatherId;
  readonly targetWeatherId?: WeatherId;
  readonly transitionProgress: number;
  /** 摄氏度（°C）的环境基础温度。 */
  readonly ambientTemperatureCelsius: number;
  /** 摄氏度（°C）的天气附加修正。 */
  readonly temperatureModifierCelsius: number;
  /** 无单位、非负的游戏化风力指数；当前配置范围为 3..28。 */
  readonly windStrength: number;
  readonly visibilityMeters: number;
  readonly precipitation: number;
  readonly wetnessRate: number;
  readonly movementModifier: number;
  readonly solarEfficiency: number;
}
