import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { AssetRegistry } from "../src/assets/AssetRegistry";
import { AssetLoader } from "../src/assets/AssetLoader";
import { AssetInstanceFactory } from "../src/assets/AssetInstanceFactory";
import { BuildingPresentation } from "../src/building/presentation/BuildingPresentation";
import { createBuildingBounds } from "../src/building/BuildingGeometry";
import { PrecipitationObstacleRegistry } from "../src/weather/presentation/PrecipitationObstacleRegistry";
import { SaveService } from "../src/save/SaveService";
import { createSaveFixture, InMemorySaveRepository } from "./helpers/saveFixture";
import { readAsset } from "./helpers/assetFiles.mjs";

describe("Blender Wall Remodeling (real GLB, no browser pixel acceptance)", () => {
  it("records the existing corner-overlap limitation without changing placement rules", () => {
    const fixture = createSaveFixture();
    fixture.gameplay.inventory.addItem("wood", 20);
    fixture.builds.place({ definitionId: "foundation_wood", playerPosition: { x: 0, y: 1.8, z: 1 },
      placement: { position: { x: 0, y: 0, z: 1 }, rotationDegrees: 0, surface: "ground" } }, fixture.buildPresentation);
    const request = (edge: string) => {
      const snap = fixture.gameplay.worldBuildingRegistry.getSnapPoint(`building_000001:${edge}`);
      return { definitionId: "wall_wood", playerPosition: { x: 0, y: 1.8, z: 1 },
        placement: { position: snap.position, rotationDegrees: snap.rotationDegrees, surface: "building" as const, snapPointId: snap.id } };
    };
    expect(fixture.builds.place(request("north"), fixture.buildPresentation).success).toBe(true);
    // 2m walls centered on perpendicular edges overlap at the corner by 9cm.
    // This happens without any GLB loaded; fixing it requires a gameplay Issue.
    expect(fixture.builds.plan(request("east")).reason).toBe("blocked");
    expect(fixture.builds.plan(request("south")).canCommit).toBe(true);
  });

  it("exports two meshes, finite UV/normals, one matte material and no helpers", () => {
    const bytes = readAsset("public/assets/models/buildings/wood-wall.glb");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const size = view.getUint32(12, true);
    const doc = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + size))) as {
      asset: { generator: string };
      meshes: { name: string; primitives: { indices: number; attributes: Record<string, number> }[] }[];
      accessors: { count: number; bufferView: number; byteOffset?: number; componentType: number }[];
      bufferViews: { byteOffset?: number; byteStride?: number }[];
      materials: { pbrMetallicRoughness: { roughnessFactor: number; metallicFactor: number; baseColorTexture: unknown } }[];
      images: { bufferView: number; uri?: string }[];
      cameras?: unknown[]; animations?: unknown[]; extensionsUsed?: string[];
    };
    expect(doc.asset.generator).toContain("Blender");
    expect(doc.meshes.map(mesh => mesh.name).sort()).toEqual(["wall_wood__boards_mesh", "wall_wood__frame_mesh"]);
    let triangles = 0;
    for (const mesh of doc.meshes) for (const primitive of mesh.primitives) {
      triangles += doc.accessors[primitive.indices]!.count / 3;
      for (const [attribute, width] of [["NORMAL", 3], ["TEXCOORD_0", 2]] as const) {
        const accessor = doc.accessors[primitive.attributes[attribute]!]!;
        expect(accessor).toBeDefined();
        expect(accessor.componentType).toBe(5126);
        const buffer = doc.bufferViews[accessor.bufferView]!;
        const start = 28 + size + (buffer.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        for (let i = 0; i < accessor.count; i++) {
          const values = Array.from({ length: width }, (_, component) =>
            view.getFloat32(start + i * (buffer.byteStride ?? width * 4) + component * 4, true));
          expect(values.every(Number.isFinite)).toBe(true);
          if (attribute === "NORMAL") expect(Math.hypot(...values)).toBeCloseTo(1, 5);
        }
      }
    }
    expect(triangles).toBe(1620);
    expect(bytes.length).toBeLessThan(1_000_000);
    expect(doc.materials).toHaveLength(1);
    const pbr = doc.materials[0]!.pbrMetallicRoughness;
    expect(pbr.roughnessFactor).toBeCloseTo(.82, 6);
    expect(pbr.metallicFactor).toBe(0);
    expect(pbr.baseColorTexture).toBeDefined();
    expect(doc.images).toHaveLength(1);
    expect(doc.images[0]!.uri).toBeUndefined();
    expect(doc.cameras).toBeUndefined();
    expect(doc.animations).toBeUndefined();
    expect(doc.extensionsUsed ?? []).not.toContain("KHR_lights_punctual");
  });

  it.each(["north", "east", "south", "west"] as const)("%s edge: actual placement and repeated SaveService load retain bounds, identity, cost and occupancy", async (edge) => {
    const fixture = createSaveFixture();
    fixture.gameplay.inventory.addItem("wood", 20);
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const registry = new AssetRegistry();
    const loader = new AssetLoader(path => LoadAssetContainerAsync(readAsset(`public/${path}`), scene, { pluginExtension: ".glb" }));
    const assets = new AssetInstanceFactory(scene, registry, loader);
    const obstacles = new PrecipitationObstacleRegistry();
    const buildings = new BuildingPresentation(scene, fixture.gameplay.buildCatalog, obstacles, undefined, assets);
    Object.assign(fixture.presentation, { clearBuildings: () => buildings.clear(), restoreBuildings: buildings.restore.bind(buildings) });
    try {
      for (const id of ["building_foundation_wood", "building_wall_wood"]) {
        expect(await loader.load(registry.get(id)!.urls[0])).toBeDefined();
      }
      expect(fixture.builds.place({ definitionId: "foundation_wood", playerPosition: { x: 0, y: 1.8, z: 1 },
        placement: { position: { x: 0, y: 0, z: 1 }, rotationDegrees: 90, surface: "ground" } }, buildings).success).toBe(true);
      const world = fixture.gameplay.worldBuildingRegistry;
      const snap = world.getSnapPoint(`building_000001:${edge}`);
      const request = { definitionId: "wall_wood", playerPosition: { x: 0, y: 1.8, z: 1 },
        placement: { position: snap.position, rotationDegrees: 13, surface: "building" as const, snapPointId: snap.id } };
      const beforeWood = fixture.gameplay.inventory.getItemCount("wood");
      const result = fixture.builds.place(request, buildings);
      expect(result).toMatchObject({ success: true, rotationDegrees: { north: 0, east: 90, south: 180, west: 270 }[edge] });
      expect(beforeWood - fixture.gameplay.inventory.getItemCount("wood")).toBe(3);
      const wall = structuredClone(world.get(result.buildingEntityId!));
      const bounds = createBuildingBounds(fixture.gameplay.buildCatalog.get("wall_wood"), wall.position, wall.rotationDegrees);
      const inventory = fixture.gameplay.inventory.snapshot;
      const service = new SaveService(new InMemorySaveRepository(), fixture.runtime, { canSave: () => true, canLoad: () => true }, () => 1000);
      expect(await service.save()).toMatchObject({ reason: "ok" });
      let counts: number[] | undefined;
      for (let pass = 0; pass < 4; pass++) {
        if (pass) expect(await service.load()).toMatchObject({ reason: "ok" });
        expect(world.get(wall.id)).toMatchObject(wall);
        expect(world.getAll()).toHaveLength(2);
        expect(world.getConsumedSnapPointId(wall.id)).toBe(snap.id);
        expect(world.getSnapPoint(snap.id).occupied).toBe(true);
        expect(fixture.builds.plan(request).reason).toBe("snap_occupied");
        expect(fixture.gameplay.inventory.snapshot).toEqual(inventory);
        const root = scene.getTransformNodeByName(`asset:${wall.id}`)!;
        for (const axis of ["x", "y", "z"] as const) expect(root.position[axis]).toBeCloseTo(snap.position[axis], 6);
        expect(root.scaling.asArray()).toEqual([1, 1, 1]);
        expect(root.rotation.y).toBeCloseTo(wall.rotationDegrees * Math.PI / 180);
        const proxy = scene.getMeshByName(`player-building-${wall.id}`)!;
        proxy.computeWorldMatrix(true);
        for (const mesh of root.getChildMeshes()) {
          mesh.computeWorldMatrix(true);
          expect(mesh.isPickable).toBe(false);
          expect(mesh.checkCollisions).toBe(false);
        }
        const actual = root.getHierarchyBoundingVectors(true);
        for (const axis of ["x", "y", "z"] as const) {
          expect(actual.min[axis]).toBeCloseTo(bounds.min[axis], 5);
          expect(actual.max[axis]).toBeCloseTo(bounds.max[axis], 5);
          expect(proxy.getBoundingInfo().boundingBox.minimumWorld[axis]).toBeCloseTo(bounds.min[axis], 5);
          expect(proxy.getBoundingInfo().boundingBox.maximumWorld[axis]).toBeCloseTo(bounds.max[axis], 5);
        }
        expect(actual.min.y).toBeCloseTo(.2, 5);
        expect(actual.max.y).toBeCloseTo(2.6, 5);
        expect(proxy.visibility).toBe(0);
        expect(proxy.isVisible).toBe(true);
        expect(proxy.isPickable).toBe(true);
        expect(proxy.checkCollisions).toBe(true);
        expect(obstacles.getAll()).toHaveLength(2);
        const nextCounts = [scene.meshes.length, scene.transformNodes.length, scene.lights.length];
        if (counts) expect(nextCounts).toEqual(counts);
        counts = nextCounts;
      }
      buildings.clear();
      expect(obstacles.getAll()).toHaveLength(0);
      expect(scene.getTransformNodeByName(`asset:${wall.id}`)).toBeNull();
    } finally { buildings.dispose(); assets.dispose(); scene.dispose(); engine.dispose(); }
  });

  it("recessed joints remain opaque geometry from both faces, not holes through the wall", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const loader = new AssetLoader(path => LoadAssetContainerAsync(readAsset(`public/${path}`), scene, { pluginExtension: ".glb" }));
    const assets = new AssetInstanceFactory(scene, new AssetRegistry(), loader);
    try {
      await loader.load("assets/models/buildings/wood-wall.glb");
      const wall = assets.create("building_wall_wood", "joint-test", { x: 0, y: 0, z: 0 })!;
      const meshes = wall.root.getChildMeshes();
      for (const mesh of meshes) mesh.computeWorldMatrix(true);
      for (let i = 1; i < 8; i++) for (const sign of [-1, 1]) {
        const x = -.86 + i * ((1.72 - 7 * .004) / 8 + .004) - .002;
        const ray = new Ray(new Vector3(x, 1.2, sign), new Vector3(0, 0, -sign), 2);
        expect(meshes.some(mesh => ray.intersectsMesh(mesh).hit)).toBe(true);
      }
    } finally { assets.dispose(); scene.dispose(); engine.dispose(); }
  });

  it("wall 404 still falls back to the existing visible collision proxy", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const loader = new AssetLoader(() => Promise.reject(new Error("404 fixture")), vi.fn());
    const assets = new AssetInstanceFactory(scene, new AssetRegistry(), loader, vi.fn());
    const obstacles = new PrecipitationObstacleRegistry();
    const presentation = new BuildingPresentation(scene, createSaveFixture().gameplay.buildCatalog, obstacles, undefined, assets);
    try {
      await loader.load("assets/models/buildings/wood-wall.glb");
      presentation.prepare({ id: "fallback-wall", definitionId: "wall_wood", position: { x: 0, y: 1.4, z: 0 }, rotationDegrees: 90 }).activate();
      const proxy = scene.getMeshByName("player-building-fallback-wall")!;
      expect(proxy.visibility).toBe(1);
      expect(proxy.checkCollisions).toBe(true);
      expect(scene.getTransformNodeByName("asset:fallback-wall")).toBeNull();
      expect(obstacles.getAll()).toHaveLength(1);
    } finally { presentation.dispose(); assets.dispose(); scene.dispose(); engine.dispose(); }
  });
});
