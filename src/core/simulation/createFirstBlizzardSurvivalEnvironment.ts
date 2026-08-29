import shelterProfilesData from "../../../data/survival/shelters.json";
import heatSourceConfigData from "../../../data/survival/heat-sources.json";
import environmentScenarioData from "../../../data/world/first-blizzard-environment.json";
import { HeatSourceSystem } from "../../survival/heat/HeatSourceSystem";
import { ShelterSystem } from "../../survival/shelter/ShelterSystem";
import { parseSurvivalEnvironmentScenario } from "../../survival/environment/SurvivalEnvironmentScenario";

/** 从数据配置装配第一场暴雪的 Shelter 与 Heat Source 领域服务。 */
export function createFirstBlizzardSurvivalEnvironment() {
  const scenario = parseSurvivalEnvironmentScenario(environmentScenarioData);
  const shelterProfiles = ShelterSystem.parseProfiles(shelterProfilesData);
  const heatSourceConfig = HeatSourceSystem.parseConfig(heatSourceConfigData);
  return Object.freeze({
    scenario,
    shelterSystem: new ShelterSystem(shelterProfiles, scenario.shelters),
    heatSourceSystem: new HeatSourceSystem(heatSourceConfig, scenario.heatSources),
  });
}
