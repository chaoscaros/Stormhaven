import "./styles.css";
import { Game } from "./core/Game";
import { createFirstBlizzardSimulation } from "./core/simulation/createFirstBlizzardSimulation";
import { setupFoundationUi } from "./ui/setupFoundationUi";
import { createFirstBlizzardGameplayFoundation } from "./core/gameplay/createFirstBlizzardGameplayFoundation";
import { setupCraftingDebugUi } from "./ui/setupCraftingDebugUi";
import { setupBuildingDebugUi } from "./ui/setupBuildingDebugUi";
import { createFirstBlizzardSurvivalEnvironment } from "./core/simulation/createFirstBlizzardSurvivalEnvironment";
import { setupCampfireUi } from "./ui/setupCampfireUi";
import { setupHotbarUi } from "./ui/hotbar/setupHotbarUi";

const canvas = document.getElementById("game-canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Stormhaven 需要一个 id 为 'game-canvas' 的画布元素。");
}

const survivalEnvironment = createFirstBlizzardSurvivalEnvironment();
const gameplay = createFirstBlizzardGameplayFoundation(survivalEnvironment.heatSourceSystem);
const simulation = createFirstBlizzardSimulation(
  survivalEnvironment,
  Object.freeze([gameplay.campfireSystem]),
);
const ui = setupFoundationUi(canvas, {
  onSimulationPausedChanged(paused): void {
    simulation.setPaused(paused);
  },
});
ui.showLoading("正在初始化游戏世界……");
ui.updateDebugHud(simulation.snapshot);
ui.updateInventory(gameplay.inventory.snapshot, gameplay.itemCatalog);
const craftingUi = setupCraftingDebugUi(
  gameplay.craftingService,
  gameplay.recipeCatalog,
  gameplay.itemCatalog,
  ui.modes,
  {
    onInventoryChanged(): void {
      ui.updateInventory(gameplay.inventory.snapshot, gameplay.itemCatalog);
    },
  },
);
const campfireUi = setupCampfireUi(
  gameplay.campfireSystem,
  gameplay.fuelCatalog,
  gameplay.inventory,
  gameplay.itemCatalog,
  ui.modes,
  {
    onInventoryChanged(): void {
      ui.updateInventory(gameplay.inventory.snapshot, gameplay.itemCatalog);
      craftingUi.refresh();
    },
  },
);
let game: Game | undefined;
const buildingUi = setupBuildingDebugUi(
  gameplay.buildCatalog,
  gameplay.inventory,
  gameplay.itemCatalog,
  ui.modes,
  {
    onSelect(definitionId): void {
      game?.beginBuildingPlacement(definitionId);
    },
  },
);
game = new Game(
  canvas,
  simulation,
  gameplay,
  {
    isInteractionBlocked: ui.modes.isWorldInteractionBlocked.bind(ui.modes),
    onTargetChanged: ui.updateInteractionPrompt,
    onInteraction(result, inventory): void {
      ui.updateInventory(inventory, gameplay.itemCatalog);
      ui.showInteractionResult(result, gameplay.itemCatalog);
      craftingUi.refresh();
      buildingUi.refresh();
      campfireUi.refresh();
    },
    onUseTarget(target): void {
      if (target.interactionType === "campfire") campfireUi.open(target.campfireId);
    },
  },
  ui.modes,
  {
    onStatus: buildingUi.showPlacementStatus,
    onExit: buildingUi.hidePlacementStatus,
    onInventoryChanged(): void {
      ui.updateInventory(gameplay.inventory.snapshot, gameplay.itemCatalog);
      buildingUi.refresh();
      craftingUi.refresh();
      campfireUi.refresh();
    },
  },
  ui.updateDebugHud,
);
const hotbarUi = setupHotbarUi(
  canvas,
  gameplay.inventory,
  gameplay.itemCatalog,
  gameplay.buildCatalog,
  ui.modes,
  {
    onBuildSelected(definitionId): void {
      game?.beginBuildingPlacement(definitionId);
    },
    onNonBuildSelected(): void {
      game?.cancelBuildingPlacement();
    },
  },
);

try {
  ui.setLoadingStage("正在创建世界与天气系统……");
  await game.start();
  ui.showReady();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "未知的初始化错误。";
  ui.showError(message);
}

let disposed = false;
const disposeApplication = (): void => {
  if (disposed) return;
  disposed = true;
  window.removeEventListener("beforeunload", disposeApplication);
  game?.dispose();
  hotbarUi.dispose();
  campfireUi.dispose();
  buildingUi.dispose();
  craftingUi.dispose();
  ui.dispose();
};

window.addEventListener("beforeunload", disposeApplication, { once: true });
if (import.meta.hot) import.meta.hot.dispose(disposeApplication);
