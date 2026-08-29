export interface InventoryConfig {
  readonly maxSlots: number;
  readonly maxWeightKilograms: number;
}

export const PLAYER_INVENTORY_CONFIG: Readonly<InventoryConfig> = Object.freeze({
  maxSlots: 24,
  maxWeightKilograms: 30,
});
