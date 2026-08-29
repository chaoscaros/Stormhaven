export type InteractionResultReason =
  | "ok"
  | "inventory_full"
  | "too_heavy"
  | "invalid_target"
  | "unknown_item"
  | "out_of_range";

export interface InteractionResult {
  readonly success: boolean;
  readonly reason: InteractionResultReason;
  readonly targetId: string;
  readonly itemId?: string;
  readonly requestedQuantity: number;
  readonly acceptedQuantity: number;
  readonly remainingQuantity: number;
}
