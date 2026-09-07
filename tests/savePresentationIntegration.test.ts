import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { BuildingPresentation } from "../src/building/presentation/BuildingPresentation";
import { WorldPickupPresentation } from "../src/world/pickups/WorldPickupPresentation";
import { CampfireBuildingBinding } from "../src/survival/campfire/CampfireBuildingBinding";
import { PrecipitationObstacleRegistry } from "../src/weather/presentation/PrecipitationObstacleRegistry";
import { SaveService } from "../src/save/SaveService";
import { SaveSnapshotBuilder } from "../src/save/SaveSnapshotBuilder";
import { createSaveFixture, populateSaveFixture, InMemorySaveRepository } from "./helpers/saveFixture";
import { AssetRegistry } from "../src/assets/AssetRegistry";
import { AssetLoader } from "../src/assets/AssetLoader";
import { AssetInstanceFactory } from "../src/assets/AssetInstanceFactory";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { readAsset } from "./helpers/assetFiles.mjs";

describe("Save presentation rebuild (headless, not visual acceptance)", () => {
  it.each(["primitive", "GLB", "failed GLB"])("%s rebuilds collision, snow obstacles, pickup lookup, fire light/heat and interaction without duplicates", async mode => {
    const source = createSaveFixture();
    populateSaveFixture(source);
    const repository = new InMemorySaveRepository();
    repository.data = new SaveSnapshotBuilder(source.runtime).capture(1000);
    const target = createSaveFixture();
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const registry = new AssetRegistry();
    const loader = new AssetLoader(path => mode === "failed GLB"
      ? Promise.reject(new Error("404 fixture"))
      : LoadAssetContainerAsync(readAsset(`public/${path}`),scene,{ pluginExtension: ".glb" }),vi.fn());
    const assets = new AssetInstanceFactory(scene,registry,loader,vi.fn());
    if (mode !== "primitive") await Promise.all(registry.getAll().flatMap(entry => entry.urls.map(url => loader.load(url))));
    const obstacles = new PrecipitationObstacleRegistry();
    obstacles.add("static-roof", { min: { x: 0, y: 4, z: 0 }, max: { x: 8, y: 5, z: 8 } });
    const buildings = new BuildingPresentation(scene, target.gameplay.buildCatalog, obstacles, new CampfireBuildingBinding(target.gameplay.campfireSystem),mode === "primitive" ? undefined : assets);
    const pickups = new WorldPickupPresentation(scene, target.gameplay.pickupPlacements, target.gameplay.itemCatalog,mode === "primitive" ? undefined : assets);
    Object.assign(target.presentation, {
      clearBuildings: () => buildings.clear(),
      restoreBuildings: buildings.restore.bind(buildings),
      restorePickups: () => pickups.restore((id) => (target.gameplay.pickupRegistry.get(id)?.quantity ?? 0) > 0),
      refresh: () => buildings.update(),
    });
    try {
      const service = new SaveService(repository, target.runtime, { canSave: () => false, canLoad: () => true });
      expect(await service.load()).toMatchObject({ reason: "ok" });
      expect(scene.getMeshByName("player-building-building_000002")?.checkCollisions).toBe(true);
      expect(scene.getMeshByName("player-building-building_000002")?.visibility).toBe(mode === "GLB" ? 0 : 1);
      expect(scene.getTransformNodeByName("asset:building_000002") !== null).toBe(mode === "GLB");
      expect(obstacles.has("static-roof")).toBe(true);
      expect(obstacles.has("building:building_000002")).toBe(true);
      expect(scene.getMeshByName("world-pickup-pickup_wood_001")).toBeNull();
      expect(pickups.getTargetId(scene.getMeshByName("world-pickup-pickup_water_bottle_001"))).toBe("pickup_water_bottle_001");
      const base = scene.getMeshByName("player-campfire-base-building_000003");
      expect(buildings.getTargetId(base)).toBe("interaction:campfire_building_000003");
      expect(scene.getMeshByName("player-campfire-flame-building_000003")?.isEnabled()).toBe(true);
      expect(scene.getLightByName("player-campfire-light-building_000003")?.intensity).toBe(1.4);
      expect(target.simulation.snapshot.heat.temperatureBonusCelsius).toBeGreaterThan(0);
      const counts = [scene.meshes.length, scene.transformNodes.length, scene.lights.length, obstacles.getAll().length];
      expect(await service.load()).toMatchObject({ reason: "ok" });
      expect([scene.meshes.length, scene.transformNodes.length, scene.lights.length, obstacles.getAll().length]).toEqual(counts);
      expect(target.gameplay.campfireSystem.getAll()).toHaveLength(1);
    } finally { pickups.dispose(); buildings.dispose(); assets.dispose(); scene.dispose(); engine.dispose(); }
  });
});
