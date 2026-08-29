import {
  toTotalGameMinutes,
  type GameTimeInput,
} from "../core/time/GameTime";
import { isWeatherId, type WeatherId } from "./WeatherDefinition";

export interface WeatherScheduleEntry {
  readonly id: string;
  readonly weatherId: WeatherId;
  readonly transitionStartsAt: GameTimeInput;
  readonly startsAt: GameTimeInput;
  readonly transitionDurationGameMinutes: number;
}

export interface WeatherSchedule {
  readonly scenarioId: string;
  readonly initialWeatherId: WeatherId;
  readonly entries: readonly WeatherScheduleEntry[];
}

/** 对 Scenario 天气计划执行轻量运行时验证。 */
export function parseWeatherSchedule(value: unknown): WeatherSchedule {
  const record = asRecord(value, "天气计划");
  const scenarioId = readNonEmptyString(record, "scenarioId", "天气计划");
  const initialWeatherId = readWeatherId(record.initialWeatherId, "initialWeatherId");
  if (!Array.isArray(record.entries)) {
    throw new Error("天气计划.entries 必须是数组。");
  }

  const entryIds = new Set<string>();
  const entries = record.entries.map((entry, index) => {
    const parsed = parseScheduleEntry(entry, index);
    if (entryIds.has(parsed.id)) {
      throw new Error(`天气计划 Entry ID 重复：${parsed.id}`);
    }
    entryIds.add(parsed.id);
    return parsed;
  });

  entries.sort(
    (a, b) => toTotalGameMinutes(a.transitionStartsAt) - toTotalGameMinutes(b.transitionStartsAt),
  );

  return Object.freeze({
    scenarioId,
    initialWeatherId,
    entries: Object.freeze(entries),
  });
}

function parseScheduleEntry(value: unknown, index: number): WeatherScheduleEntry {
  const label = `天气计划.entries[${index}]`;
  const record = asRecord(value, label);
  const transitionStartsAt = readGameTime(record.transitionStartsAt, `${label}.transitionStartsAt`);
  const startsAt = readGameTime(record.startsAt, `${label}.startsAt`);
  const transitionDurationGameMinutes = readNonNegativeNumber(
    record,
    "transitionDurationGameMinutes",
    label,
  );
  const actualDuration = toTotalGameMinutes(startsAt) - toTotalGameMinutes(transitionStartsAt);
  if (actualDuration < 0) {
    throw new Error(`${label}.startsAt 不能早于 transitionStartsAt。`);
  }
  if (actualDuration !== transitionDurationGameMinutes) {
    throw new Error(`${label} 的过渡时长与两个时间点之间的间隔不一致。`);
  }

  return Object.freeze({
    id: readNonEmptyString(record, "id", label),
    weatherId: readWeatherId(record.weatherId, `${label}.weatherId`),
    transitionStartsAt,
    startsAt,
    transitionDurationGameMinutes,
  });
}

function readGameTime(value: unknown, label: string): GameTimeInput {
  const record = asRecord(value, label);
  const time = Object.freeze({
    day: readInteger(record, "day", label),
    hour: readInteger(record, "hour", label),
    minute: readInteger(record, "minute", label),
  });
  toTotalGameMinutes(time);
  return time;
}

function readWeatherId(value: unknown, label: string): WeatherId {
  if (!isWeatherId(value)) {
    throw new Error(`${label} 不是受支持的稳定天气 ID。`);
  }
  return value;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

function readNonEmptyString(
  record: Record<string, unknown>,
  key: string,
  label: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label}.${key} 必须是非空字符串。`);
  }
  return value;
}

function readInteger(
  record: Record<string, unknown>,
  key: string,
  label: string,
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${label}.${key} 必须是整数。`);
  }
  return value;
}

function readNonNegativeNumber(
  record: Record<string, unknown>,
  key: string,
  label: string,
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label}.${key} 必须是大于或等于 0 的有限数值。`);
  }
  return value;
}
