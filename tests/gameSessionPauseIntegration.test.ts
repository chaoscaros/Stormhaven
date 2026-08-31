import { describe, expect, it } from "vitest";
import { createFirstBlizzardGameplayFoundation } from "../src/core/gameplay/createFirstBlizzardGameplayFoundation";
import { createFirstBlizzardSimulation } from "../src/core/simulation/createFirstBlizzardSimulation";
import { createFirstBlizzardSurvivalEnvironment } from "../src/core/simulation/createFirstBlizzardSurvivalEnvironment";

describe("Game Session Pause Integration", () => {
  it("Pause 同时冻结 GameTime、Thermal 与 Campfire Fuel，Resume 后继续", () => {
    const environment = createFirstBlizzardSurvivalEnvironment();
    const gameplay = createFirstBlizzardGameplayFoundation(environment.heatSourceSystem);
    const simulation = createFirstBlizzardSimulation(environment, [gameplay.campfireSystem]);
    const position = { x: 0, y: 0.3, z: 10 };
    gameplay.inventory.addItem("wood", 1);
    const campfire = gameplay.campfireSystem.register("pause_test", position);
    expect(gameplay.campfireSystem.addFuel(campfire.id, "wood").success).toBe(true);
    expect(gameplay.campfireSystem.ignite(campfire.id).success).toBe(true);

    for (let index = 0; index < 240; index += 1) simulation.update(0.25, position);
    const beforePause = simulation.snapshot;
    const fuelBeforePause = gameplay.campfireSystem.get(campfire.id).fuelSecondsRemaining;
    simulation.setPaused(true);
    for (let index = 0; index < 40; index += 1) simulation.update(0.25, position);

    expect(simulation.snapshot.time.totalGameMinutes).toBe(beforePause.time.totalGameMinutes);
    expect(simulation.snapshot.thermal.currentValue).toBe(beforePause.thermal.currentValue);
    expect(gameplay.campfireSystem.get(campfire.id).fuelSecondsRemaining).toBe(fuelBeforePause);

    simulation.setPaused(false);
    simulation.update(0.25, position);
    expect(simulation.snapshot.time.totalGameMinutes).toBeGreaterThan(beforePause.time.totalGameMinutes);
    expect(gameplay.campfireSystem.get(campfire.id).fuelSecondsRemaining).toBeLessThan(fuelBeforePause);
    expect(simulation.snapshot.thermal.currentValue).not.toBe(beforePause.thermal.currentValue);
  });
});
