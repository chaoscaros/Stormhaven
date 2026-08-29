import { createWorldPickup, type WorldPickup } from "./WorldPickup";

/** 世界 Pickup 剩余数量的纯领域 Registry；不持有 Babylon Mesh。 */
export class WorldPickupRegistry {
  readonly #pickups = new Map<string, WorldPickup>();

  constructor(pickups: readonly WorldPickup[]) {
    for (const pickup of pickups) {
      if (this.#pickups.has(pickup.id)) throw new Error(`WorldPickup ID 重复：${pickup.id}`);
      this.#pickups.set(pickup.id, createWorldPickup(
        pickup.id,
        pickup.itemId,
        pickup.quantity,
      ));
    }
  }

  get(id: string): WorldPickup | undefined {
    return this.#pickups.get(id);
  }

  consume(id: string, quantity: number): WorldPickup {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("WorldPickup consume quantity 必须是大于 0 的整数。");
    }
    const pickup = this.#pickups.get(id);
    if (!pickup) throw new Error(`不存在 WorldPickup ID：${id}`);
    if (quantity > pickup.quantity) {
      throw new Error(`WorldPickup ${id} 的消费数量超过剩余数量。`);
    }
    const remaining = pickup.quantity - quantity;
    const next = Object.freeze({
      id: pickup.id,
      itemId: pickup.itemId,
      quantity: remaining,
      consumed: remaining === 0,
    });
    this.#pickups.set(id, next);
    return next;
  }

  remove(id: string): boolean {
    return this.#pickups.delete(id);
  }
}
