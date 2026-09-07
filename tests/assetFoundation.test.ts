import { describe, expect, it, vi } from "vitest";
import { readAsset, readSource } from "./helpers/assetFiles.mjs";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AssetLoader } from "../src/assets/AssetLoader";
import { AssetInstanceFactory } from "../src/assets/AssetInstanceFactory";
import { AssetRegistry, ASSET_DEFINITIONS, GAME_ASSET_IDS, assetVariantIndex, buildingAssetId, pickupAssetId } from "../src/assets/AssetRegistry";
import { createFirstBlizzardCabin } from "../src/world/createFirstBlizzardCabin";
import { createControlReferenceMarkers } from "../src/world/createControlReferenceMarkers";
import { parseSurvivalEnvironmentScenario } from "../src/survival/environment/SurvivalEnvironmentScenario";
import scenario from "../data/world/first-blizzard-environment.json";

describe("Asset registry and delivery contracts", () => {
  it("covers all P0 semantic IDs without gameplay model paths", () => {
    const registry = new AssetRegistry();
    expect(registry.getAll().map(entry => entry.id)).toEqual(GAME_ASSET_IDS);
    for (const id of ["wood", "stone", "stick", "water_bottle", "canned_food", "raw_meat"]) expect(registry.get(pickupAssetId(id))).toBeDefined();
    for (const id of ["foundation_wood", "wall_wood", "campfire_basic"]) expect(registry.get(buildingAssetId(id))).toBeDefined();
    for (const path of ["data/items/items.json", "data/building/buildings.json", "src/save/schema/SaveGameV1.ts", "src/items/ItemDefinition.ts", "src/building/BuildingTypes.ts"]) {
      expect(readSource(path)).not.toMatch(/\.glb|\.gltf|assets\/models|@babylonjs|AssetInstanceFactory/);
    }
  });
  it("rejects duplicate IDs, nonpositive/nonfinite scale, invalid offset and remote URLs", () => {
    const entry = ASSET_DEFINITIONS[0];
    expect(() => new AssetRegistry([entry, entry])).toThrow(/Duplicate/);
    for (const scale of [0,-1,NaN,Infinity]) expect(() => new AssetRegistry([{ ...entry, scale }])).toThrow(/Invalid/);
    expect(() => new AssetRegistry([{ ...entry, positionOffset: { x: NaN, y: 0, z: 0 } }])).toThrow(/Invalid/);
    expect(() => new AssetRegistry([{ ...entry, urls: ["https://example.com/log.glb"] }])).toThrow(/Invalid/);
    expect(new AssetRegistry().get("unknown")).toBeUndefined();
  });
  it("keeps variants stable across restoration and under per-file/total budgets", () => {
    expect(assetVariantIndex("pickup_stone_001", 3)).toBe(assetVariantIndex("pickup_stone_001", 3));
    expect(new Set(Array.from({ length: 24 }, (_, i) => assetVariantIndex(`stone-${i}`, 3))).size).toBe(3);
    let total = 0;
    for (const entry of ASSET_DEFINITIONS) for (const path of entry.urls) {
      const buffer = readAsset(`public/${path}`);
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      expect(view.getUint32(0, true)).toBe(0x46546c67);
      expect(view.getUint32(4, true)).toBe(2);
      expect(view.getUint32(8, true)).toBe(buffer.length);
      expect(buffer.length).toBeLessThan(entry.stage === "environment" ? 3_000_000 : 1_000_000);
      total += buffer.length;
    }
    for (const map of ["albedo", "normal", "roughness"]) {
      const buffer = readAsset(`public/assets/textures/terrain/snow-${map}.png`);
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      expect(view.getUint32(16)).toBe(1024);
      expect(view.getUint32(20)).toBe(1024);
      total += buffer.length;
    }
    expect(total).toBeLessThan(50_000_000);
  });
});

describe("Asset cache lifecycle", () => {
  it("deduplicates concurrent and completed loads and disposes sources only once", async () => {
    const engine = new NullEngine(); const scene = new Scene(engine);
    const container = new AssetContainer(scene); const dispose = vi.spyOn(container, "dispose");
    const load = vi.fn(async () => container); const loader = new AssetLoader(load);
    try {
      const first = loader.load("test"); expect(loader.load("test")).toBe(first);
      expect(await first).toBe(container); expect(await loader.load("test")).toBe(container);
      expect(load).toHaveBeenCalledTimes(1);
      loader.dispose(); loader.dispose(); expect(dispose).toHaveBeenCalledTimes(1);
      expect(await loader.load("test")).toBeUndefined();
    } finally { scene.dispose(); engine.dispose(); }
  });
  it("does not retry a failed source on each spawn or throw for missing/unknown assets", async () => {
    const engine = new NullEngine(); const scene = new Scene(engine); const warn = vi.fn();
    const load = vi.fn(async () => { throw new Error("404"); }); const loader = new AssetLoader(load,warn);
    const factory = new AssetInstanceFactory(scene,new AssetRegistry(),loader,warn);
    try {
      const path = ASSET_DEFINITIONS[0].urls[0];
      expect(await loader.load(path)).toBeUndefined(); await loader.load(path);
      expect(load).toHaveBeenCalledTimes(1);
      expect(factory.create("pickup_wood","one",{ x:0,y:0,z:0 })).toBeUndefined();
      expect(factory.create("missing","two",{ x:0,y:0,z:0 })).toBeUndefined();
      expect(warn).toHaveBeenCalled();
    } finally { factory.dispose(); scene.dispose(); engine.dispose(); }
  });
  it("disposes a source arriving after teardown without resurrecting the cache", async () => {
    const engine = new NullEngine(); const scene = new Scene(engine);
    const container = new AssetContainer(scene); const dispose = vi.spyOn(container,"dispose");
    let finish!: (container: AssetContainer) => void;
    const loader = new AssetLoader(() => new Promise(resolve => { finish=resolve; }));
    const pending = loader.load("late"); await Promise.resolve(); loader.dispose(); finish(container);
    expect(await pending).toBeUndefined(); expect(loader.get("late")).toBeUndefined(); expect(dispose).toHaveBeenCalledTimes(1);
    scene.dispose(); engine.dispose();
  });
});

describe("Real GLB integration (NullEngine, not browser visual QA)", () => {
  it("loads every binary, clones independently, retains shared sources and correct building scale", async () => {
    const engine = new NullEngine(); const scene = new Scene(engine);
    const registry = new AssetRegistry();
    const loader = new AssetLoader(path => LoadAssetContainerAsync(readAsset(`public/${path}`), scene, { pluginExtension: ".glb" }));
    const factory = new AssetInstanceFactory(scene,registry,loader);
    try {
      for (const entry of registry.getAll()) for (const url of entry.urls) expect(await loader.load(url)).toBeDefined();
      expect(scene.meshes).toHaveLength(0); // Cached source is not a visible origin duplicate.
      for (const entry of registry.getAll()) {
        const first = factory.create(entry.id,"first",{ x:0,y:-entry.positionOffset.y,z:0 })!;
        const second = factory.create(entry.id,"second",{ x:2,y:-entry.positionOffset.y,z:0 })!;
        expect(first).toBeDefined(); expect(second).toBeDefined();
        for (const mesh of first.root.getChildMeshes()) {
          expect(mesh.checkCollisions).toBe(false); expect(mesh.isPickable).toBe(false);
          mesh.computeWorldMatrix(true);
        }
        const bounds = first.root.getHierarchyBoundingVectors(true);
        expect(bounds.min.y).toBeCloseTo(0,3);
        if (entry.id === "building_foundation_wood") {
          expect(bounds.max.x-bounds.min.x).toBeCloseTo(2,3);
          expect(bounds.max.z-bounds.min.z).toBeCloseTo(2,3);
          expect(bounds.max.y).toBeCloseTo(.2,3);
        }
        if (entry.id === "building_wall_wood") {
          expect(bounds.max.x-bounds.min.x).toBeCloseTo(2,3);
          expect(bounds.max.z-bounds.min.z).toBeCloseTo(.18,3);
          expect(bounds.max.y).toBeCloseTo(2.4,3);
        }
        first.dispose(); first.dispose();
        expect(second.root.isDisposed()).toBe(false);
        expect(second.root.getChildMeshes().some(mesh => mesh.getTotalVertices()>0 && mesh.material)).toBe(true);
        second.dispose();
      }
      expect(scene.meshes).toHaveLength(0);
      expect(scene.transformNodes).toHaveLength(0);
    } finally { factory.dispose(); scene.dispose(); engine.dispose(); }
  });

  it("keeps cabin compound proxies, occlusion and front opening while debug helpers never collide", async () => {
    const engine = new NullEngine(); const scene = new Scene(engine);
    const registry = new AssetRegistry(); const loader = new AssetLoader(path => LoadAssetContainerAsync(readAsset(`public/${path}`),scene,{ pluginExtension: ".glb" }));
    const factory = new AssetInstanceFactory(scene,registry,loader);
    try {
      await loader.load(registry.get("environment_cabin")!.urls[0]);
      createFirstBlizzardCabin(scene,parseSurvivalEnvironmentScenario(scenario),factory);
      const wall = scene.getMeshByName("test-cabin-front-right")!;
      expect(wall.visibility).toBe(0); expect(wall.isVisible).toBe(true); expect(wall.checkCollisions).toBe(true);
      for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
      expect(scene.pickWithRay(new Ray(new Vector3(3,1.8,0),Vector3.Forward(),6))?.pickedMesh).toBe(wall);
      expect(scene.pickWithRay(new Ray(new Vector3(0,1.8,0),Vector3.Forward(),6))?.hit).toBe(false);
      // Check actual visual triangles too: loader handedness must not put the doorway at the back.
      const isModel = (mesh: { name: string }) => mesh.name.startsWith("first_blizzard_cabin:");
      expect(scene.pickWithRay(new Ray(new Vector3(0,1.8,0),Vector3.Forward(),6),isModel)?.hit).toBe(false);
      expect(scene.pickWithRay(new Ray(new Vector3(3,1.8,0),Vector3.Forward(),6),isModel)?.hit).toBe(true);
      const toggle = createControlReferenceMarkers(scene);
      const marker = scene.getMeshByName("north-beacon")!;
      expect(marker.isVisible).toBe(false); toggle(true); expect(marker.isVisible).toBe(true);
      expect(marker.checkCollisions).toBe(false); expect(marker.isPickable).toBe(false);
      toggle(false); expect(marker.checkCollisions).toBe(false);
    } finally { factory.dispose(); scene.dispose(); engine.dispose(); }
  });
});
