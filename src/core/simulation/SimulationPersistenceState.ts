import type { WeatherId } from "../../weather/WeatherDefinition";

/** Source state only. Forecast cursor is reconstructed from deterministic scenario time. */
export interface SimulationPersistenceState {
  readonly time: { readonly totalGameMinutes: number; readonly timeScale: number };
  readonly weather: {
    readonly currentWeatherId: WeatherId;
    readonly transition: {
      readonly targetWeatherId: WeatherId;
      readonly durationGameSeconds: number;
      readonly elapsedGameSeconds: number;
    } | null;
  };
  readonly thermalReserve: number;
}
