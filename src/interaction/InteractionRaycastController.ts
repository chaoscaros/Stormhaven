import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Scene } from "@babylonjs/core/scene";
import type { InventorySnapshot } from "../inventory/Inventory";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { INTERACTION_CONFIG } from "./InteractionConfig";
import type { InteractionResult } from "./InteractionResult";
import type { InteractionService } from "./InteractionService";
import type { InteractionTarget } from "./InteractionTarget";

export interface InteractionCallbacks {
  readonly isInteractionBlocked?: () => boolean;
  readonly onTargetChanged: (target?: InteractionTarget) => void;
  readonly onInteraction: (
    result: InteractionResult,
    inventory: InventorySnapshot,
  ) => void;
  readonly onUseTarget?: (target: InteractionTarget) => void;
}

export interface InteractionMeshSource {
  isInteractionMesh(mesh: AbstractMesh): boolean;
  getTargetId(mesh: AbstractMesh | null | undefined): string | undefined;
  applyInteractionResult?(result: InteractionResult): void;
}

/** Camera Forward Ray → Interaction Target ID；只负责 Babylon Picking 与输入生命周期。 */
export class InteractionRaycastController {
  #currentTarget: InteractionTarget | undefined;

  constructor(
    private readonly scene: Scene,
    private readonly camera: Camera,
    private readonly canvas: HTMLCanvasElement,
    private readonly service: InteractionService,
    private readonly inventorySnapshot: () => InventorySnapshot,
    private readonly presentations: readonly InteractionMeshSource[],
    private readonly callbacks: InteractionCallbacks,
  ) {
    window.addEventListener("keydown", this.#handleKeyDown);
  }

  update(): void {
    const ray = this.camera.getForwardRay(INTERACTION_CONFIG.maxDistanceMeters);
    // 先命中场景最近的可拾取 Mesh，实体墙体才能正确阻挡其后的交互目标。
    const pick = this.scene.pickWithRay(ray, undefined, false);
    const targetId = pick?.hit
      ? this.#getTargetId(pick.pickedMesh)
      : undefined;
    const nextTarget = targetId ? this.service.getTarget(targetId) : undefined;
    if (!sameTarget(this.#currentTarget, nextTarget)) {
      this.#currentTarget = nextTarget;
      this.callbacks.onTargetChanged(nextTarget);
    }
  }

  dispose(): void {
    window.removeEventListener("keydown", this.#handleKeyDown);
    this.#currentTarget = undefined;
    this.callbacks.onTargetChanged(undefined);
  }

  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    if (
      event.code !== INTERACTION_CONFIG.interactKeyCode
      || event.repeat
      || document.pointerLockElement !== this.canvas
      || this.callbacks.isInteractionBlocked?.()
      || !this.#currentTarget
    ) return;
    event.preventDefault();
    if (this.#currentTarget.interactionType !== "pickup") {
      this.callbacks.onUseTarget?.(this.#currentTarget);
      return;
    }
    const result = this.service.interact(this.#currentTarget.id);
    for (const presentation of this.presentations) presentation.applyInteractionResult?.(result);
    this.callbacks.onInteraction(result, this.inventorySnapshot());
    this.#currentTarget = result.remainingQuantity > 0
      ? this.service.getTarget(result.targetId)
      : undefined;
    this.callbacks.onTargetChanged(this.#currentTarget);
  };

  #getTargetId(mesh: AbstractMesh | null | undefined): string | undefined {
    for (const presentation of this.presentations) {
      const id = presentation.getTargetId(mesh);
      if (id) return id;
    }
    return undefined;
  }
}

function sameTarget(
  current: InteractionTarget | undefined,
  next: InteractionTarget | undefined,
): boolean {
  if (current?.id !== next?.id || current?.interactionType !== next?.interactionType) return false;
  if (current?.interactionType === "pickup" && next?.interactionType === "pickup") {
    return current.quantity === next.quantity;
  }
  return true;
}
