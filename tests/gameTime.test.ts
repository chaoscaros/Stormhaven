import { describe, expect, it } from "vitest";
import { GameClock } from "../src/core/time/GameClock";
import { formatGameTime } from "../src/core/time/formatGameTime";

describe("GameClock", () => {
  it("将 Day 1 14:00 正确推进到 15:00", () => {
    const clock = createClock({ day: 1, hour: 14, minute: 0 }, 60);

    clock.update(60);

    expect(clock.snapshot).toMatchObject({ day: 1, hour: 15, minute: 0 });
    expect(formatGameTime(clock.snapshot)).toBe("15:00");
  });

  it("将 23:59 正确推进到下一天", () => {
    const clock = createClock({ day: 1, hour: 23, minute: 59 }, 60);

    clock.update(1);

    expect(clock.snapshot).toMatchObject({ day: 2, hour: 0, minute: 0 });
  });

  it("暂停后不推进时间", () => {
    const clock = createClock({ day: 1, hour: 14, minute: 0 }, 60);
    clock.setPaused(true);

    const result = clock.update(600);

    expect(result.advancedGameMinutes).toBe(0);
    expect(clock.snapshot).toMatchObject({ day: 1, hour: 14, minute: 0 });
  });

  it("timeScale 正确影响时间推进", () => {
    const clock = createClock({ day: 1, hour: 14, minute: 0 }, 120);

    clock.update(30);

    expect(clock.snapshot).toMatchObject({ day: 1, hour: 15, minute: 0 });
  });
});

function createClock(
  initialTime: { day: number; hour: number; minute: number },
  timeScale: number,
): GameClock {
  return new GameClock({ initialTime, timeScale });
}
