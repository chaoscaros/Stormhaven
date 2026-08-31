export type InteractionType = "pickup" | "campfire";

export interface PickupInteractionTarget {
  readonly id: string;
  readonly interactionType: "pickup";
  readonly displayName: string;
  readonly quantity: number;
}

export interface CampfireInteractionTarget {
  readonly id: string;
  readonly interactionType: "campfire";
  readonly displayName: string;
  readonly campfireId: string;
}

export type InteractionTarget = PickupInteractionTarget | CampfireInteractionTarget;

export interface InteractionTargetProvider {
  getInteractionTarget(targetId: string): InteractionTarget | undefined;
}

export function formatInteractionPrompt(target: InteractionTarget): string {
  if (target.interactionType === "campfire") return `[E] 使用 ${target.displayName}`;
  const quantity = target.quantity > 1 ? ` ×${target.quantity}` : "";
  return `[E] 拾取 ${target.displayName}${quantity}`;
}
