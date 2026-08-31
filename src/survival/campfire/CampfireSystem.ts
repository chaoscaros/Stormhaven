import type { InteractionTarget, InteractionTargetProvider } from "../../interaction/InteractionTarget";
import type { Inventory } from "../../inventory/Inventory";
import type { HeatSourceSystem } from "../heat/HeatSourceSystem";
import type { SpatialPoint } from "../environment/SpatialPoint";
import type { FuelCatalog } from "./FuelCatalog";
import type {
  CampfireActionResult,
  CampfireConfig,
  CampfireState,
  FuelTransactionReason,
  FuelTransactionResult,
} from "./CampfireTypes";

type CampfireListener = (state: CampfireState) => void;

/** 统一管理会话内 Campfire State、Fuel 生命周期与动态 HeatSource。 */
export class CampfireSystem implements InteractionTargetProvider {
  readonly #states = new Map<string, CampfireState>();
  readonly #buildingToCampfire = new Map<string, string>();
  readonly #targetToCampfire = new Map<string, string>();
  readonly #listeners = new Set<CampfireListener>();

  constructor(
    private readonly config: CampfireConfig,
    private readonly fuels: FuelCatalog,
    private readonly inventory: Inventory,
    private readonly heatSources: HeatSourceSystem,
  ) {}

  register(worldBuildingId: string, position: SpatialPoint): CampfireState {
    if (this.#buildingToCampfire.has(worldBuildingId)) {
      throw new Error(`WorldBuilding 已绑定 Campfire：${worldBuildingId}`);
    }
    const id = `campfire_${worldBuildingId}`;
    const heatSourceId = toHeatSourceId(id);
    this.heatSources.add({
      id: heatSourceId,
      profileId: this.config.heatSourceProfileId,
      position,
      enabled: false,
    });
    const state = freezeState({
      id,
      worldBuildingId,
      position,
      status: "unlit",
      fuelSecondsRemaining: 0,
      fuelCapacitySeconds: this.config.fuelCapacitySeconds,
      isLit: false,
    });
    this.#states.set(id, state);
    this.#buildingToCampfire.set(worldBuildingId, id);
    this.#targetToCampfire.set(toInteractionTargetId(id), id);
    this.#notify(state);
    return state;
  }

  removeByWorldBuildingId(worldBuildingId: string): boolean {
    const id = this.#buildingToCampfire.get(worldBuildingId);
    if (!id) return false;
    this.#buildingToCampfire.delete(worldBuildingId);
    this.#targetToCampfire.delete(toInteractionTargetId(id));
    this.#states.delete(id);
    this.heatSources.remove(toHeatSourceId(id));
    return true;
  }

  has(id: string): boolean {
    return this.#states.has(id);
  }

  get(id: string): CampfireState {
    const state = this.#states.get(id);
    if (!state) throw new Error(`不存在 Campfire ID：${id}`);
    return state;
  }

  getByWorldBuildingId(worldBuildingId: string): CampfireState | undefined {
    const id = this.#buildingToCampfire.get(worldBuildingId);
    return id ? this.#states.get(id) : undefined;
  }

  getAll(): readonly CampfireState[] {
    return Object.freeze([...this.#states.values()]);
  }

  getInteractionTarget(targetId: string): InteractionTarget | undefined {
    const campfireId = this.#targetToCampfire.get(targetId);
    const state = campfireId ? this.#states.get(campfireId) : undefined;
    if (!state) return undefined;
    return Object.freeze({
      id: targetId,
      interactionType: "campfire",
      displayName: "篝火",
      campfireId: state.id,
    });
  }

  getInteractionTargetId(worldBuildingId: string): string | undefined {
    const id = this.#buildingToCampfire.get(worldBuildingId);
    return id ? toInteractionTargetId(id) : undefined;
  }

  addFuel(campfireId: string, itemId: string, quantity = 1): FuelTransactionResult {
    const current = this.#states.get(campfireId);
    if (!current) return fuelFailure(campfireId, itemId, "unknown_campfire");
    if (!this.fuels.has(itemId)) {
      return fuelFailure(campfireId, itemId, "invalid_item", current.fuelSecondsRemaining);
    }
    const fuel = this.fuels.get(itemId);
    const addedSeconds = fuel.burnSecondsPerItem * quantity;
    if (
      !Number.isInteger(quantity)
      || quantity <= 0
      || current.fuelSecondsRemaining + addedSeconds > current.fuelCapacitySeconds
    ) {
      return fuelFailure(campfireId, itemId, "fuel_full", current.fuelSecondsRemaining);
    }
    if (!this.inventory.hasItem(itemId, quantity)) {
      return fuelFailure(campfireId, itemId, "no_fuel_item", current.fuelSecondsRemaining);
    }

    const draft = this.inventory.clone();
    if (draft.removeItem(itemId, quantity) !== quantity) {
      throw new Error("Fuel Transaction 的 Inventory 计划与草稿消耗不一致。");
    }
    const next = freezeState({
      ...current,
      status: current.isLit ? "burning" : "unlit",
      fuelSecondsRemaining: current.fuelSecondsRemaining + addedSeconds,
    });
    this.inventory.replaceWithSnapshot(draft.snapshot);
    this.#states.set(campfireId, next);
    this.#publish(current, next);
    return Object.freeze({
      success: true,
      campfireId,
      itemId,
      consumedQuantity: quantity,
      addedFuelSeconds: addedSeconds,
      remainingFuelSeconds: next.fuelSecondsRemaining,
      reason: "ok",
    });
  }

  ignite(campfireId: string): CampfireActionResult {
    const current = this.#states.get(campfireId);
    if (!current) return actionFailure(campfireId, "unknown_campfire");
    if (current.isLit) return actionFailure(campfireId, "already_lit");
    if (current.fuelSecondsRemaining <= 0) return actionFailure(campfireId, "no_fuel");
    const next = freezeState({ ...current, status: "burning", isLit: true });
    this.heatSources.setEnabled(toHeatSourceId(campfireId), true);
    this.#states.set(campfireId, next);
    this.#publish(current, next);
    return Object.freeze({ success: true, campfireId, reason: "ok" });
  }

  extinguish(campfireId: string): CampfireActionResult {
    const current = this.#states.get(campfireId);
    if (!current) return actionFailure(campfireId, "unknown_campfire");
    if (!current.isLit) return actionFailure(campfireId, "already_unlit");
    const next = freezeState({ ...current, status: "unlit", isLit: false });
    this.heatSources.setEnabled(toHeatSourceId(campfireId), false);
    this.#states.set(campfireId, next);
    this.#publish(current, next);
    return Object.freeze({ success: true, campfireId, reason: "ok" });
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new Error("Campfire deltaSeconds 必须是大于或等于 0 的有限数值。");
    }
    if (deltaSeconds === 0) return;
    for (const [id, current] of this.#states) {
      if (!current.isLit) continue;
      const remaining = Math.max(0, current.fuelSecondsRemaining - deltaSeconds);
      const exhausted = remaining === 0;
      const next = freezeState({
        ...current,
        status: exhausted ? "out_of_fuel" : "burning",
        fuelSecondsRemaining: remaining,
        isLit: !exhausted,
      });
      if (exhausted) this.heatSources.setEnabled(toHeatSourceId(id), false);
      this.#states.set(id, next);
      this.#publish(current, next);
    }
  }

  updatePosition(campfireId: string, position: SpatialPoint): void {
    const current = this.get(campfireId);
    const next = freezeState({ ...current, position });
    this.heatSources.updatePosition(toHeatSourceId(campfireId), position);
    this.#states.set(campfireId, next);
    this.#publish(current, next);
  }

  subscribe(listener: CampfireListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  dispose(): void {
    for (const id of this.#states.keys()) this.heatSources.remove(toHeatSourceId(id));
    this.#states.clear();
    this.#buildingToCampfire.clear();
    this.#targetToCampfire.clear();
    this.#listeners.clear();
  }

  #publish(previous: CampfireState, next: CampfireState): void {
    if (
      previous.status !== next.status
      || Math.floor(previous.fuelSecondsRemaining) !== Math.floor(next.fuelSecondsRemaining)
    ) this.#notify(next);
  }

  #notify(state: CampfireState): void {
    for (const listener of this.#listeners) listener(state);
  }
}

function freezeState(state: CampfireState): CampfireState {
  return Object.freeze({ ...state, position: Object.freeze({ ...state.position }) });
}

function toHeatSourceId(campfireId: string): string {
  return `heat:${campfireId}`;
}

function toInteractionTargetId(campfireId: string): string {
  return `interaction:${campfireId}`;
}

function fuelFailure(
  campfireId: string,
  itemId: string,
  reason: FuelTransactionReason,
  remainingFuelSeconds = 0,
): FuelTransactionResult {
  return Object.freeze({
    success: false,
    campfireId,
    itemId,
    consumedQuantity: 0,
    addedFuelSeconds: 0,
    remainingFuelSeconds,
    reason,
  });
}

function actionFailure(
  campfireId: string,
  reason: CampfireActionResult["reason"],
): CampfireActionResult {
  return Object.freeze({ success: false, campfireId, reason });
}
