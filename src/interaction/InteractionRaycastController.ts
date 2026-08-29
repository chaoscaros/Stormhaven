import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Scene } from "@babylonjs/core/scene";
import type { InventorySnapshot } from "../inventory/Inventory";
import type { WorldPickupPresentation } from "../world/pickups/WorldPickupPresentation";
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
    private readonly presentation: WorldPickupPresentation,
    private readonly callbacks: InteractionCallbacks,
  ) {
    window.addEventListener("keydown", this.#handleKeyDown);
  }

  update(): void {
    const ray = this.camera.getForwardRay(INTERACTION_CONFIG.maxDistanceMeters);
    const pick = this.scene.pickWithRay(
      ray,
      (mesh) => this.presentation.isInteractionMesh(mesh),
      false,
    );
    const targetId = pick?.hit
      ? this.presentation.getTargetId(pick.pickedMesh)
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
    const result = this.service.interact(this.#currentTarget.id);
    this.presentation.applyInteractionResult(result);
    this.callbacks.onInteraction(result, this.inventorySnapshot());
    this.#currentTarget = result.remainingQuantity > 0
      ? this.service.getTarget(result.targetId)
      : undefined;
    this.callbacks.onTargetChanged(this.#currentTarget);
  };
}

function sameTarget(
  current: InteractionTarget | undefined,
  next: InteractionTarget | undefined,
): boolean {
  return current?.id === next?.id && current?.quantity === next?.quantity;
}
