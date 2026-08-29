import { Engine } from "@babylonjs/core/Engines/engine";
import type { Scene } from "@babylonjs/core/scene";
import { createFirstPersonCamera } from "../player/createFirstPersonCamera";
import { createWorldScene } from "../world/createWorldScene";
import type {
  GameSimulation,
  GameSimulationSnapshot,
} from "./simulation/GameSimulation";
import { createWeatherPresentation } from "../weather/presentation/createWeatherPresentation";
import type {
  WeatherPresentationController,
  WeatherPresentationSnapshot,
} from "../weather/presentation/WeatherPresentationController";

/** 管理 Babylon 运行时生命周期，并将功能初始化委托给各自模块。 */
export class Game {
  readonly #engine: Engine;
  #scene: Scene | undefined;
  #weatherPresentation: WeatherPresentationController | undefined;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly simulation: GameSimulation,
    private readonly onSimulationUpdate: (
      snapshot: GameSimulationSnapshot,
      presentation: WeatherPresentationSnapshot,
    ) => void,
  ) {
    this.#engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      preserveDrawingBuffer: false,
      stencil: true,
    });
  }

  async start(): Promise<void> {
    const world = await createWorldScene(this.#engine);
    this.#scene = world.scene;
    const camera = createFirstPersonCamera(world.scene, this.canvas);
    this.#weatherPresentation = createWeatherPresentation(
      world.scene,
      camera,
      world.weatherEnvironment,
    );

    const initialPresentation = this.#weatherPresentation.update(this.simulation.snapshot);
    this.onSimulationUpdate(this.simulation.snapshot, initialPresentation);

    this.#engine.runRenderLoop(() => {
      const deltaSeconds = this.#engine.getDeltaTime() / 1_000;
      const position = camera.globalPosition;
      const simulationUpdate = this.simulation.update(deltaSeconds, {
        x: position.x,
        y: position.y,
        z: position.z,
      });
      const presentation = this.#weatherPresentation?.update(simulationUpdate.snapshot);
      if (presentation) {
        this.onSimulationUpdate(simulationUpdate.snapshot, presentation);
      }
      this.#scene?.render();
    });

    window.addEventListener("resize", this.#handleResize);
  }

  dispose(): void {
    window.removeEventListener("resize", this.#handleResize);
    this.#weatherPresentation?.dispose();
    this.#weatherPresentation = undefined;
    this.#scene?.dispose();
    this.#engine.dispose();
  }

  readonly #handleResize = (): void => {
    this.#engine.resize();
  };
}
