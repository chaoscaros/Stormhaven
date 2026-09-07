import { createFirstBlizzardGameplayFoundation } from "../../src/core/gameplay/createFirstBlizzardGameplayFoundation";
import { createFirstBlizzardSimulation } from "../../src/core/simulation/createFirstBlizzardSimulation";
import { createFirstBlizzardSurvivalEnvironment } from "../../src/core/simulation/createFirstBlizzardSurvivalEnvironment";
import { HotbarModel } from "../../src/ui/hotbar/HotbarModel";
import { BuildService } from "../../src/building/BuildService";
import { PlacementValidator } from "../../src/building/PlacementValidator";
import { CampfireBuildingBinding } from "../../src/survival/campfire/CampfireBuildingBinding";
import type { PlayerTransform } from "../../src/player/PlayerTransform";
import type { SaveRuntime } from "../../src/save/SaveRuntime";
import type { SaveRepository } from "../../src/save/SaveRepository";
import type { SaveGameV1 } from "../../src/save/schema/SaveGameV1";

export class InMemorySaveRepository implements SaveRepository {
  data: unknown;
  failWrites = false;
  failReads = false;
  async save(_id: string, data: SaveGameV1): Promise<void> {
    if (this.failWrites) throw new Error("Quota exceeded");
    this.data = structuredClone(data);
  }
  async load(): Promise<unknown> {
    if (this.failReads) throw new Error("Storage denied");
    return structuredClone(this.data);
  }
  async exists(): Promise<boolean> {
    if (this.failReads) throw new Error("Storage denied");
    return this.data !== undefined;
  }
  async delete(): Promise<void> { this.data = undefined; }
}

export function createSaveFixture() {
  const environment = createFirstBlizzardSurvivalEnvironment();
  const gameplay = createFirstBlizzardGameplayFoundation(environment.heatSourceSystem);
  const simulation = createFirstBlizzardSimulation(environment, [gameplay.campfireSystem]);
  const hotbar = new HotbarModel();
  let transform: PlayerTransform = { position: { x: 0, y: 1.8, z: -8 }, rotation: { yaw: 0, pitch: 0 } };
  let velocity = 4;
  const player = {
    captureTransform: () => structuredClone(transform),
    restoreTransform: (next: PlayerTransform) => { transform = { position: { ...next.position }, rotation: { ...next.rotation } }; velocity = 0; },
  };
  const presentation: SaveRuntime["presentation"] = {
    clearBuildings: () => undefined,
    restoreBuildings: () => undefined,
    restorePickups: () => undefined,
    refresh: () => undefined,
  };
  const runtime: SaveRuntime = { gameplay, simulation, hotbar, player, presentation };
  const builds = new BuildService(gameplay.buildCatalog, gameplay.inventory, gameplay.worldBuildingRegistry, new PlacementValidator(gameplay.worldBuildingRegistry));
  const binding = new CampfireBuildingBinding(gameplay.campfireSystem);
  const buildPresentation = {
    prepare(entity: Parameters<CampfireBuildingBinding["prepare"]>[0]) {
      const prepared = binding.prepare(entity, gameplay.buildCatalog.get(entity.definitionId));
      return { activate: prepared.activate, dispose: prepared.dispose };
    },
  };
  return { ...runtime, runtime, environment, builds, buildPresentation, velocity: () => velocity };
}

export function populateSaveFixture(fixture: ReturnType<typeof createSaveFixture>): void {
  const { gameplay, builds, buildPresentation, player, hotbar, simulation } = fixture;
  gameplay.interactionService.interact("pickup_wood_001");
  gameplay.interactionService.interact("pickup_wood_002");
  gameplay.interactionService.interact("pickup_stick_001");
  gameplay.interactionService.interact("pickup_stone_001");
  const recipe = gameplay.recipeCatalog.getAll()[0];
  if (!recipe || !gameplay.craftingService.craft(recipe.id).success) throw new Error("Fixture craft failed");
  const foundation = builds.place({
    definitionId: "foundation_wood", playerPosition: { x: 0, y: 1.8, z: -2 },
    placement: { position: { x: 0, y: 0, z: 1 }, rotationDegrees: 90, surface: "ground" },
  }, buildPresentation);
  if (!foundation.success) throw new Error("Fixture foundation failed");
  const snap = gameplay.worldBuildingRegistry.getSnapPoint("building_000001:north");
  const wall = builds.place({ definitionId: "wall_wood", playerPosition: { x: 0, y: 1.8, z: -2 },
    placement: { position: snap.position, rotationDegrees: 0, surface: "building", snapPointId: snap.id },
  }, buildPresentation);
  const campfire = builds.place({ definitionId: "campfire_basic", playerPosition: { x: 4, y: 1.8, z: 1 },
    placement: { position: { x: 6, y: 0, z: 1 }, rotationDegrees: 90, surface: "ground" },
  }, buildPresentation);
  if (!wall.success || !campfire.success) throw new Error("Fixture build failed");
  const fire = gameplay.campfireSystem.getAll()[0];
  if (!fire) throw new Error("Fixture fire missing");
  gameplay.campfireSystem.addFuel(fire.id, "wood", 3);
  gameplay.campfireSystem.ignite(fire.id);
  gameplay.inventory.moveStack(0, 20);
  hotbar.clear(0);
  hotbar.assign(5, { type: "item", id: "stone_axe" });
  hotbar.swap(1, 7);
  hotbar.select(5);
  player.restoreTransform({ position: { x: 6, y: 1.8, z: 2 }, rotation: { yaw: 1.25, pitch: -0.3 } });
  for (let frame = 0; frame < 225; frame++) simulation.update(0.25, player.captureTransform().position);
  simulation.setPaused(true);
  simulation.restorePersistentState({ ...simulation.capturePersistentState(), thermalReserve: 62.5 }, player.captureTransform().position);
}
