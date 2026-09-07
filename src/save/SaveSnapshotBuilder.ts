import schedule from "../../data/weather/first-blizzard-schedule.json";
import type { SaveRuntime } from "./SaveRuntime";
import { SAVE_SCHEMA_VERSION, SAVE_SLOT_ID, type SaveGameV1 } from "./schema/SaveGameV1";

export class SaveSnapshotBuilder {
  constructor(private readonly runtime: SaveRuntime) {}

  capture(now: number, createdAt = now): SaveGameV1 {
    const { gameplay, simulation, player, hotbar } = this.runtime;
    const state = simulation.capturePersistentState();
    const transform = player.captureTransform();
    return {
      version: SAVE_SCHEMA_VERSION,
      metadata: { saveId: SAVE_SLOT_ID, scenarioId: schedule.scenarioId, createdAt, updatedAt: now },
      player: {
        position: { ...transform.position }, rotation: { ...transform.rotation },
        thermalReserve: state.thermalReserve,
      },
      time: state.time, weather: state.weather,
      inventory: { slots: gameplay.inventory.snapshot.slots.map((stack) => stack ? { ...stack } : null) },
      // Fully consumed pickups leave the live registry; retain their scenario IDs as zero in saves.
      pickups: gameplay.pickupPlacements.map(({ pickup }) => ({
        id: pickup.id, quantity: gameplay.pickupRegistry.get(pickup.id)?.quantity ?? 0,
      })),
      buildings: [...gameplay.worldBuildingRegistry.getAll()].sort((a, b) => a.id.localeCompare(b.id)).map((entity) => ({
        ...entity, position: { ...entity.position },
        snapPointId: gameplay.worldBuildingRegistry.getConsumedSnapPointId(entity.id) ?? null,
      })),
      campfires: gameplay.campfireSystem.getAll().map(({ id, worldBuildingId, fuelSecondsRemaining, status }) => ({
        id, worldBuildingId, fuelSecondsRemaining, status,
      })),
      hotbar: {
        slots: hotbar.slots.map((slot) => ({ slotIndex: slot.slotIndex, entry: { ...slot.entry } })),
        selectedIndex: hotbar.selectedIndex,
      },
    };
  }
}
