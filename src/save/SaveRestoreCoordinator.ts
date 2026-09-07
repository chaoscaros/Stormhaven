import type { SaveRuntime } from "./SaveRuntime";
import { SaveSnapshotBuilder } from "./SaveSnapshotBuilder";
import type { SaveGameV1 } from "./schema/SaveGameV1";
import { orderBuildings } from "./schema/validateSaveGame";

export type RestoreStage = "读取存档" | "验证版本" | "恢复库存" | "恢复世界资源" | "恢复建筑" | "恢复生存状态" | "完成";
export type ReportRestoreStage = (stage: RestoreStage) => void | Promise<void>;

export class RestoreFailure extends Error {
  constructor(readonly recoveryRequired: boolean) { super("World restore failed"); }
}

/** Restores prevalidated source state; failures roll back the complete previous world. */
export class SaveRestoreCoordinator {
  constructor(private readonly runtime: SaveRuntime) {}

  async restore(data: SaveGameV1, stage: ReportRestoreStage): Promise<void> {
    const backup = new SaveSnapshotBuilder(this.runtime).capture(0);
    this.runtime.simulation.setPaused(true);
    try { await this.#apply(data, stage); }
    catch {
      try { await this.#apply(backup, () => undefined); }
      catch { throw new RestoreFailure(true); }
      throw new RestoreFailure(false);
    }
  }

  async #apply(data: SaveGameV1, stage: ReportRestoreStage): Promise<void> {
    const { gameplay, simulation, player, hotbar, presentation } = this.runtime;
    await stage("恢复库存");
    gameplay.inventory.replaceWithSnapshot({
      ...gameplay.inventory.snapshot, slots: data.inventory.slots.map((stack) => stack ?? undefined),
    });
    await stage("恢复世界资源");
    gameplay.pickupRegistry.restoreQuantities(data.pickups);
    presentation.restorePickups();
    await stage("恢复建筑");
    presentation.clearBuildings();
    gameplay.campfireSystem.clear();
    gameplay.worldBuildingRegistry.clear();
    const ordered = orderBuildings(data.buildings);
    for (const entity of ordered) {
      gameplay.worldBuildingRegistry.register(entity, gameplay.buildCatalog.get(entity.definitionId), entity.snapPointId ?? undefined);
    }
    presentation.restoreBuildings(ordered);
    // Babylon bindings normally register these; the fallback keeps headless Domain restoration identical.
    for (const state of data.campfires) {
      if (!gameplay.campfireSystem.has(state.id)) {
        gameplay.campfireSystem.register(state.worldBuildingId, gameplay.worldBuildingRegistry.get(state.worldBuildingId).position);
      }
      gameplay.campfireSystem.restoreState(state.id, state.fuelSecondsRemaining, state.status);
    }
    await stage("恢复生存状态");
    hotbar.restore(data.hotbar.slots, data.hotbar.selectedIndex);
    player.restoreTransform(data.player);
    simulation.restorePersistentState({ time: data.time, weather: data.weather, thermalReserve: data.player.thermalReserve }, data.player.position);
    presentation.refresh();
    await stage("完成");
  }
}
