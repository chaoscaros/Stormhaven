import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import type { BuildCatalog } from "../BuildCatalog";
import type { BuildingPresentationFactory, PreparedBuildingPresentation } from "../BuildService";
import type { WorldBuilding } from "../BuildingTypes";
import type { PrecipitationObstacleRegistry } from "../../weather/presentation/PrecipitationObstacleRegistry";

interface PresentedBuilding {
  readonly mesh: Mesh;
  readonly obstacleId: string;
}

/** 正式建筑 Mesh 表现；启用后同时加入 Camera Collision 与降水障碍注册表。 */
export class BuildingPresentation implements BuildingPresentationFactory {
  readonly #woodMaterial: StandardMaterial;
  readonly #presented = new Map<string, PresentedBuilding>();

  constructor(
    private readonly scene: Scene,
    private readonly definitions: BuildCatalog,
    private readonly precipitationObstacles: PrecipitationObstacleRegistry,
  ) {
    this.#woodMaterial = new StandardMaterial("player-building-wood-material", scene);
    this.#woodMaterial.diffuseColor = new Color3(0.24, 0.17, 0.1);
    this.#woodMaterial.specularColor = new Color3(0.035, 0.03, 0.025);
    this.#woodMaterial.roughness = 0.96;
  }

  prepare(entity: WorldBuilding): PreparedBuildingPresentation {
    if (this.#presented.has(entity.id)) throw new Error(`建筑表现 ID 重复：${entity.id}`);
    const definition = this.definitions.get(entity.definitionId);
    const mesh = MeshBuilder.CreateBox(
      `player-building-${entity.id}`,
      {
        width: definition.size.x,
        height: definition.size.y,
        depth: definition.size.z,
      },
      this.scene,
    );
    mesh.position.copyFromFloats(entity.position.x, entity.position.y, entity.position.z);
    mesh.rotation.y = entity.rotationDegrees * Math.PI / 180;
    mesh.material = this.#woodMaterial;
    mesh.checkCollisions = definition.collision;
    mesh.isPickable = true;
    mesh.metadata = { buildingEntityId: entity.id };
    mesh.receiveShadows = true;
    mesh.setEnabled(false);
    const obstacleId = `building:${entity.id}`;
    let active = false;
    let disposed = false;
    return {
      activate: (): void => {
        if (active || disposed) return;
        mesh.setEnabled(true);
        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        this.precipitationObstacles.add(obstacleId, {
          min: { x: box.minimumWorld.x, y: box.minimumWorld.y, z: box.minimumWorld.z },
          max: { x: box.maximumWorld.x, y: box.maximumWorld.y, z: box.maximumWorld.z },
        });
        this.#presented.set(entity.id, { mesh, obstacleId });
        active = true;
      },
      dispose: (): void => {
        if (disposed) return;
        if (active) {
          this.precipitationObstacles.remove(obstacleId);
          this.#presented.delete(entity.id);
        }
        mesh.dispose(false, false);
        disposed = true;
      },
    };
  }

  dispose(): void {
    for (const { mesh, obstacleId } of this.#presented.values()) {
      this.precipitationObstacles.remove(obstacleId);
      mesh.dispose(false, false);
    }
    this.#presented.clear();
    this.#woodMaterial.dispose();
  }
}

export function collectStaticBuildingBounds(scene: Scene) {
  return Object.freeze(scene.meshes
    .filter((mesh) => mesh.checkCollisions && mesh.isEnabled() && mesh.name !== "snow-ground")
    .map((mesh) => {
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      return Object.freeze({
        min: Object.freeze({
          x: box.minimumWorld.x,
          y: box.minimumWorld.y,
          z: box.minimumWorld.z,
        }),
        max: Object.freeze({
          x: box.maximumWorld.x,
          y: box.maximumWorld.y,
          z: box.maximumWorld.z,
        }),
      });
    }));
}
