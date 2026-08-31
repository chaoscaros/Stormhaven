import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import type { BuildCatalog } from "../BuildCatalog";
import type { BuildingPresentationFactory, PreparedBuildingPresentation } from "../BuildService";
import type { BuildDefinition, WorldBuilding } from "../BuildingTypes";
import { createBuildingBounds } from "../BuildingGeometry";
import {
  NO_BUILDING_GAMEPLAY,
  type BuildingGameplayBinding,
  type PreparedBuildingGameplay,
} from "../BuildingGameplayBinding";
import type { PrecipitationObstacleRegistry } from "../../weather/presentation/PrecipitationObstacleRegistry";

interface BuildingVisual {
  readonly meshes: readonly Mesh[];
  readonly flame?: Mesh;
  readonly light?: PointLight;
}

interface PresentedBuilding {
  readonly visual: BuildingVisual;
  readonly gameplay: PreparedBuildingGameplay;
  lit: boolean;
  dispose(): void;
}

/** 正式建筑表现；Gameplay Binding、Interaction、Camera Collision 与降水障碍均走窄接口。 */
export class BuildingPresentation implements BuildingPresentationFactory {
  readonly #woodMaterial: StandardMaterial;
  readonly #campfireStoneMaterial: StandardMaterial;
  readonly #campfireLogMaterial: StandardMaterial;
  readonly #campfireFlameMaterial: StandardMaterial;
  readonly #presented = new Map<string, PresentedBuilding>();
  readonly #interactionMeshes = new Map<number, string>();

  constructor(
    private readonly scene: Scene,
    private readonly definitions: BuildCatalog,
    private readonly precipitationObstacles: PrecipitationObstacleRegistry,
    private readonly gameplayBinding: BuildingGameplayBinding = NO_BUILDING_GAMEPLAY,
  ) {
    this.#woodMaterial = createMaterial(scene, "player-building-wood-material", new Color3(0.24, 0.17, 0.1));
    this.#campfireStoneMaterial = createMaterial(scene, "campfire-stone-material", new Color3(0.27, 0.29, 0.28));
    this.#campfireLogMaterial = createMaterial(scene, "campfire-log-material", new Color3(0.3, 0.15, 0.055));
    this.#campfireFlameMaterial = createMaterial(scene, "campfire-flame-material", new Color3(0.95, 0.28, 0.035));
    this.#campfireFlameMaterial.emissiveColor = new Color3(1, 0.22, 0.015);
  }

  prepare(entity: WorldBuilding): PreparedBuildingPresentation {
    if (this.#presented.has(entity.id)) throw new Error(`建筑表现 ID 重复：${entity.id}`);
    const definition = this.definitions.get(entity.definitionId);
    const gameplay = this.gameplayBinding.prepare(entity, definition);
    const visual = definition.tags.includes("campfire")
      ? this.#createCampfireVisual(entity, gameplay.interactionTargetId)
      : this.#createBoxVisual(entity, definition);
    for (const mesh of visual.meshes) mesh.setEnabled(false);
    visual.flame?.setEnabled(false);
    if (visual.light) visual.light.intensity = 0;

    const obstacleId = `building:${entity.id}`;
    let active = false;
    let obstacleAdded = false;
    let disposed = false;
    const dispose = (): void => {
      if (disposed) return;
      if (obstacleAdded) this.precipitationObstacles.remove(obstacleId);
      this.#presented.delete(entity.id);
      for (const mesh of visual.meshes) {
        this.#interactionMeshes.delete(mesh.uniqueId);
        mesh.dispose(false, false);
      }
      visual.flame?.dispose(false, false);
      visual.light?.dispose();
      gameplay.dispose();
      disposed = true;
      active = false;
    };

    return {
      activate: (): void => {
        if (active || disposed) return;
        gameplay.activate();
        for (const mesh of visual.meshes) {
          mesh.setEnabled(true);
          if (gameplay.interactionTargetId) {
            this.#interactionMeshes.set(mesh.uniqueId, gameplay.interactionTargetId);
          }
        }
        const bounds = createBuildingBounds(definition, entity.position, entity.rotationDegrees);
        this.precipitationObstacles.add(obstacleId, bounds);
        obstacleAdded = true;
        const lit = gameplay.isActive();
        setCampfireVisualState(visual, lit);
        this.#presented.set(entity.id, { visual, gameplay, lit, dispose });
        active = true;
      },
      dispose,
    };
  }

  update(): void {
    for (const presented of this.#presented.values()) {
      const lit = presented.gameplay.isActive();
      if (lit === presented.lit) continue;
      setCampfireVisualState(presented.visual, lit);
      presented.lit = lit;
    }
  }

  isInteractionMesh(mesh: AbstractMesh): boolean {
    return this.#interactionMeshes.has(mesh.uniqueId);
  }

  getTargetId(mesh: AbstractMesh | null | undefined): string | undefined {
    return mesh ? this.#interactionMeshes.get(mesh.uniqueId) : undefined;
  }

  dispose(): void {
    for (const presented of [...this.#presented.values()]) presented.dispose();
    this.#presented.clear();
    this.#interactionMeshes.clear();
    this.#woodMaterial.dispose();
    this.#campfireStoneMaterial.dispose();
    this.#campfireLogMaterial.dispose();
    this.#campfireFlameMaterial.dispose();
  }

  #createBoxVisual(entity: WorldBuilding, definition: BuildDefinition): BuildingVisual {
    const mesh = MeshBuilder.CreateBox(
      `player-building-${entity.id}`,
      { width: definition.size.x, height: definition.size.y, depth: definition.size.z },
      this.scene,
    );
    mesh.position.copyFromFloats(entity.position.x, entity.position.y, entity.position.z);
    mesh.rotation.y = entity.rotationDegrees * Math.PI / 180;
    mesh.material = this.#woodMaterial;
    mesh.checkCollisions = definition.collision;
    mesh.isPickable = true;
    mesh.metadata = { buildingEntityId: entity.id };
    mesh.receiveShadows = true;
    return { meshes: Object.freeze([mesh]) };
  }

  #createCampfireVisual(entity: WorldBuilding, interactionTargetId?: string): BuildingVisual {
    const baseY = entity.position.y - 0.25;
    const metadata = {
      buildingEntityId: entity.id,
      ...(interactionTargetId ? { interactionTargetId } : {}),
    };
    const base = MeshBuilder.CreateCylinder(
      `player-campfire-base-${entity.id}`,
      { height: 0.16, diameter: 1.05, tessellation: 12 },
      this.scene,
    );
    base.position.set(entity.position.x, baseY + 0.08, entity.position.z);
    base.material = this.#campfireStoneMaterial;
    base.metadata = metadata;
    base.checkCollisions = false;

    const logs = [0, Math.PI / 3, -Math.PI / 3].map((angle, index) => {
      const log = MeshBuilder.CreateCylinder(
        `player-campfire-log-${entity.id}-${index}`,
        { height: 0.82, diameter: 0.14, tessellation: 8 },
        this.scene,
      );
      log.position.set(entity.position.x, baseY + 0.23, entity.position.z);
      log.rotation.copyFromFloats(0, angle, Math.PI / 2);
      log.material = this.#campfireLogMaterial;
      log.metadata = metadata;
      log.checkCollisions = false;
      return log;
    });
    const flame = MeshBuilder.CreateSphere(
      `player-campfire-flame-${entity.id}`,
      { diameter: 0.42, segments: 8 },
      this.scene,
    );
    flame.position.set(entity.position.x, baseY + 0.55, entity.position.z);
    flame.scaling.y = 1.55;
    flame.material = this.#campfireFlameMaterial;
    flame.isPickable = false;
    flame.checkCollisions = false;

    const light = new PointLight(
      `player-campfire-light-${entity.id}`,
      new Vector3(entity.position.x, baseY + 0.72, entity.position.z),
      this.scene,
    );
    light.diffuse = new Color3(1, 0.36, 0.08);
    light.range = 6;
    return { meshes: Object.freeze([base, ...logs]), flame, light };
  }
}

export function collectStaticBuildingBounds(scene: Scene) {
  return Object.freeze(scene.meshes
    .filter((mesh) =>
      mesh.checkCollisions
      && mesh.isEnabled()
      && mesh.metadata?.buildingGroundSurface !== true)
    .map((mesh) => {
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      return Object.freeze({
        min: Object.freeze({ x: box.minimumWorld.x, y: box.minimumWorld.y, z: box.minimumWorld.z }),
        max: Object.freeze({ x: box.maximumWorld.x, y: box.maximumWorld.y, z: box.maximumWorld.z }),
      });
    }));
}

function createMaterial(scene: Scene, name: string, color: Color3): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.035, 0.03, 0.025);
  material.roughness = 0.96;
  return material;
}

function setCampfireVisualState(visual: BuildingVisual, lit: boolean): void {
  visual.flame?.setEnabled(lit);
  if (visual.light) visual.light.intensity = lit ? 1.4 : 0;
}
