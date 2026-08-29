import "./styles.css";
import { Game } from "./core/Game";
import { createFirstBlizzardSimulation } from "./core/simulation/createFirstBlizzardSimulation";
import { setupFoundationUi } from "./ui/setupFoundationUi";
import { createFirstBlizzardGameplayFoundation } from "./core/gameplay/createFirstBlizzardGameplayFoundation";

const canvas = document.getElementById("game-canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Stormhaven 需要一个 id 为 'game-canvas' 的画布元素。");
}

const ui = setupFoundationUi(canvas);
const simulation = createFirstBlizzardSimulation();
const gameplay = createFirstBlizzardGameplayFoundation();
ui.updateDebugHud(simulation.snapshot);
ui.updateInventory(gameplay.inventory.snapshot, gameplay.itemCatalog);
const game = new Game(
  canvas,
  simulation,
  gameplay,
  {
    onTargetChanged: ui.updateInteractionPrompt,
    onInteraction(result, inventory): void {
      ui.updateInventory(inventory, gameplay.itemCatalog);
      ui.showInteractionResult(result, gameplay.itemCatalog);
    },
  },
  ui.updateDebugHud,
);

try {
  await game.start();
  ui.showReady();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "未知的初始化错误。";
  ui.showError(message);
}

window.addEventListener("beforeunload", () => {
  game.dispose();
  ui.dispose();
}, { once: true });
