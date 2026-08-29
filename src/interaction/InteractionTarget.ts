export type InteractionType = "pickup";

export interface InteractionTarget {
  readonly id: string;
  readonly interactionType: InteractionType;
  readonly displayName: string;
  readonly quantity: number;
}

export function formatInteractionPrompt(target: InteractionTarget): string {
  const quantity = target.quantity > 1 ? ` ×${target.quantity}` : "";
  return `[E] 拾取 ${target.displayName}${quantity}`;
}
