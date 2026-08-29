import type { Inventory } from "../inventory/Inventory";
import type { ItemCatalog } from "../items/ItemCatalog";
import type { WorldPickupRegistry } from "../world/pickups/WorldPickupRegistry";
import type { InteractionResult } from "./InteractionResult";
import type { InteractionTarget } from "./InteractionTarget";

/** Interaction Target ID → Pickup Transaction 的纯应用服务。 */
export class InteractionService {
  constructor(
    private readonly catalog: ItemCatalog,
    private readonly inventory: Inventory,
    private readonly pickups: WorldPickupRegistry,
  ) {}

  getTarget(targetId: string): InteractionTarget | undefined {
    const pickup = this.pickups.get(targetId);
    if (!pickup || pickup.consumed || !this.catalog.has(pickup.itemId)) return undefined;
    return Object.freeze({
      id: pickup.id,
      interactionType: "pickup",
      displayName: this.catalog.get(pickup.itemId).displayName,
      quantity: pickup.quantity,
    });
  }

  interact(targetId: string): InteractionResult {
    const pickup = this.pickups.get(targetId);
    if (!pickup || pickup.consumed) return failure(targetId, "invalid_target");
    if (!this.catalog.has(pickup.itemId)) {
      return failure(targetId, "unknown_item", pickup.quantity, pickup.itemId);
    }

    const plan = this.inventory.canAddItem(pickup.itemId, pickup.quantity);
    if (plan.acceptedQuantity === 0) {
      return Object.freeze({
        success: false,
        reason: plan.reason,
        targetId,
        itemId: pickup.itemId,
        requestedQuantity: pickup.quantity,
        acceptedQuantity: 0,
        remainingQuantity: pickup.quantity,
      });
    }

    const added = this.inventory.addItem(pickup.itemId, plan.acceptedQuantity);
    if (added.acceptedQuantity !== plan.acceptedQuantity) {
      throw new Error("Pickup Transaction 的 Inventory 计划与写入不一致。");
    }
    const nextPickup = this.pickups.consume(targetId, added.acceptedQuantity);
    if (nextPickup.consumed) this.pickups.remove(targetId);
    return Object.freeze({
      success: true,
      reason: "ok",
      targetId,
      itemId: pickup.itemId,
      requestedQuantity: pickup.quantity,
      acceptedQuantity: added.acceptedQuantity,
      remainingQuantity: nextPickup.quantity,
    });
  }
}

function failure(
  targetId: string,
  reason: "invalid_target" | "unknown_item",
  remainingQuantity = 0,
  itemId?: string,
): InteractionResult {
  return Object.freeze({
    success: false,
    reason,
    targetId,
    ...(itemId ? { itemId } : {}),
    requestedQuantity: remainingQuantity,
    acceptedQuantity: 0,
    remainingQuantity,
  });
}
