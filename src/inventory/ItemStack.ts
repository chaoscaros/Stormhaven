export interface ItemStack {
  readonly itemId: string;
  readonly quantity: number;
}

export function createItemStack(itemId: string, quantity: number): ItemStack {
  if (typeof itemId !== "string" || itemId.trim().length === 0) {
    throw new Error("ItemStack itemId 必须是非空字符串。");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("ItemStack quantity 必须是大于 0 的整数。");
  }
  return Object.freeze({ itemId, quantity });
}
