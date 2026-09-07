import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { AssetRegistry } from "../src/assets/AssetRegistry";
import { AssetLoader } from "../src/assets/AssetLoader";
import { AssetInstanceFactory } from "../src/assets/AssetInstanceFactory";
import { BuildingPresentation } from "../src/building/presentation/BuildingPresentation";
import { createBuildingBounds, createFoundationWallSnapPoints } from "../src/building/BuildingGeometry";
import { PrecipitationObstacleRegistry } from "../src/weather/presentation/PrecipitationObstacleRegistry";
import { createSaveFixture } from "./helpers/saveFixture";
import { readAsset } from "./helpers/assetFiles.mjs";

describe("Real Blender Foundation Pilot (NullEngine, no pixel acceptance)", () => {
  it("contains two named meshes, one matte PBR material, embedded grain and UVs", () => {
    const bytes = readAsset("public/assets/models/buildings/wood-foundation.glb");
    const size = new DataView(bytes.buffer, bytes.byteOffset).getUint32(12, true);
    const gltf = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + size))) as {
      asset: { generator: string };
      meshes: { name: string; primitives: { indices: number; attributes: Record<string, number> }[] }[];
      accessors: { count: number }[];
      materials: { pbrMetallicRoughness: { roughnessFactor: number; metallicFactor: number; baseColorTexture: { index: number } } }[];
      images: { uri?: string; bufferView: number; mimeType: string }[];
      animations?: unknown[];
      cameras?: unknown[];
    };
    expect(gltf.asset.generator).toContain("Blender");
    expect(gltf.meshes.map(mesh => mesh.name).sort()).toEqual(["foundation_wood__deck_mesh", "foundation_wood__frame_mesh"]);
    let triangles = 0;
    for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
      expect(primitive.attributes.TEXCOORD_0).toBeDefined();
      expect(primitive.attributes.NORMAL).toBeDefined();
      triangles += gltf.accessors[primitive.indices]!.count / 3;
    }
    expect(triangles).toBe(1836);
    expect(gltf.materials).toHaveLength(1);
    expect(gltf.materials[0]!.pbrMetallicRoughness.roughnessFactor).toBeCloseTo(.82, 6);
    expect(gltf.materials[0]!.pbrMetallicRoughness.metallicFactor).toBe(0);
    expect(gltf.materials[0]!.pbrMetallicRoughness.baseColorTexture).toBeDefined();
    expect(gltf.images).toHaveLength(1);
    expect(gltf.images[0]!.uri).toBeUndefined();
    expect(gltf.images[0]!.bufferView).toBeTypeOf("number");
    expect(gltf.animations).toBeUndefined();
    expect(gltf.cameras).toBeUndefined();
  });

  it.each([0, 90, 180, 270])("placement/restore at %s degrees retains bottom pivot, proxy and wall snaps", async rotationDegrees => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const registry = new AssetRegistry();
    const loader = new AssetLoader(path => LoadAssetContainerAsync(readAsset(`public/${path}`), scene, { pluginExtension: ".glb" }));
    const assets = new AssetInstanceFactory(scene, registry, loader);
    const catalog = createSaveFixture().gameplay.buildCatalog;
    const obstacles = new PrecipitationObstacleRegistry();
    const presentation = new BuildingPresentation(scene, catalog, obstacles, undefined, assets);
    const entity = { id: "pilot", definitionId: "foundation_wood", position: { x: -4, y: .1, z: 3 }, rotationDegrees };
    const definition = catalog.get(entity.definitionId);
    const expected = createBuildingBounds(definition, entity.position, rotationDegrees);
    try {
      expect(await loader.load(registry.get("building_foundation_wood")!.urls[0])).toBeDefined();
      const prepared = presentation.prepare(entity);
      prepared.activate();
      let count = 0;
      for (let pass = 0; pass < 3; pass++) {
        const root = scene.getTransformNodeByName("asset:pilot")!;
        expect(root.position.y).toBe(0);
        expect(root.scaling.asArray()).toEqual([1, 1, 1]);
        for (const mesh of root.getChildMeshes()) {
          mesh.computeWorldMatrix(true);
          expect(mesh.isPickable).toBe(false);
          expect(mesh.checkCollisions).toBe(false);
        }
        const bounds = root.getHierarchyBoundingVectors(true);
        const proxy = scene.getMeshByName("player-building-pilot")!;
        proxy.computeWorldMatrix(true);
        for (const axis of ["x", "y", "z"] as const) {
          expect(bounds.min[axis]).toBeCloseTo(expected.min[axis], 5);
          expect(bounds.max[axis]).toBeCloseTo(expected.max[axis], 5);
          expect(proxy.getBoundingInfo().boundingBox.minimumWorld[axis]).toBeCloseTo(expected.min[axis], 5);
          expect(proxy.getBoundingInfo().boundingBox.maximumWorld[axis]).toBeCloseTo(expected.max[axis], 5);
        }
        expect(proxy.checkCollisions).toBe(true);
        expect(proxy.isPickable).toBe(true);
        expect(proxy.visibility).toBe(0);
        expect(obstacles.getAll()).toHaveLength(1);
        expect(createFoundationWallSnapPoints(entity, definition)).toHaveLength(4);
        for (const snap of createFoundationWallSnapPoints(entity, definition)) {
          expect(snap.position.y).toBeCloseTo(bounds.max.y, 5);
        }
        if (!pass) count = scene.meshes.length;
        expect(scene.meshes).toHaveLength(count);
        presentation.clear();
        expect(obstacles.getAll()).toHaveLength(0);
        if (pass < 2) presentation.restore([entity]);
      }
    } finally { presentation.dispose(); assets.dispose(); scene.dispose(); engine.dispose(); }
  });
});
