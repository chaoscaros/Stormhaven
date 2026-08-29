import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import type { InteractionResult } from "../../interaction/InteractionResult";
import type { ItemCatalog } from "../../items/ItemCatalog";
import type { WorldPickupPlacement } from "./WorldPickupPlacement";

interface InteractionMeshMetadata {
  readonly interactionTargetId: string;
}

/** Primitive Pickup Mesh 与 Target ID 的 Babylon 窄适配层。 */
export class WorldPickupPresentation {
  readonly #meshes = new Map<string, AbstractMesh>();

  constructor(
    scene: Scene,
    placements: readonly WorldPickupPlacement[],
    catalog: ItemCatalog,
  ) {
    for (const placement of placements) {
      const mesh = createPickupMesh(scene, placement.pickup.itemId);
      mesh.name = `world-pickup-${placement.pickup.id}`;
      mesh.position.copyFromFloats(
        placement.position.x,
        placement.position.y,
        placement.position.z,
      );
      mesh.material = createPickupMaterial(scene, placement.pickup.itemId);
      mesh.metadata = Object.freeze({ interactionTargetId: placement.pickup.id });
      mesh.isPickable = true;
      mesh.checkCollisions = false;
      mesh.renderingGroupId = 1;
      this.#meshes.set(placement.pickup.id, mesh);
      catalog.get(placement.pickup.itemId);
    }
  }

  isInteractionMesh(mesh: AbstractMesh): boolean {
    const targetId = readTargetId(mesh.metadata);
    return targetId !== undefined && this.#meshes.get(targetId) === mesh;
  }

  getTargetId(mesh: AbstractMesh | null | undefined): string | undefined {
    if (!mesh) return undefined;
    const targetId = readTargetId(mesh.metadata);
    return targetId && this.#meshes.get(targetId) === mesh ? targetId : undefined;
  }

  applyInteractionResult(result: InteractionResult): void {
    if (!result.success || result.remainingQuantity > 0) return;
    const mesh = this.#meshes.get(result.targetId);
    if (!mesh) return;
    this.#meshes.delete(result.targetId);
    mesh.dispose(false, true);
  }

  dispose(): void {
    for (const mesh of this.#meshes.values()) mesh.dispose(false, true);
    this.#meshes.clear();
  }
}

function createPickupMesh(scene: Scene, itemId: string): AbstractMesh {
  switch (itemId) {
    case "wood":
      return MeshBuilder.CreateBox("pickup-wood", { width: 0.95, height: 0.24, depth: 0.38 }, scene);
    case "stone":
      return MeshBuilder.CreateSphere("pickup-stone", { diameter: 0.6, segments: 8 }, scene);
    case "stick": {
      const mesh = MeshBuilder.CreateCylinder(
        "pickup-stick",
        { height: 1.1, diameter: 0.14, tessellation: 8 },
        scene,
      );
      mesh.rotation.z = Math.PI / 2;
      return mesh;
    }
    case "canned_food":
      return MeshBuilder.CreateCylinder(
        "pickup-canned-food",
        { height: 0.56, diameter: 0.4, tessellation: 16 },
        scene,
      );
    case "water_bottle":
      return MeshBuilder.CreateCylinder(
        "pickup-water-bottle",
        { height: 0.8, diameterTop: 0.18, diameterBottom: 0.3, tessellation: 12 },
        scene,
      );
    default:
      return MeshBuilder.CreateBox("pickup-generic", { size: 0.45 }, scene);
  }
}

function createPickupMaterial(scene: Scene, itemId: string): StandardMaterial {
  const material = new StandardMaterial(`pickup-material-${itemId}`, scene);
  const color = pickupColor(itemId);
  material.diffuseColor = color;
  material.emissiveColor = color.scale(0.08);
  material.specularColor = new Color3(0.08, 0.09, 0.09);
  material.roughness = 0.86;
  return material;
}

function pickupColor(itemId: string): Color3 {
  switch (itemId) {
    case "wood": return new Color3(0.45, 0.25, 0.1);
    case "stick": return new Color3(0.38, 0.22, 0.1);
    case "stone": return new Color3(0.36, 0.4, 0.4);
    case "canned_food": return new Color3(0.65, 0.24, 0.12);
    case "water_bottle": return new Color3(0.16, 0.47, 0.58);
    default: return new Color3(0.55, 0.48, 0.32);
  }
}

function readTargetId(metadata: unknown): string | undefined {
  if (typeof metadata !== "object" || metadata === null) return undefined;
  const targetId = (metadata as Partial<InteractionMeshMetadata>).interactionTargetId;
  return typeof targetId === "string" ? targetId : undefined;
}
