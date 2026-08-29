import "./styles.css";
import { Game } from "./core/Game";
import { createFirstBlizzardSimulation } from "./core/simulation/createFirstBlizzardSimulation";
import { setupFoundationUi } from "./ui/setupFoundationUi";

const canvas = document.getElementById("game-canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Stormhaven 需要一个 id 为 'game-canvas' 的画布元素。");
}

const ui = setupFoundationUi(canvas);
const simulation = createFirstBlizzardSimulation();
ui.updateDebugHud(simulation.snapshot);
const game = new Game(canvas, simulation, ui.updateDebugHud);

try {
  await game.start();
  ui.showReady();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "未知的初始化错误。";
  ui.showError(message);
}

window.addEventListener("beforeunload", () => game.dispose(), { once: true });
