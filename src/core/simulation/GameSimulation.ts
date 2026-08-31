import { GameClock, type GameClockConfig } from "../time/GameClock";
import type { GameTimeSnapshot } from "../time/GameTime";
import { toTotalGameMinutes } from "../time/GameTime";
import { ForecastSystem, type WeatherForecastEntry } from "../../weather/ForecastSystem";
import { WeatherCatalog } from "../../weather/WeatherCatalog";
import type { WeatherId } from "../../weather/WeatherDefinition";
import { WeatherManager, type WeatherStateEvent } from "../../weather/WeatherManager";
import type { WeatherSchedule } from "../../weather/WeatherSchedule";
import { WeatherGameplayMapper } from "../../weather/gameplay/WeatherGameplayMapper";
import type { WeatherGameplayState } from "../../weather/gameplay/WeatherGameplayState";
import type { ThermalConfig } from "../../survival/thermal/ThermalConfig";
import { ThermalModel } from "../../survival/thermal/ThermalModel";
import type { ThermalSnapshot } from "../../survival/thermal/ThermalState";
import { createThermalInputs } from "../../survival/thermal/createThermalInputs";
import type { SpatialPoint } from "../../survival/environment/SpatialPoint";
import { ShelterSystem, type ShelterState } from "../../survival/shelter/ShelterSystem";
import {
  HeatSourceSystem,
  type HeatContributionSnapshot,
} from "../../survival/heat/HeatSourceSystem";
import {
  ThermalEnvironmentBuilder,
  type ThermalEnvironmentSnapshot,
} from "../../survival/thermal/ThermalEnvironment";

export interface GameSimulationConfig extends GameClockConfig {
  readonly maxDeltaSeconds: number;
}

export interface GameSimulationEnvironmentConfig {
  readonly shelterSystem: ShelterSystem;
  readonly heatSourceSystem: HeatSourceSystem;
  readonly initialPlayerPosition: SpatialPoint;
  readonly runtimeSystems?: readonly SimulationUpdatable[];
}

export interface SimulationUpdatable {
  update(deltaSeconds: number): void;
}

export interface SimulationWeatherSnapshot {
  readonly id: WeatherId;
  readonly displayName: string;
}

export interface SimulationForecastSnapshot {
  readonly id: string;
  readonly weatherId: WeatherId;
  readonly displayName: string;
  readonly startsAt: GameTimeSnapshot;
}

export interface SimulationTransitionSnapshot {
  readonly targetWeatherId: WeatherId;
  readonly targetDisplayName: string;
  readonly progress: number;
}

export interface GameSimulationSnapshot {
  readonly time: GameTimeSnapshot;
  readonly weather: SimulationWeatherSnapshot;
  readonly gameplayWeather: WeatherGameplayState;
  readonly shelter: ShelterState;
  readonly heat: HeatContributionSnapshot;
  readonly thermalEnvironment: ThermalEnvironmentSnapshot;
  readonly thermal: ThermalSnapshot;
  readonly forecast?: SimulationForecastSnapshot;
  readonly transition?: SimulationTransitionSnapshot;
}

export type GameSimulationEvent =
  | {
      readonly type: "game-time-changed";
      readonly previous: GameTimeSnapshot;
      readonly current: GameTimeSnapshot;
    }
  | {
      readonly type: "forecast-updated";
      readonly forecast?: SimulationForecastSnapshot;
    }
  | WeatherStateEvent;

export interface GameSimulationUpdate {
  readonly snapshot: GameSimulationSnapshot;
  readonly events: readonly GameSimulationEvent[];
}

/** 协调时间、Forecast 与 Weather Domain，不包含任何 Babylon 或 DOM 逻辑。 */
export class GameSimulation {
  readonly #clock: GameClock;
  readonly #catalog: WeatherCatalog;
  readonly #forecast: ForecastSystem;
  readonly #weather: WeatherManager;
  readonly #weatherGameplayMapper = new WeatherGameplayMapper();
  readonly #thermal: ThermalModel;
  readonly #shelterSystem: ShelterSystem;
  readonly #heatSourceSystem: HeatSourceSystem;
  readonly #runtimeSystems: readonly SimulationUpdatable[];
  readonly #thermalEnvironmentBuilder = new ThermalEnvironmentBuilder();
  readonly #maxDeltaSeconds: number;
  #playerPosition: SpatialPoint;
  #shelterState: ShelterState;
  #heatContribution: HeatContributionSnapshot;
  #thermalEnvironment: ThermalEnvironmentSnapshot;

  constructor(
    config: GameSimulationConfig,
    catalog: WeatherCatalog,
    schedule: WeatherSchedule,
    thermalConfig: ThermalConfig,
    environment?: GameSimulationEnvironmentConfig,
  ) {
    if (!Number.isFinite(config.maxDeltaSeconds) || config.maxDeltaSeconds <= 0) {
      throw new Error("maxDeltaSeconds 必须是大于 0 的有限数值。");
    }
    catalog.get(schedule.initialWeatherId);
    for (const entry of schedule.entries) {
      catalog.get(entry.weatherId);
    }

    this.#clock = new GameClock(config);
    this.#catalog = catalog;
    this.#forecast = new ForecastSystem(schedule);
    this.#weather = new WeatherManager(catalog, schedule.initialWeatherId);
    this.#thermal = new ThermalModel(thermalConfig);
    this.#shelterSystem = environment?.shelterSystem ?? ShelterSystem.empty();
    this.#heatSourceSystem = environment?.heatSourceSystem ?? HeatSourceSystem.empty();
    this.#runtimeSystems = Object.freeze([...(environment?.runtimeSystems ?? [])]);
    this.#playerPosition = freezePoint(
      environment?.initialPlayerPosition ?? { x: 0, y: 0, z: 0 },
    );
    this.#shelterState = this.#shelterSystem.getState(this.#playerPosition);
    this.#heatContribution = this.#heatSourceSystem.getContribution(this.#playerPosition);
    this.#thermalEnvironment = this.#thermalEnvironmentBuilder.build(
      this.#createGameplayWeatherState(),
      this.#shelterState,
      this.#heatContribution,
    );
    this.#maxDeltaSeconds = config.maxDeltaSeconds;
    this.#thermal.update(
      createThermalInputs(
        this.#createGameplayWeatherState(),
        this.#thermalEnvironment,
        0,
      ),
    );
  }

  get snapshot(): GameSimulationSnapshot {
    const time = this.#clock.snapshot;
    const currentWeather = this.#weather.currentWeather;
    const forecast = this.#createForecastSnapshot(this.#forecast.getNextForecast(time));
    const transition = this.#weather.transition;
    const targetWeather = this.#weather.targetWeather;
    const gameplayWeather = this.#createGameplayWeatherState();

    return Object.freeze({
      time,
      weather: Object.freeze({
        id: currentWeather.id,
        displayName: currentWeather.displayName,
      }),
      gameplayWeather,
      shelter: this.#shelterState,
      heat: this.#heatContribution,
      thermalEnvironment: this.#thermalEnvironment,
      thermal: this.#thermal.snapshot,
      ...(forecast ? { forecast } : {}),
      ...(transition && targetWeather
        ? {
            transition: Object.freeze({
              targetWeatherId: targetWeather.id,
              targetDisplayName: targetWeather.displayName,
              progress: transition.progress,
            }),
          }
        : {}),
    });
  }

  update(deltaSeconds: number, playerPosition: SpatialPoint = this.#playerPosition): GameSimulationUpdate {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new Error("deltaSeconds 必须是大于或等于 0 的有限数值。");
    }

    const clampedDeltaSeconds = Math.min(deltaSeconds, this.#maxDeltaSeconds);
    this.#playerPosition = freezePoint(playerPosition);
    const forecastBefore = this.#forecast.getNextForecast(this.#clock.snapshot);
    const timeAdvance = this.#clock.update(clampedDeltaSeconds);
    const runtimeDeltaSeconds = this.#clock.paused ? 0 : clampedDeltaSeconds;
    for (const system of this.#runtimeSystems) system.update(runtimeDeltaSeconds);
    const events: GameSimulationEvent[] = [];

    if (timeAdvance.advancedGameMinutes > 0) {
      events.push({
        type: "game-time-changed",
        previous: timeAdvance.previous,
        current: timeAdvance.current,
      });
    }

    const forecastActions = this.#forecast.update(timeAdvance.previous, timeAdvance.current);
    const transitionWasActive = this.#weather.transition !== undefined;
    if (transitionWasActive) {
      events.push(...this.#weather.update(timeAdvance.advancedGameMinutes * 60));
    }

    for (const action of forecastActions) {
      if (action.type === "weather-transition-due") {
        events.push(
          ...this.#weather.transitionTo(
            action.entry.weatherId,
            action.entry.transitionDurationGameMinutes * 60,
          ),
        );
        const transitionStart = toTotalGameMinutes(action.entry.transitionStartsAt);
        const elapsedAfterStart = Math.max(
          0,
          timeAdvance.current.totalGameMinutes - transitionStart,
        );
        events.push(...this.#weather.update(elapsedAfterStart * 60));
      } else {
        events.push(...this.#weather.setWeather(action.entry.weatherId));
      }
    }

    const gameplayWeather = this.#createGameplayWeatherState();
    this.#shelterState = this.#shelterSystem.getState(this.#playerPosition);
    this.#heatContribution = this.#heatSourceSystem.getContribution(this.#playerPosition);
    this.#thermalEnvironment = this.#thermalEnvironmentBuilder.build(
      gameplayWeather,
      this.#shelterState,
      this.#heatContribution,
    );
    this.#thermal.update(createThermalInputs(
      gameplayWeather,
      this.#thermalEnvironment,
      runtimeDeltaSeconds,
    ));

    const snapshot = this.snapshot;
    const forecastAfter = this.#forecast.getNextForecast(timeAdvance.current);
    if (forecastBefore?.id !== forecastAfter?.id) {
      events.push({
        type: "forecast-updated",
        forecast: this.#createForecastSnapshot(forecastAfter),
      });
    }

    return Object.freeze({ snapshot, events: Object.freeze(events) });
  }

  setPaused(paused: boolean): void {
    this.#clock.setPaused(paused);
  }

  setTimeScale(timeScale: number): void {
    this.#clock.setTimeScale(timeScale);
  }

  #createGameplayWeatherState(): WeatherGameplayState {
    return this.#weatherGameplayMapper.map(
      this.#weather.currentWeather,
      this.#weather.targetWeather,
      this.#weather.transition?.progress,
    );
  }

  #createForecastSnapshot(
    entry: WeatherForecastEntry | undefined,
  ): SimulationForecastSnapshot | undefined {
    if (!entry) {
      return undefined;
    }
    const weather = this.#catalog.get(entry.weatherId);
    return Object.freeze({
      id: entry.id,
      weatherId: entry.weatherId,
      displayName: weather.displayName,
      startsAt: Object.freeze({
        ...entry.startsAt,
        totalGameMinutes: toTotalGameMinutes(entry.startsAt),
      }),
    });
  }
}

function freezePoint(point: SpatialPoint): SpatialPoint {
  if (![point.x, point.y, point.z].every(Number.isFinite)) {
    throw new Error("玩家坐标 x/y/z 必须是有限数值。");
  }
  return Object.freeze({ x: point.x, y: point.y, z: point.z });
}
