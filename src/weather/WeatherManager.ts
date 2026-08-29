import { WeatherCatalog } from "./WeatherCatalog";
import type { WeatherDefinition, WeatherId } from "./WeatherDefinition";
import { WeatherTransition } from "./WeatherTransition";
import type { WeatherTransitionSnapshot } from "./WeatherTransition";

export type WeatherStateEvent =
  | {
      readonly type: "weather-changed";
      readonly previousWeatherId: WeatherId;
      readonly weatherId: WeatherId;
    }
  | {
      readonly type: "weather-transition-started";
      readonly currentWeatherId: WeatherId;
      readonly targetWeatherId: WeatherId;
      readonly durationGameSeconds: number;
    }
  | {
      readonly type: "weather-transition-completed";
      readonly previousWeatherId: WeatherId;
      readonly weatherId: WeatherId;
    };

/** 只维护天气 Domain 状态，不了解 Scene、DOM、音频或视觉表现。 */
export class WeatherManager {
  readonly #catalog: WeatherCatalog;
  #currentWeatherId: WeatherId;
  #transition: WeatherTransition | undefined;

  constructor(catalog: WeatherCatalog, initialWeatherId: WeatherId) {
    catalog.get(initialWeatherId);
    this.#catalog = catalog;
    this.#currentWeatherId = initialWeatherId;
  }

  get currentWeather(): WeatherDefinition {
    return this.#catalog.get(this.#currentWeatherId);
  }

  get targetWeather(): WeatherDefinition | undefined {
    const targetId = this.#transition?.snapshot.targetWeatherId;
    return targetId ? this.#catalog.get(targetId) : undefined;
  }

  get transition(): WeatherTransitionSnapshot | undefined {
    return this.#transition?.snapshot;
  }

  setWeather(weatherId: WeatherId): readonly WeatherStateEvent[] {
    this.#catalog.get(weatherId);
    const previousWeatherId = this.#currentWeatherId;
    this.#transition = undefined;
    this.#currentWeatherId = weatherId;

    if (previousWeatherId === weatherId) {
      return Object.freeze([]);
    }
    return Object.freeze([
      { type: "weather-changed", previousWeatherId, weatherId },
    ]);
  }

  transitionTo(
    targetWeatherId: WeatherId,
    durationGameSeconds: number,
  ): readonly WeatherStateEvent[] {
    this.#catalog.get(targetWeatherId);
    this.#transition = new WeatherTransition(
      this.#currentWeatherId,
      targetWeatherId,
      durationGameSeconds,
    );
    return Object.freeze([
      {
        type: "weather-transition-started",
        currentWeatherId: this.#currentWeatherId,
        targetWeatherId,
        durationGameSeconds,
      },
    ]);
  }

  update(deltaGameSeconds: number): readonly WeatherStateEvent[] {
    if (!this.#transition) {
      return Object.freeze([]);
    }

    const transition = this.#transition.update(deltaGameSeconds);
    if (!transition.completed) {
      return Object.freeze([]);
    }

    const previousWeatherId = this.#currentWeatherId;
    this.#currentWeatherId = transition.targetWeatherId;
    this.#transition = undefined;
    return Object.freeze([
      {
        type: "weather-transition-completed",
        previousWeatherId,
        weatherId: this.#currentWeatherId,
      },
      {
        type: "weather-changed",
        previousWeatherId,
        weatherId: this.#currentWeatherId,
      },
    ]);
  }
}
