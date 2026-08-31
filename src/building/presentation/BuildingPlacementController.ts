import type { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { BUILDING_CONFIG, BUILDING_INPUT_CONFIG } from "../BuildingConfig";
import type { BuildCatalog } from "../BuildCatalog";
import type { BuildService } from "../BuildService";
import type {
  BuildFailureReason,
  BuildPlacement,
  BuildingVector3,
  SnapPoint,
} from "../BuildingTypes";
import type { PlacementValidator } from "../PlacementValidator";
import type { WorldBuildingRegistry } from "../WorldBuildingRegistry";
import type { GameUiModeController } from "../../ui/GameUiModeController";

interface PlacementCallbacks {
  readonly onStatus: (message: string, valid: boolean) => void;
  readonly onExit: () => void;
  readonly onInventoryChanged: () => void;
}

/** 单一 Ghost 的 Babylon 放置适配器；领域校验与事务均委托给纯 Service。 */
export class BuildingPlacementController {
  readonly #validMaterial: StandardMaterial;
  readonly #invalidMaterial: StandardMaterial;
  #selectedDefinitionId: string | undefined;
  #rotationDegrees = 0;
  #ghost: Mesh | undefined;
  #candidate: BuildPlacement | undefined;

  constructor(
    private readonly scene: Scene,
    private readonly camera: UniversalCamera,
    private readonly canvas: HTMLCanvasElement,
    private readonly definitions: BuildCatalog,
    private readonly registry: WorldBuildingRegistry,
    private readonly validator: PlacementValidator,
    private readonly service: BuildService,
    private readonly presentation: import("./BuildingPresentation").BuildingPresentation,
    private readonly modes: GameUiModeController,
    private readonly callbacks: PlacementCallbacks,
  ) {
    this.#validMaterial = createGhostMaterial(
      "building-ghost-valid-material",
      new Color3(0.63, 0.78, 0.73),
      scene,
    );
    this.#invalidMaterial = createGhostMaterial(
      "building-ghost-invalid-material",
      new Color3(0.78, 0.28, 0.22),
      scene,
    );
    window.addEventListener("keydown", this.#handleKeyDown);
    canvas.addEventListener("pointerdown", this.#handlePointerDown);
    document.addEventListener("pointerlockchange", this.#handlePointerLockChange);
  }

  begin(definitionId: string): void {
    const definition = this.definitions.get(definitionId);
    this.#selectedDefinitionId = definition.id;
    this.#rotationDegrees = 0;
    this.#createGhost();
    this.modes.enterBuildPlacement();
  }

  update(): void {
    if (this.modes.mode !== "build_placement" || !this.#selectedDefinitionId || !this.#ghost) {
      return;
    }
    const definition = this.definitions.get(this.#selectedDefinitionId);
    const rawCandidate = this.#createRayCandidate(definition.category);
    this.#candidate = rawCandidate;
    const playerPosition = toPlainVector(this.camera.globalPosition);
    const validation = this.validator.validate(definition, {
      playerPosition,
      candidate: rawCandidate,
    });
    const displayPlacement = validation.placement ?? rawCandidate;
    this.#ghost.position.copyFromFloats(
      displayPlacement.position.x,
      displayPlacement.position.y,
      displayPlacement.position.z,
    );
    this.#ghost.rotation.y = displayPlacement.rotationDegrees * Math.PI / 180;
    const plan = this.service.plan({
      definitionId: definition.id,
      playerPosition,
      placement: rawCandidate,
    });
    const valid = validation.valid && plan.canCommit;
    this.#ghost.material = valid ? this.#validMaterial : this.#invalidMaterial;
    this.callbacks.onStatus(
      valid
        ? `${definition.displayName} · 左键放置 · R 旋转 · B / Esc 退出`
        : formatFailure(plan.reason === "ok" ? validation.reason : plan.reason),
      valid,
    );
  }

  dispose(): void {
    window.removeEventListener("keydown", this.#handleKeyDown);
    this.canvas.removeEventListener("pointerdown", this.#handlePointerDown);
    document.removeEventListener("pointerlockchange", this.#handlePointerLockChange);
    this.#ghost?.dispose(false, false);
    this.#validMaterial.dispose();
    this.#invalidMaterial.dispose();
  }

  readonly #handlePointerDown = (event: PointerEvent): void => {
    if (
      event.button !== 0
      || this.modes.mode !== "build_placement"
      || document.pointerLockElement !== this.canvas
      || !this.#selectedDefinitionId
      || !this.#candidate
    ) return;
    const result = this.service.place({
      definitionId: this.#selectedDefinitionId,
      playerPosition: toPlainVector(this.camera.globalPosition),
      placement: this.#candidate,
    }, this.presentation);
    if (result.success) {
      this.callbacks.onInventoryChanged();
      this.callbacks.onStatus("建造完成 · 可继续放置同类结构", true);
    } else {
      this.callbacks.onStatus(formatFailure(result.reason), false);
    }
  };

  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || this.modes.mode !== "build_placement") return;
    if (
      event.code === BUILDING_INPUT_CONFIG.toggleKeyCode
      || event.code === BUILDING_INPUT_CONFIG.cancelKeyCode
    ) {
      event.preventDefault();
      this.#exitPlacement();
      return;
    }
    if (event.code === BUILDING_INPUT_CONFIG.rotateKeyCode && this.#selectedDefinitionId) {
      event.preventDefault();
      const definition = this.definitions.get(this.#selectedDefinitionId);
      this.#rotationDegrees = (this.#rotationDegrees + definition.rotationStep) % 360;
    }
  };

  readonly #handlePointerLockChange = (): void => {
    if (
      this.modes.mode === "build_placement"
      && document.pointerLockElement !== this.canvas
    ) {
      this.#clearPlacement();
      this.modes.returnToGameplayUnlocked();
    }
  };

  #exitPlacement(): void {
    this.#clearPlacement();
    this.modes.resumeGameplay();
  }

  #clearPlacement(): void {
    this.#selectedDefinitionId = undefined;
    this.#candidate = undefined;
    this.#ghost?.dispose(false, false);
    this.#ghost = undefined;
    this.callbacks.onExit();
  }

  #createGhost(): void {
    this.#ghost?.dispose(false, false);
    if (!this.#selectedDefinitionId) return;
    const definition = this.definitions.get(this.#selectedDefinitionId);
    this.#ghost = MeshBuilder.CreateBox(
      "building-placement-ghost",
      { width: definition.size.x, height: definition.size.y, depth: definition.size.z },
      this.scene,
    );
    this.#ghost.isPickable = false;
    this.#ghost.checkCollisions = false;
    this.#ghost.material = this.#invalidMaterial;
    this.#ghost.renderingGroupId = 1;
  }

  #createRayCandidate(category: "foundation" | "wall"): BuildPlacement {
    const ray = this.camera.getForwardRay(BUILDING_CONFIG.maximumBuildDistanceMeters + 0.5);
    const pick = this.scene.pickWithRay(ray, (mesh) =>
      mesh.name === "snow-ground" || typeof mesh.metadata?.buildingEntityId === "string");
    const fallbackPosition = ray.origin.add(ray.direction.scale(BUILDING_CONFIG.maximumBuildDistanceMeters));
    const point = pick?.pickedPoint ?? fallbackPosition;
    if (category === "foundation") {
      return Object.freeze({
        position: toPlainVector(point),
        rotationDegrees: this.#rotationDegrees,
        surface: pick?.pickedMesh?.name === "snow-ground" ? "ground" : "none",
      });
    }
    const nearest = findNearestWallSnapPoint(
      toPlainVector(point),
      this.registry.getSnapPoints("wall"),
      BUILDING_CONFIG.wallSnapSearchRadiusMeters,
    );
    return Object.freeze({
      position: nearest?.position ?? toPlainVector(point),
      rotationDegrees: nearest?.rotationDegrees ?? this.#rotationDegrees,
      surface: nearest ? "building" : "none",
      ...(nearest ? { snapPointId: nearest.id } : {}),
    });
  }
}

function createGhostMaterial(name: string, color: Color3, scene: Scene): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.emissiveColor = color.scale(0.2);
  material.specularColor = Color3.Black();
  material.alpha = 0.42;
  material.disableDepthWrite = false;
  return material;
}

function findNearestWallSnapPoint(
  position: BuildingVector3,
  points: readonly SnapPoint[],
  maximumDistance: number,
): SnapPoint | undefined {
  let nearest: SnapPoint | undefined;
  let nearestDistance = maximumDistance;
  for (const point of points) {
    const distance = Math.hypot(
      point.position.x - position.x,
      point.position.y - position.y,
      point.position.z - position.z,
    );
    if (distance <= nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function toPlainVector(vector: Vector3): BuildingVector3 {
  return Object.freeze({ x: vector.x, y: vector.y, z: vector.z });
}

function formatFailure(reason: BuildFailureReason | string): string {
  switch (reason) {
    case "not_enough_resources": return "材料不足";
    case "blocked": return "位置被占用";
    case "unsupported": return "当前结构缺少支撑";
    case "snap_required": return "墙体需要连接到地基边缘";
    case "snap_occupied": return "该地基边缘已经被占用";
    case "out_of_range": return "超出 5 米建造距离";
    case "invalid_surface": return "需要对准可用地面";
    case "presentation_failed": return "建筑表现创建失败，材料未消耗";
    default: return "当前位置不可建造";
  }
}
