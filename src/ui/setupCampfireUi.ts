import type { Inventory } from "../inventory/Inventory";
import type { ItemCatalog } from "../items/ItemCatalog";
import type { CampfireSystem } from "../survival/campfire/CampfireSystem";
import type { CampfireState } from "../survival/campfire/CampfireTypes";
import type { FuelCatalog } from "../survival/campfire/FuelCatalog";
import type { GameUiModeController } from "./GameUiModeController";

export interface CampfireUi {
  open(campfireId: string): void;
  refresh(): void;
  dispose(): void;
}

interface CampfireUiCallbacks {
  readonly onInventoryChanged: () => void;
}

const STATUS_LABELS = Object.freeze({
  unlit: "未点燃",
  burning: "燃烧中",
  out_of_fuel: "燃料耗尽",
});

/** 鼠标优先的篝火控制面板；规则与事务全部委托给 CampfireSystem。 */
export function setupCampfireUi(
  campfires: CampfireSystem,
  fuels: FuelCatalog,
  inventory: Inventory,
  items: ItemCatalog,
  modes: GameUiModeController,
  callbacks: CampfireUiCallbacks,
): CampfireUi {
  const panel = getElement("campfire-panel");
  const closeButton = getElement<HTMLButtonElement>("campfire-close-button");
  const status = getElement("campfire-status");
  const fuelRemaining = getElement("campfire-fuel-remaining");
  const fuelCapacity = getElement("campfire-fuel-capacity");
  const inventoryFuel = getElement("campfire-inventory-fuel");
  const addFuelButton = getElement<HTMLButtonElement>("campfire-add-fuel-button");
  const igniteButton = getElement<HTMLButtonElement>("campfire-ignite-button");
  const extinguishButton = getElement<HTMLButtonElement>("campfire-extinguish-button");
  const feedback = getElement("campfire-feedback");
  const fuel = fuels.getAll()[0];
  if (!fuel) throw new Error("Campfire Menu 至少需要一个 FuelDefinition。");
  let activeCampfireId: string | undefined;

  const getActiveState = (): CampfireState | undefined =>
    activeCampfireId && campfires.has(activeCampfireId)
      ? campfires.get(activeCampfireId)
      : undefined;

  const render = (): void => {
    const state = getActiveState();
    if (!state) return;
    const availableFuel = inventory.getItemCount(fuel.itemId);
    const canFitFuel = state.fuelSecondsRemaining + fuel.burnSecondsPerItem
      <= state.fuelCapacitySeconds;
    setTextIfChanged(status, STATUS_LABELS[state.status]);
    status.dataset.status = state.status;
    setTextIfChanged(fuelRemaining, `${Math.ceil(state.fuelSecondsRemaining)}`);
    setTextIfChanged(fuelCapacity, `${state.fuelCapacitySeconds} 秒`);
    setTextIfChanged(
      inventoryFuel,
      `${items.get(fuel.itemId).displayName} ×${availableFuel}`,
    );
    addFuelButton.disabled = availableFuel < 1 || !canFitFuel;
    igniteButton.disabled = state.isLit || state.fuelSecondsRemaining <= 0;
    extinguishButton.disabled = !state.isLit;
  };

  const showFeedback = (message: string, success: boolean): void => {
    feedback.textContent = message;
    feedback.dataset.tone = success ? "success" : "warning";
    feedback.hidden = false;
  };

  const addFuel = (): void => {
    const state = getActiveState();
    if (!state) return;
    const result = campfires.addFuel(state.id, fuel.itemId, 1);
    showFeedback(formatFuelResult(result.reason, items.get(fuel.itemId).displayName), result.success);
    if (result.success) callbacks.onInventoryChanged();
    render();
  };

  const ignite = (): void => {
    const state = getActiveState();
    if (!state) return;
    const result = campfires.ignite(state.id);
    showFeedback(result.success ? "篝火已点燃" : "点燃失败：请先添加燃料", result.success);
    render();
  };

  const extinguish = (): void => {
    const state = getActiveState();
    if (!state) return;
    const result = campfires.extinguish(state.id);
    showFeedback(result.success ? "篝火已熄灭，剩余燃料已保留" : "篝火当前未燃烧", result.success);
    render();
  };

  const close = (): void => {
    activeCampfireId = undefined;
    modes.resumeGameplay();
  };

  closeButton.addEventListener("click", close);
  addFuelButton.addEventListener("click", addFuel);
  igniteButton.addEventListener("click", ignite);
  extinguishButton.addEventListener("click", extinguish);
  const unsubscribeMode = modes.subscribe((state) => {
    panel.hidden = state.mode !== "interaction_menu" || state.interactionMenu?.type !== "campfire";
    if (!panel.hidden) render();
  });
  const unsubscribeCampfire = campfires.subscribe((state) => {
    if (state.id === activeCampfireId && modes.mode === "interaction_menu") render();
  });

  return {
    open(campfireId: string): void {
      if (!campfires.has(campfireId)) return;
      activeCampfireId = campfireId;
      feedback.hidden = true;
      modes.openInteractionMenu("campfire", campfireId);
      render();
    },
    refresh(): void {
      if (modes.mode === "interaction_menu") render();
    },
    dispose(): void {
      closeButton.removeEventListener("click", close);
      addFuelButton.removeEventListener("click", addFuel);
      igniteButton.removeEventListener("click", ignite);
      extinguishButton.removeEventListener("click", extinguish);
      unsubscribeMode();
      unsubscribeCampfire();
    },
  };
}

function formatFuelResult(reason: string, displayName: string): string {
  switch (reason) {
    case "ok": return `已添加 ${displayName} ×1`;
    case "no_fuel_item": return `背包中没有${displayName}`;
    case "fuel_full": return "剩余容量不足以加入一整块燃料";
    case "invalid_item": return "该物品不能作为燃料";
    default: return "篝火已失效";
  }
}

function setTextIfChanged(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

function getElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`缺少必需的界面元素：#${id}`);
  return element as T;
}
