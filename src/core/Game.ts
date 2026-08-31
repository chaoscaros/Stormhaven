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
import type { FirstBlizzardGameplayFoundation } from "./gameplay/createFirstBlizzardGameplayFoundation";
import { WorldPickupPresentation } from "../world/pickups/WorldPickupPresentation";
import {
  InteractionRaycastController,
  type InteractionCallbacks,
} from "../interaction/InteractionRaycastController";
import type { GameUiModeController } from "../ui/GameUiModeController";
import { PlacementValidator } from "../building/PlacementValidator";
import { BuildService } from "../building/BuildService";
import {
  BuildingPresentation,
  collectStaticBuildingBounds,
} from "../building/presentation/BuildingPresentation";
import { BuildingPlacementController } from "../building/presentation/BuildingPlacementController";
import { CampfireBuildingBinding } from "../survival/campfire/CampfireBuildingBinding";

/** 管理 Babylon 运行时生命周期，并将功能初始化委托给各自模块。 */
export class Game {
  readonly #engine: Engine;
  #scene: Scene | undefined;
  #weatherPresentation: WeatherPresentationController | undefined;
  #worldPickups: WorldPickupPresentation | undefined;
  #interaction: InteractionRaycastController | undefined;
  #buildingPresentation: BuildingPresentation | undefined;
  #buildingPlacement: BuildingPlacementController | undefined;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly simulation: GameSimulation,
    private readonly gameplay: FirstBlizzardGameplayFoundation,
    private readonly interactionCallbacks: InteractionCallbacks,
    private readonly uiModes: GameUiModeController,
    private readonly buildingCallbacks: {
      readonly onStatus: (message: string, valid: boolean) => void;
      readonly onExit: () => void;
      readonly onInventoryChanged: () => void;
    },
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
    this.#worldPickups = new WorldPickupPresentation(
      world.scene,
      this.gameplay.pickupPlacements,
      this.gameplay.itemCatalog,
    );
    this.#weatherPresentation = createWeatherPresentation(
      world.scene,
      camera,
      world.weatherEnvironment,
      world.precipitationObstacles,
    );
    const placementValidator = new PlacementValidator(
      this.gameplay.worldBuildingRegistry,
      collectStaticBuildingBounds(world.scene),
    );
    const buildService = new BuildService(
      this.gameplay.buildCatalog,
      this.gameplay.inventory,
      this.gameplay.worldBuildingRegistry,
      placementValidator,
    );
    this.#buildingPresentation = new BuildingPresentation(
      world.scene,
      this.gameplay.buildCatalog,
      world.precipitationObstacles,
      new CampfireBuildingBinding(this.gameplay.campfireSystem),
    );
    this.#interaction = new InteractionRaycastController(
      world.scene,
      camera,
      this.canvas,
      this.gameplay.interactionService,
      () => this.gameplay.inventory.snapshot,
      Object.freeze([this.#worldPickups, this.#buildingPresentation]),
      this.interactionCallbacks,
    );
    this.#buildingPlacement = new BuildingPlacementController(
      world.scene,
      camera,
      this.canvas,
      this.gameplay.buildCatalog,
      this.gameplay.worldBuildingRegistry,
      placementValidator,
      buildService,
      this.#buildingPresentation,
      this.uiModes,
      this.buildingCallbacks,
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
      this.#interaction?.update();
      this.#buildingPlacement?.update();
      this.#buildingPresentation?.update();
      this.#scene?.render();
    });

    window.addEventListener("resize", this.#handleResize);
  }

  dispose(): void {
    window.removeEventListener("resize", this.#handleResize);
    this.#buildingPlacement?.dispose();
    this.#buildingPlacement = undefined;
    this.#buildingPresentation?.dispose();
    this.#buildingPresentation = undefined;
    this.#weatherPresentation?.dispose();
    this.#weatherPresentation = undefined;
    this.#interaction?.dispose();
    this.#interaction = undefined;
    this.#worldPickups?.dispose();
    this.#worldPickups = undefined;
    this.gameplay.campfireSystem.dispose();
    this.#scene?.dispose();
    this.#engine.dispose();
  }

  beginBuildingPlacement(definitionId: string): void {
    this.#buildingPlacement?.begin(definitionId);
  }

  readonly #handleResize = (): void => {
    this.#engine.resize();
  };
}
