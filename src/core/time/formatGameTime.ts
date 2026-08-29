import type { GameTimeInput } from "./GameTime";

/** 以不依赖地区语言的 HH:mm 格式显示游戏时间。 */
export function formatGameTime(time: GameTimeInput): string {
  return `${padTimeUnit(time.hour)}:${padTimeUnit(time.minute)}`;
}

function padTimeUnit(value: number): string {
  return value.toString().padStart(2, "0");
}
