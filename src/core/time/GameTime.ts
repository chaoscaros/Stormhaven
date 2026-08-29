export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;

export interface GameTimeInput {
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

export interface GameTimeSnapshot extends GameTimeInput {
  readonly totalGameMinutes: number;
}

/** 将游戏日期转换为从 Day 1 00:00 开始计算的分钟数。 */
export function toTotalGameMinutes(time: GameTimeInput): number {
  assertGameTimeInput(time);
  return (
    (time.day - 1) * MINUTES_PER_DAY +
    time.hour * MINUTES_PER_HOUR +
    time.minute
  );
}

/** 从总游戏分钟数创建不可变时间快照。 */
export function createGameTimeSnapshot(totalGameMinutes: number): GameTimeSnapshot {
  if (!Number.isFinite(totalGameMinutes) || totalGameMinutes < 0) {
    throw new Error("totalGameMinutes 必须是大于或等于 0 的有限数值。");
  }

  const wholeMinutes = Math.floor(totalGameMinutes);
  const day = Math.floor(wholeMinutes / MINUTES_PER_DAY) + 1;
  const minuteOfDay = wholeMinutes % MINUTES_PER_DAY;
  const hour = Math.floor(minuteOfDay / MINUTES_PER_HOUR);
  const minute = minuteOfDay % MINUTES_PER_HOUR;

  return Object.freeze({ day, hour, minute, totalGameMinutes });
}

export function compareGameTime(a: GameTimeInput, b: GameTimeInput): number {
  return toTotalGameMinutes(a) - toTotalGameMinutes(b);
}

function assertGameTimeInput(time: GameTimeInput): void {
  if (!Number.isInteger(time.day) || time.day < 1) {
    throw new Error("游戏天数必须是大于或等于 1 的整数。");
  }
  if (!Number.isInteger(time.hour) || time.hour < 0 || time.hour >= HOURS_PER_DAY) {
    throw new Error("游戏小时必须是 0 到 23 之间的整数。");
  }
  if (!Number.isInteger(time.minute) || time.minute < 0 || time.minute >= MINUTES_PER_HOUR) {
    throw new Error("游戏分钟必须是 0 到 59 之间的整数。");
  }
}
