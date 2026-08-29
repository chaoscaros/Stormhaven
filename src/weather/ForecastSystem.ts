import { toTotalGameMinutes, type GameTimeSnapshot } from "../core/time/GameTime";
import type { WeatherSchedule, WeatherScheduleEntry } from "./WeatherSchedule";

export interface WeatherForecastEntry extends WeatherScheduleEntry {}

export type ForecastAction =
  | {
      readonly type: "weather-transition-due";
      readonly entry: WeatherForecastEntry;
    }
  | {
      readonly type: "weather-start-due";
      readonly entry: WeatherForecastEntry;
    };

/** 查询并消费确定性的 Scenario 天气计划，不直接修改天气状态。 */
export class ForecastSystem {
  readonly #schedule: WeatherSchedule;
  readonly #consumedActionIds = new Set<string>();

  constructor(schedule: WeatherSchedule) {
    this.#schedule = schedule;
  }

  getNextForecast(time: GameTimeSnapshot): WeatherForecastEntry | undefined {
    return this.#schedule.entries.find(
      (entry) => toTotalGameMinutes(entry.startsAt) >= time.totalGameMinutes,
    );
  }

  update(
    previous: GameTimeSnapshot,
    current: GameTimeSnapshot,
  ): readonly ForecastAction[] {
    if (current.totalGameMinutes < previous.totalGameMinutes) {
      throw new Error("ForecastSystem 不支持游戏时间倒退。");
    }

    const actions: ForecastAction[] = [];
    for (const entry of this.#schedule.entries) {
      this.#appendDueAction(
        actions,
        "weather-transition-due",
        `${entry.id}:transition`,
        toTotalGameMinutes(entry.transitionStartsAt),
        entry,
        previous.totalGameMinutes,
        current.totalGameMinutes,
      );
      this.#appendDueAction(
        actions,
        "weather-start-due",
        `${entry.id}:start`,
        toTotalGameMinutes(entry.startsAt),
        entry,
        previous.totalGameMinutes,
        current.totalGameMinutes,
      );
    }

    return Object.freeze(
      actions.sort((a, b) => getActionTime(a) - getActionTime(b)),
    );
  }

  #appendDueAction(
    actions: ForecastAction[],
    type: ForecastAction["type"],
    actionId: string,
    scheduledTotalMinutes: number,
    entry: WeatherForecastEntry,
    previousTotalMinutes: number,
    currentTotalMinutes: number,
  ): void {
    const isDue =
      scheduledTotalMinutes >= previousTotalMinutes &&
      scheduledTotalMinutes <= currentTotalMinutes;
    if (!isDue || this.#consumedActionIds.has(actionId)) {
      return;
    }
    this.#consumedActionIds.add(actionId);
    actions.push({ type, entry });
  }
}

function getActionTime(action: ForecastAction): number {
  return toTotalGameMinutes(
    action.type === "weather-transition-due"
      ? action.entry.transitionStartsAt
      : action.entry.startsAt,
  );
}
