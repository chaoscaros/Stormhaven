import { describe, expect, it } from "vitest";
import { ThermalEnvironmentBuilder } from "../src/survival/thermal/ThermalEnvironment";
import { createThermalInputs } from "../src/survival/thermal/createThermalInputs";

const weather = {
  currentWeatherId: "blizzard" as const,
  transitionProgress: 1,
  ambientTemperatureCelsius: -30,
  temperatureModifierCelsius: -12,
  windStrength: 28,
  visibilityMeters: 40,
  precipitation: 1,
  wetnessRate: 0.22,
  movementModifier: 0.55,
  solarEfficiency: 0.02,
};
const noHeat = { temperatureBonusCelsius: 0, contributingSourceIds: [] };

describe("ThermalEnvironmentBuilder", () => {
  it("0% 挡风不改变风力，100% 挡风将有效风力降为零", () => {
    const builder = new ThermalEnvironmentBuilder();
    const outdoor = builder.build(weather, shelter(0, 0), noHeat);
    const sealed = builder.build(weather, shelter(1, 0), noHeat);

    expect(outdoor.effectiveWindStrength).toBe(28);
    expect(sealed.effectiveWindStrength).toBe(0);
  });

  it("庇护和外部热源加成进入 Thermal 输入", () => {
    const environment = new ThermalEnvironmentBuilder().build(
      weather,
      shelter(0.9, 3),
      { temperatureBonusCelsius: 8, contributingSourceIds: ["heater"] },
    );
    const inputs = createThermalInputs(weather, environment, 0.5);

    expect(inputs.windStrength).toBeCloseTo(2.8);
    expect(inputs.shelterTemperatureBonusCelsius).toBe(3);
    expect(inputs.externalHeatBonusCelsius).toBe(8);
    expect(inputs.deltaSeconds).toBe(0.5);
  });
});

function shelter(windProtection: number, temperatureBonusCelsius: number) {
  return { isSheltered: windProtection > 0, windProtection, temperatureBonusCelsius };
}
