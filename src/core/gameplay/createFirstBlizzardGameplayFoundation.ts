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

export type FirstBlizzardGameplayFoundation = ReturnType<
  typeof createFirstBlizzardGameplayFoundation
>;

/** 从 Item 与 Scenario JSON 装配本地、非持久化的拾取玩法基础。 */
export function createFirstBlizzardGameplayFoundation() {
  const itemCatalog = ItemCatalog.fromUnknown(itemDefinitionsData);
  const pickupPlacements = parseWorldPickupPlacements(pickupPlacementsData, itemCatalog);
  const inventory = new Inventory(itemCatalog, PLAYER_INVENTORY_CONFIG);
  const recipeCatalog = RecipeCatalog.fromUnknown(recipeDefinitionsData, itemCatalog);
  const pickupRegistry = new WorldPickupRegistry(
    pickupPlacements.map((placement) => placement.pickup),
  );
  return Object.freeze({
    itemCatalog,
    pickupPlacements,
    inventory,
    recipeCatalog,
    pickupRegistry,
    interactionService: new InteractionService(itemCatalog, inventory, pickupRegistry),
    craftingService: new CraftingService(recipeCatalog, itemCatalog, inventory),
  });
}
