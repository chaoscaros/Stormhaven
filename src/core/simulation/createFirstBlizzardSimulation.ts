import weatherDefinitionsData from "../../../data/weather/weather.json";
import firstBlizzardScheduleData from "../../../data/weather/first-blizzard-schedule.json";
import { PLAYER_CONFIG, SIMULATION_CONFIG } from "../config";
import { GameSimulation } from "./GameSimulation";
import { WeatherCatalog } from "../../weather/WeatherCatalog";
import { parseWeatherSchedule } from "../../weather/WeatherSchedule";
import thermalConfigData from "../../../data/survival/thermal.json";
import { parseThermalConfig } from "../../survival/thermal/ThermalConfig";
import { createFirstBlizzardSurvivalEnvironment } from "./createFirstBlizzardSurvivalEnvironment";

/** 从 JSON 配置创建确定性的「第一场暴雪」模拟。 */
export function createFirstBlizzardSimulation(): GameSimulation {
  const catalog = WeatherCatalog.fromUnknown(weatherDefinitionsData);
  const schedule = parseWeatherSchedule(firstBlizzardScheduleData);
  const thermalConfig = parseThermalConfig(thermalConfigData);
  const environment = createFirstBlizzardSurvivalEnvironment();
  return new GameSimulation(
    {
      initialTime: {
        day: SIMULATION_CONFIG.initialDay,
        hour: SIMULATION_CONFIG.initialHour,
        minute: SIMULATION_CONFIG.initialMinute,
      },
      timeScale: SIMULATION_CONFIG.timeScale,
      maxDeltaSeconds: SIMULATION_CONFIG.maxDeltaSeconds,
    },
    catalog,
    schedule,
    thermalConfig,
    {
      shelterSystem: environment.shelterSystem,
      heatSourceSystem: environment.heatSourceSystem,
      initialPlayerPosition: PLAYER_CONFIG.spawnPosition,
    },
  );
}
