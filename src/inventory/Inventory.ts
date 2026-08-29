import type { ItemCatalog } from "../items/ItemCatalog";
import { createItemStack, type ItemStack } from "./ItemStack";
import type { InventoryConfig } from "./InventoryConfig";

export type InventoryAddReason = "ok" | "inventory_full" | "too_heavy";

export interface InventoryAddResult {
  readonly requestedQuantity: number;
  readonly acceptedQuantity: number;
  readonly remainingQuantity: number;
  readonly reason: InventoryAddReason;
}

export interface InventorySnapshot {
  readonly slots: readonly (ItemStack | undefined)[];
  readonly usedSlots: number;
  readonly maxSlots: number;
  readonly totalWeightKilograms: number;
  readonly maxWeightKilograms: number;
}

/** 固定 Slot + Weight 的纯 Inventory Domain；不依赖 UI、DOM 或 Babylon。 */
export class Inventory {
  readonly #slots: (ItemStack | undefined)[];

  constructor(
    private readonly catalog: ItemCatalog,
    private readonly config: InventoryConfig,
  ) {
    if (!Number.isInteger(config.maxSlots) || config.maxSlots <= 0) {
      throw new Error("Inventory maxSlots 必须是大于 0 的整数。");
    }
    if (!Number.isFinite(config.maxWeightKilograms) || config.maxWeightKilograms < 0) {
      throw new Error("Inventory maxWeightKilograms 必须是非负有限数值。");
    }
    this.#slots = Array.from({ length: config.maxSlots });
  }

  get snapshot(): InventorySnapshot {
    return Object.freeze({
      slots: Object.freeze(this.#slots.map((stack) =>
        stack ? createItemStack(stack.itemId, stack.quantity) : undefined)),
      usedSlots: this.getUsedSlots(),
      maxSlots: this.config.maxSlots,
      totalWeightKilograms: this.getTotalWeight(),
      maxWeightKilograms: this.config.maxWeightKilograms,
    });
  }

  /** 为事务规划创建完全独立的草稿；修改草稿不会影响原 Inventory。 */
  clone(): Inventory {
    const clone = new Inventory(this.catalog, this.config);
    clone.replaceWithSnapshot(this.snapshot);
    return clone;
  }

  /** 完整校验候选 Snapshot 后一次替换，用作已验证事务的 Commit 边界。 */
  replaceWithSnapshot(snapshot: InventorySnapshot): void {
    if (snapshot.slots.length !== this.config.maxSlots) {
      throw new Error("Inventory Snapshot Slot 数量与配置不一致。");
    }
    const nextSlots = snapshot.slots.map((stack, index) => {
      if (!stack) return undefined;
      const definition = this.catalog.get(stack.itemId);
      if (!Number.isInteger(stack.quantity) || stack.quantity <= 0) {
        throw new Error(`Inventory Snapshot Slot[${index}] quantity 非法。`);
      }
      if (stack.quantity > definition.stackSize) {
        throw new Error(`Inventory Snapshot Slot[${index}] 超过 Stack Size。`);
      }
      return createItemStack(stack.itemId, stack.quantity);
    });
    const totalWeight = nextSlots.reduce((total, stack) =>
      total + (stack ? this.catalog.get(stack.itemId).weight * stack.quantity : 0), 0);
    if (totalWeight > this.config.maxWeightKilograms + Number.EPSILON) {
      throw new Error("Inventory Snapshot 超过最大负重。");
    }
    this.#slots.splice(0, this.#slots.length, ...nextSlots);
  }

  canAddItem(itemId: string, quantity: number): InventoryAddResult {
    assertPositiveQuantity(quantity, "Inventory add quantity");
    const definition = this.catalog.get(itemId);
    const stackCapacity = this.#slots.reduce((capacity, stack) => {
      if (!stack) return capacity + definition.stackSize;
      if (stack.itemId !== itemId) return capacity;
      return capacity + definition.stackSize - stack.quantity;
    }, 0);
    const remainingWeight = Math.max(
      0,
      this.config.maxWeightKilograms - this.getTotalWeight(),
    );
    const weightCapacity = definition.weight === 0
      ? Number.POSITIVE_INFINITY
      : Math.max(0, Math.floor((remainingWeight + Number.EPSILON) / definition.weight));
    const acceptedQuantity = Math.min(quantity, stackCapacity, weightCapacity);
    const reason: InventoryAddReason = acceptedQuantity > 0
      ? "ok"
      : stackCapacity === 0
        ? "inventory_full"
        : "too_heavy";
    return Object.freeze({
      requestedQuantity: quantity,
      acceptedQuantity,
      remainingQuantity: quantity - acceptedQuantity,
      reason,
    });
  }

  addItem(itemId: string, quantity: number): InventoryAddResult {
    const result = this.canAddItem(itemId, quantity);
    let remaining = result.acceptedQuantity;
    const definition = this.catalog.get(itemId);

    for (let index = 0; index < this.#slots.length && remaining > 0; index += 1) {
      const stack = this.#slots[index];
      if (!stack || stack.itemId !== itemId || stack.quantity >= definition.stackSize) continue;
      const added = Math.min(remaining, definition.stackSize - stack.quantity);
      this.#slots[index] = createItemStack(itemId, stack.quantity + added);
      remaining -= added;
    }

    for (let index = 0; index < this.#slots.length && remaining > 0; index += 1) {
      if (this.#slots[index]) continue;
      const added = Math.min(remaining, definition.stackSize);
      this.#slots[index] = createItemStack(itemId, added);
      remaining -= added;
    }

    if (remaining !== 0) throw new Error("Inventory Add 计划与实际写入不一致。");
    return result;
  }

  removeItem(itemId: string, quantity: number): number {
    assertPositiveQuantity(quantity, "Inventory remove quantity");
    this.catalog.get(itemId);
    let remaining = quantity;
    for (let index = this.#slots.length - 1; index >= 0 && remaining > 0; index -= 1) {
      const stack = this.#slots[index];
      if (!stack || stack.itemId !== itemId) continue;
      const removed = Math.min(remaining, stack.quantity);
      const nextQuantity = stack.quantity - removed;
      this.#slots[index] = nextQuantity > 0
        ? createItemStack(itemId, nextQuantity)
        : undefined;
      remaining -= removed;
    }
    return quantity - remaining;
  }

  moveStack(sourceIndex: number, targetIndex: number): boolean {
    this.#assertSlotIndex(sourceIndex);
    this.#assertSlotIndex(targetIndex);
    if (sourceIndex === targetIndex || !this.#slots[sourceIndex]) return false;
    [this.#slots[sourceIndex], this.#slots[targetIndex]] = [
      this.#slots[targetIndex],
      this.#slots[sourceIndex],
    ];
    return true;
  }

  mergeStacks(sourceIndex: number, targetIndex: number): number {
    this.#assertSlotIndex(sourceIndex);
    this.#assertSlotIndex(targetIndex);
    if (sourceIndex === targetIndex) return 0;
    const source = this.#slots[sourceIndex];
    const target = this.#slots[targetIndex];
    if (!source || !target || source.itemId !== target.itemId) return 0;
    const maximum = this.catalog.get(source.itemId).stackSize;
    const moved = Math.min(source.quantity, maximum - target.quantity);
    if (moved <= 0) return 0;
    this.#slots[targetIndex] = createItemStack(target.itemId, target.quantity + moved);
    this.#slots[sourceIndex] = source.quantity === moved
      ? undefined
      : createItemStack(source.itemId, source.quantity - moved);
    return moved;
  }

  splitStack(sourceIndex: number, targetIndex: number, quantity: number): boolean {
    this.#assertSlotIndex(sourceIndex);
    this.#assertSlotIndex(targetIndex);
    assertPositiveQuantity(quantity, "Inventory split quantity");
    const source = this.#slots[sourceIndex];
    if (
      sourceIndex === targetIndex
      || !source
      || this.#slots[targetIndex]
      || quantity >= source.quantity
    ) return false;
    this.#slots[sourceIndex] = createItemStack(source.itemId, source.quantity - quantity);
    this.#slots[targetIndex] = createItemStack(source.itemId, quantity);
    return true;
  }

  getTotalWeight(): number {
    return this.#slots.reduce((total, stack) =>
      total + (stack ? this.catalog.get(stack.itemId).weight * stack.quantity : 0), 0);
  }

  getUsedSlots(): number {
    return this.#slots.reduce((count, stack) => count + (stack ? 1 : 0), 0);
  }

  hasItem(itemId: string, quantity = 1): boolean {
    assertPositiveQuantity(quantity, "Inventory has quantity");
    return this.getItemCount(itemId) >= quantity;
  }

  getItemCount(itemId: string): number {
    this.catalog.get(itemId);
    return this.#slots.reduce((total, stack) =>
      total + (stack?.itemId === itemId ? stack.quantity : 0), 0);
  }

  #assertSlotIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.#slots.length) {
      throw new Error(`Inventory Slot Index 越界：${index}`);
    }
  }
}

function assertPositiveQuantity(quantity: number, label: string): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`${label} 必须是大于 0 的整数。`);
  }
}
