export interface WorldPickup {
  readonly id: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly consumed: boolean;
}

export function createWorldPickup(
  id: string,
  itemId: string,
  quantity: number,
): WorldPickup {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("WorldPickup id 必须是非空字符串。");
  }
  if (typeof itemId !== "string" || itemId.trim().length === 0) {
    throw new Error("WorldPickup itemId 必须是非空字符串。");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("WorldPickup quantity 必须是大于 0 的整数。");
  }
  return Object.freeze({ id, itemId, quantity, consumed: false });
}
