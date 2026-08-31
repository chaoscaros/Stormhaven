import itemDefinitionsData from "../../../data/items/items.json";
import pickupPlacementsData from "../../../data/world/first-blizzard-pickups.json";
import recipeDefinitionsData from "../../../data/crafting/recipes.json";
import { CraftingService } from "../../crafting/CraftingService";
import { RecipeCatalog } from "../../crafting/RecipeCatalog";
import { InteractionService } from "../../interaction/InteractionService";
import { Inventory } from "../../inventory/Inventory";
import { PLAYER_INVENTORY_CONFIG } from "../../inventory/InventoryConfig";
import { ItemCatalog } from "../../items/ItemCatalog";
import { parseWorldPickupPlacements } from "../../world/pickups/WorldPickupPlacement";
import { WorldPickupRegistry } from "../../world/pickups/WorldPickupRegistry";
import buildingDefinitionsData from "../../../data/building/buildings.json";
import { BuildCatalog } from "../../building/BuildCatalog";
import { WorldBuildingRegistry } from "../../building/WorldBuildingRegistry";
import fuelDefinitionsData from "../../../data/survival/fuels.json";
import campfireConfigData from "../../../data/survival/campfire.json";
import { FuelCatalog } from "../../survival/campfire/FuelCatalog";
import { CampfireSystem } from "../../survival/campfire/CampfireSystem";
import { parseCampfireConfig } from "../../survival/campfire/CampfireConfig";
import type { HeatSourceSystem } from "../../survival/heat/HeatSourceSystem";

export type FirstBlizzardGameplayFoundation = ReturnType<
  typeof createFirstBlizzardGameplayFoundation
>;

/** 从 Item 与 Scenario JSON 装配本地、非持久化的拾取玩法基础。 */
export function createFirstBlizzardGameplayFoundation(heatSourceSystem: HeatSourceSystem) {
  const itemCatalog = ItemCatalog.fromUnknown(itemDefinitionsData);
  const pickupPlacements = parseWorldPickupPlacements(pickupPlacementsData, itemCatalog);
  const inventory = new Inventory(itemCatalog, PLAYER_INVENTORY_CONFIG);
  const recipeCatalog = RecipeCatalog.fromUnknown(recipeDefinitionsData, itemCatalog);
  const buildCatalog = BuildCatalog.fromUnknown(buildingDefinitionsData, itemCatalog);
  const fuelCatalog = FuelCatalog.fromUnknown(fuelDefinitionsData, itemCatalog);
  const campfireSystem = new CampfireSystem(
    parseCampfireConfig(campfireConfigData),
    fuelCatalog,
    inventory,
    heatSourceSystem,
  );
  const pickupRegistry = new WorldPickupRegistry(
    pickupPlacements.map((placement) => placement.pickup),
  );
  return Object.freeze({
    itemCatalog,
    pickupPlacements,
    inventory,
    recipeCatalog,
    buildCatalog,
    fuelCatalog,
    campfireSystem,
    worldBuildingRegistry: new WorldBuildingRegistry(),
    pickupRegistry,
    interactionService: new InteractionService(
      itemCatalog,
      inventory,
      pickupRegistry,
      Object.freeze([campfireSystem]),
    ),
    craftingService: new CraftingService(recipeCatalog, itemCatalog, inventory),
  });
}
