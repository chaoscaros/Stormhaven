import {
  createGameTimeSnapshot,
  toTotalGameMinutes,
  type GameTimeInput,
  type GameTimeSnapshot,
} from "./GameTime";

export interface GameClockConfig {
  readonly initialTime: GameTimeInput;
  /** 每经过 1 个真实秒所推进的游戏秒数。 */
  readonly timeScale: number;
  readonly paused?: boolean;
}

export interface GameTimeAdvance {
  readonly previous: GameTimeSnapshot;
  readonly current: GameTimeSnapshot;
  readonly advancedGameMinutes: number;
}

/** 与系统时间、DOM 和 Babylon 完全解耦的确定性游戏时钟。 */
export class GameClock {
  #totalGameMinutes: number;
  #timeScale: number;
  #paused: boolean;

  constructor(config: GameClockConfig) {
    this.#totalGameMinutes = toTotalGameMinutes(config.initialTime);
    this.#timeScale = validateTimeScale(config.timeScale);
    this.#paused = config.paused ?? false;
  }

  get snapshot(): GameTimeSnapshot {
    return createGameTimeSnapshot(this.#totalGameMinutes);
  }

  get timeScale(): number {
    return this.#timeScale;
  }

  get paused(): boolean {
    return this.#paused;
  }

  setTimeScale(timeScale: number): void {
    this.#timeScale = validateTimeScale(timeScale);
  }

  setPaused(paused: boolean): void {
    this.#paused = paused;
  }

  update(deltaSeconds: number): GameTimeAdvance {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new Error("deltaSeconds 必须是大于或等于 0 的有限数值。");
    }

    const previous = this.snapshot;
    const advancedGameMinutes = this.#paused
      ? 0
      : (deltaSeconds * this.#timeScale) / 60;
    this.#totalGameMinutes += advancedGameMinutes;

    return Object.freeze({
      previous,
      current: this.snapshot,
      advancedGameMinutes,
    });
  }
}

function validateTimeScale(timeScale: number): number {
  if (!Number.isFinite(timeScale) || timeScale < 0) {
    throw new Error("timeScale 必须是大于或等于 0 的有限数值。");
  }
  return timeScale;
}
