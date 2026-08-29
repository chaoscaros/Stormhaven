import type { WeatherId } from "./WeatherDefinition";

export interface WeatherTransitionSnapshot {
  readonly currentWeatherId: WeatherId;
  readonly targetWeatherId: WeatherId;
  readonly durationGameSeconds: number;
  readonly elapsedGameSeconds: number;
  readonly progress: number;
  readonly completed: boolean;
}

/** 以游戏秒为单位推进的确定性天气过渡。 */
export class WeatherTransition {
  readonly #currentWeatherId: WeatherId;
  readonly #targetWeatherId: WeatherId;
  readonly #durationGameSeconds: number;
  #elapsedGameSeconds = 0;

  constructor(
    currentWeatherId: WeatherId,
    targetWeatherId: WeatherId,
    durationGameSeconds: number,
  ) {
    if (!Number.isFinite(durationGameSeconds) || durationGameSeconds < 0) {
      throw new Error("天气过渡时长必须是大于或等于 0 的有限数值。");
    }
    this.#currentWeatherId = currentWeatherId;
    this.#targetWeatherId = targetWeatherId;
    this.#durationGameSeconds = durationGameSeconds;
  }

  get snapshot(): WeatherTransitionSnapshot {
    const progress = this.#durationGameSeconds === 0
      ? 1
      : Math.min(this.#elapsedGameSeconds / this.#durationGameSeconds, 1);
    return Object.freeze({
      currentWeatherId: this.#currentWeatherId,
      targetWeatherId: this.#targetWeatherId,
      durationGameSeconds: this.#durationGameSeconds,
      elapsedGameSeconds: this.#elapsedGameSeconds,
      progress,
      completed: progress >= 1,
    });
  }

  update(deltaGameSeconds: number): WeatherTransitionSnapshot {
    if (!Number.isFinite(deltaGameSeconds) || deltaGameSeconds < 0) {
      throw new Error("deltaGameSeconds 必须是大于或等于 0 的有限数值。");
    }
    this.#elapsedGameSeconds = Math.min(
      this.#elapsedGameSeconds + deltaGameSeconds,
      this.#durationGameSeconds,
    );
    return this.snapshot;
  }
}
