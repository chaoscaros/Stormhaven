export const WEATHER_IDS = ["clear", "cloudy", "snow", "blizzard"] as const;

export type WeatherId = (typeof WEATHER_IDS)[number];

export interface WeatherDefinition {
  readonly id: WeatherId;
  readonly displayName: string;
  readonly ambientTemperature: number;
  readonly temperatureModifier: number;
  readonly windStrength: number;
  readonly visibility: number;
  readonly precipitation: number;
  readonly wetnessRate: number;
  readonly movementModifier: number;
  readonly solarEfficiency: number;
}

export function isWeatherId(value: unknown): value is WeatherId {
  return typeof value === "string" && WEATHER_IDS.some((id) => id === value);
}
