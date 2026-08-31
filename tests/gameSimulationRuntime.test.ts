import { describe, expect, it } from "vitest";
import { createFirstBlizzardSimulation } from "../src/core/simulation/createFirstBlizzardSimulation";
import { createFirstBlizzardSurvivalEnvironment } from "../src/core/simulation/createFirstBlizzardSurvivalEnvironment";

describe("GameSimulation Runtime System Delta", () => {
  it("Runtime System 使用与 Thermal 相同的 Clamp 后真实秒 Delta", () => {
    const deltas: number[] = [];
    const simulation = createFirstBlizzardSimulation(
      createFirstBlizzardSurvivalEnvironment(),
      [{ update: (deltaSeconds) => deltas.push(deltaSeconds) }],
    );
    simulation.update(1);
    expect(deltas).toEqual([0.25]);
  });

  it("Pause 时 Runtime System 收到 0 秒且不推进生命周期", () => {
    const deltas: number[] = [];
    const simulation = createFirstBlizzardSimulation(
      createFirstBlizzardSurvivalEnvironment(),
      [{ update: (deltaSeconds) => deltas.push(deltaSeconds) }],
    );
    simulation.setPaused(true);
    simulation.update(0.1);
    expect(deltas).toEqual([0]);
  });
});
