import type { GameSimulationSnapshot } from "../core/simulation/GameSimulation";
import { formatGameTime } from "../core/time/formatGameTime";
import type { WeatherId } from "../weather/WeatherDefinition";
import type { WeatherPresentationSnapshot } from "../weather/presentation/WeatherPresentationController";
import type {
  ThermalStatus,
  ThermalTrend,
} from "../survival/thermal/ThermalState";
import type { InteractionResult } from "../interaction/InteractionResult";
import { INTERACTION_CONFIG } from "../interaction/InteractionConfig";
import { CRAFTING_INPUT_CONFIG } from "../crafting/CraftingConfig";
import { BUILDING_INPUT_CONFIG } from "../building/BuildingConfig";
import { formatInteractionPrompt, type InteractionTarget } from "../interaction/InteractionTarget";
import type { InventorySnapshot } from "../inventory/Inventory";
import type { ItemCatalog } from "../items/ItemCatalog";
import type { ItemCategory } from "../items/ItemDefinition";
import { GameUiModeController } from "./GameUiModeController";
import { writeHotbarDragData } from "./hotbar/HotbarDragData";

const WEATHER_LABELS: Readonly<Record<WeatherId, string>> = Object.freeze({
  clear: "晴朗",
  cloudy: "多云",
  snow: "降雪",
  blizzard: "暴雪",
});
const THERMAL_STATUS_LABELS: Readonly<Record<ThermalStatus, string>> = Object.freeze({
  comfortable: "舒适",
  cool: "微冷",
  cold: "寒冷",
  freezing: "严寒",
  critical: "危险",
});
const THERMAL_TREND_LABELS: Readonly<Record<ThermalTrend, string>> = Object.freeze({
  warming: "回暖",
  stable: "稳定",
  cooling: "流失",
});
const ITEM_CATEGORY_LABELS: Readonly<Record<ItemCategory, string>> = Object.freeze({
  resource: "基础资源",
  food: "食物",
  drink: "饮品",
  material: "制造材料",
  tool: "工具",
  misc: "杂项",
});

export interface FoundationUi {
  readonly modes: GameUiModeController;
  showLoading(stage: string): void;
  setLoadingStage(stage: string): void;
  hideLoading(): void;
  showReady(): void;
  showError(message: string): void;
  updateDebugHud(
    snapshot: GameSimulationSnapshot,
    presentation?: WeatherPresentationSnapshot,
  ): void;
  updateInteractionPrompt(target?: InteractionTarget): void;
  updateInventory(snapshot: InventorySnapshot, catalog: ItemCatalog): void;
  getSelectedInventoryItemId(): string | undefined;
  showInteractionResult(result: InteractionResult, catalog: ItemCatalog): void;
  dispose(): void;
}

interface FoundationUiCallbacks {
  readonly onSimulationPausedChanged: (paused: boolean) => void;
}

/** 将基础启动界面与 Pointer Lock 入口连接起来。 */
export function setupFoundationUi(
  canvas: HTMLCanvasElement,
  callbacks: FoundationUiCallbacks,
): FoundationUi {
  const startScreen = getElement("start-screen");
  const enterButton = getElement<HTMLButtonElement>("enter-button");
  const loadingOverlay = getElement("loading-overlay");
  const loadingStage = getElement("loading-stage");
  const hud = getElement("hud");
  const playerMenu = getElement("player-menu");
  const playerMenuCloseButton = getElement<HTMLButtonElement>("player-menu-close-button");
  const inventoryTabButton = getElement<HTMLButtonElement>("player-tab-inventory");
  const craftingTabButton = getElement<HTMLButtonElement>("player-tab-crafting");
  const buildingTabButton = getElement<HTMLButtonElement>("player-tab-building");
  const pauseMenu = getElement("pause-menu");
  const resumeButton = getElement<HTMLButtonElement>("resume-button");
  const errorScreen = getElement("error-screen");
  const errorMessage = getElement("error-message");
  const playerStatus = getElement("debug-telemetry");
  const statusTime = getElement("status-time");
  const statusWeather = getElement("status-weather");
  const statusShelter = getElement("status-shelter");
  const statusTemperature = getElement("status-temperature");
  const statusTrend = getElement("status-trend");
  const debugTime = getElement("debug-time");
  const debugWeather = getElement("debug-weather");
  const debugVisualWeather = getElement("debug-visual-weather");
  const debugForecast = getElement("debug-forecast");
  const debugTransition = getElement("debug-transition");
  const debugEnvironmentTemperature = getElement("debug-environment-temperature");
  const debugEffectiveTemperature = getElement("debug-effective-temperature");
  const debugWindStrength = getElement("debug-wind-strength");
  const debugShelter = getElement("debug-shelter");
  const debugWindProtection = getElement("debug-wind-protection");
  const debugHeatBonus = getElement("debug-heat-bonus");
  const debugThermalValue = getElement("debug-thermal-value");
  const debugThermalTrend = getElement("debug-thermal-trend");
  const debugThermalStatus = getElement("debug-thermal-status");
  const crosshair = getElement("crosshair");
  const interactionPrompt = getElement("interaction-prompt");
  const inventoryPanel = getElement("inventory-panel");
  const inventoryCloseButton = getElement<HTMLButtonElement>("inventory-close-button");
  const craftingPanel = getElement("crafting-panel");
  const buildingPanel = getElement("building-panel");
  const campfirePanel = getElement("campfire-panel");
  const inventoryItems = getElement<HTMLUListElement>("inventory-items");
  const inventoryWeight = getElement("inventory-weight");
  const inventorySlots = getElement("inventory-slots");
  const inventoryDetailIcon = getElement("inventory-detail-icon");
  const inventoryDetailCategory = getElement("inventory-detail-category");
  const inventoryDetailName = getElement("inventory-detail-name");
  const inventoryDetailDescription = getElement("inventory-detail-description");
  const inventoryDetailQuantity = getElement("inventory-detail-quantity");
  const inventoryDetailWeight = getElement("inventory-detail-weight");
  const inventoryTooltip = getElement("inventory-tooltip");
  const inventoryTooltipName = getElement("inventory-tooltip-name");
  const inventoryTooltipMeta = getElement("inventory-tooltip-meta");
  const pickupFeedback = getElement("pickup-feedback");
  let feedbackTimeout: number | undefined;
  let suppressEscapeUntil = 0;
  let selectedInventoryItemId: string | undefined;
  let selectedInventorySlotIndex: number | undefined;
  const modes = new GameUiModeController(canvas);

  const requestControl = (): void => {
    if (modes.mode === "main_menu") modes.startGame();
    else if (modes.mode === "gameplay") void canvas.requestPointerLock();
  };

  const closeMenusAndResume = (): void => modes.resumeGameplay();

  enterButton.addEventListener("click", requestControl);
  canvas.addEventListener("click", requestControl);
  const handlePointerLockChange = (): void => {
    if (document.pointerLockElement === canvas) {
      canvas.focus({ preventScroll: true });
    } else if (modes.mode === "gameplay") {
      suppressEscapeUntil = performance.now() + 250;
      modes.pauseFromPointerUnlock();
    }
  };
  const handleShellKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    if (event.code === "Escape") {
      if (modes.mode === "build_placement") return;
      if (performance.now() < suppressEscapeUntil) return;
      if (["gameplay", "player_menu", "interaction_menu", "paused"].includes(modes.mode)) {
        event.preventDefault();
        modes.handleEscape();
      }
      return;
    }
    if (event.code === "F6" && !["boot", "main_menu"].includes(modes.mode)) {
      event.preventDefault();
      playerStatus.hidden = !playerStatus.hidden;
      return;
    }
    if (event.code === INTERACTION_CONFIG.inventoryKeyCode) {
      if (modes.mode !== "gameplay" && modes.mode !== "player_menu") return;
      event.preventDefault();
      modes.toggleInventoryMenu();
      return;
    }
    if (event.code === CRAFTING_INPUT_CONFIG.toggleKeyCode) {
      if (modes.mode !== "gameplay" && modes.mode !== "player_menu") return;
      event.preventDefault();
      modes.openPlayerMenu("crafting");
      return;
    }
    if (event.code === BUILDING_INPUT_CONFIG.toggleKeyCode) {
      if (modes.mode !== "gameplay" && modes.mode !== "player_menu") return;
      event.preventDefault();
      modes.openPlayerMenu("building");
    }
  };
  const openPlayerTab = (tab: "inventory" | "crafting" | "building"): void =>
    modes.openPlayerMenu(tab);
  const unsubscribeMode = modes.subscribe((state) => {
    const { mode, playerMenuTab } = state;
    startScreen.hidden = mode !== "main_menu";
    hud.hidden = mode === "boot" || mode === "main_menu";
    playerMenu.hidden = mode !== "player_menu";
    pauseMenu.hidden = mode !== "paused";
    inventoryPanel.hidden = mode !== "player_menu" || playerMenuTab !== "inventory";
    if (inventoryPanel.hidden) hideInventoryTooltip();
    craftingPanel.hidden = mode !== "player_menu" || playerMenuTab !== "crafting";
    buildingPanel.hidden = mode !== "player_menu" || playerMenuTab !== "building";
    campfirePanel.hidden = mode !== "interaction_menu";
    for (const [button, tab] of [
      [inventoryTabButton, "inventory"],
      [craftingTabButton, "crafting"],
      [buildingTabButton, "building"],
    ] as const) {
      const selected = playerMenuTab === tab;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    }
    callbacks.onSimulationPausedChanged(mode === "boot" || mode === "main_menu" || mode === "paused");
    if (modes.isMenuOpen()) hud.dataset.menuOpen = "true";
    else delete hud.dataset.menuOpen;
    hud.dataset.mode = mode;
  });
  inventoryCloseButton.addEventListener("click", closeMenusAndResume);
  playerMenuCloseButton.addEventListener("click", closeMenusAndResume);
  resumeButton.addEventListener("click", closeMenusAndResume);
  const inventoryTabClick = (): void => openPlayerTab("inventory");
  const craftingTabClick = (): void => openPlayerTab("crafting");
  const buildingTabClick = (): void => openPlayerTab("building");
  inventoryTabButton.addEventListener("click", inventoryTabClick);
  craftingTabButton.addEventListener("click", craftingTabClick);
  buildingTabButton.addEventListener("click", buildingTabClick);
  document.addEventListener("pointerlockchange", handlePointerLockChange);
  window.addEventListener("keydown", handleShellKeyDown);

  return {
    modes,
    showLoading(stage: string): void {
      setTextIfChanged(loadingStage, stage);
      loadingOverlay.hidden = false;
    },
    setLoadingStage(stage: string): void {
      setTextIfChanged(loadingStage, stage);
    },
    hideLoading(): void {
      loadingOverlay.hidden = true;
    },
    showReady(): void {
      enterButton.disabled = false;
      enterButton.querySelector("span")?.replaceChildren("开始游戏");
      loadingOverlay.hidden = true;
      modes.showMainMenu();
    },
    showError(message: string): void {
      startScreen.hidden = true;
      loadingOverlay.hidden = true;
      hud.hidden = true;
      errorMessage.textContent = message;
      errorScreen.hidden = false;
    },
    updateDebugHud(
      snapshot: GameSimulationSnapshot,
      presentation?: WeatherPresentationSnapshot,
    ): void {
      setTextIfChanged(debugTime, formatGameTime(snapshot.time));
      setTextIfChanged(debugWeather, snapshot.weather.displayName);
      setTextIfChanged(statusTime, formatGameTime(snapshot.time));
      setTextIfChanged(statusWeather, snapshot.weather.displayName);
      setTextIfChanged(statusShelter, snapshot.shelter.displayName ?? "室外");
      setTextIfChanged(statusTemperature, formatCelsius(snapshot.thermal.effectiveTemperatureCelsius));
      setTextIfChanged(statusTrend, THERMAL_TREND_LABELS[snapshot.thermal.trend]);
      statusTrend.dataset.trend = snapshot.thermal.trend;
      setTextIfChanged(
        debugVisualWeather,
        presentation
          ? formatVisualWeather(presentation)
          : snapshot.weather.displayName,
      );
      setTextIfChanged(
        debugForecast,
        snapshot.forecast
          ? `${formatGameTime(snapshot.forecast.startsAt)} ${snapshot.forecast.displayName}`
          : "暂无后续预报",
      );
      setTextIfChanged(
        debugTransition,
        snapshot.transition
          ? `${Math.round(snapshot.transition.progress * 100)}% → ${snapshot.transition.targetDisplayName}`
          : "0%",
      );
      setTextIfChanged(
        debugEnvironmentTemperature,
        `${formatCelsius(snapshot.gameplayWeather.ambientTemperatureCelsius)} ${formatSignedCelsius(snapshot.gameplayWeather.temperatureModifierCelsius)}`,
      );
      setTextIfChanged(
        debugEffectiveTemperature,
        formatCelsius(snapshot.thermal.effectiveTemperatureCelsius),
      );
      setTextIfChanged(
        debugWindStrength,
        `${snapshot.thermalEnvironment.rawWindStrength.toFixed(1)} → ${snapshot.thermalEnvironment.effectiveWindStrength.toFixed(1)}`,
      );
      setTextIfChanged(
        debugShelter,
        snapshot.shelter.displayName ?? "室外",
      );
      setTextIfChanged(
        debugWindProtection,
        `${Math.round(snapshot.thermalEnvironment.windProtection * 100)}%`,
      );
      setTextIfChanged(
        debugHeatBonus,
        `${formatSignedCelsius(snapshot.thermalEnvironment.externalHeatBonusCelsius)}${snapshot.heat.dominantDisplayName ? ` · ${snapshot.heat.dominantDisplayName}` : ""}`,
      );
      setTextIfChanged(debugThermalValue, `${snapshot.thermal.currentValue.toFixed(1)}%`);
      setTextIfChanged(
        debugThermalTrend,
        `${THERMAL_TREND_LABELS[snapshot.thermal.trend]} ${formatSignedRate(snapshot.thermal.changeRatePerSecond * 60)}/分`,
      );
      setTextIfChanged(
        debugThermalStatus,
        THERMAL_STATUS_LABELS[snapshot.thermal.status],
      );
      debugThermalStatus.dataset.status = snapshot.thermal.status;
    },
    updateInteractionPrompt(target?: InteractionTarget): void {
      interactionPrompt.hidden = !target;
      crosshair.dataset.active = target ? "true" : "false";
      if (target) setTextIfChanged(interactionPrompt, formatInteractionPrompt(target));
    },
    updateInventory(snapshot: InventorySnapshot, catalog: ItemCatalog): void {
      const totals = new Map<string, number>();
      for (const stack of snapshot.slots) {
        if (stack) totals.set(stack.itemId, (totals.get(stack.itemId) ?? 0) + stack.quantity);
      }
      hideInventoryTooltip();
      if (totals.size === 0) {
        selectedInventoryItemId = undefined;
        selectedInventorySlotIndex = undefined;
        renderEmptyInventoryDetail();
      } else {
        const selectedStack = selectedInventorySlotIndex === undefined
          ? undefined
          : snapshot.slots[selectedInventorySlotIndex];
        if (!selectedStack || selectedStack.itemId !== selectedInventoryItemId) {
          const nextSlotIndex = snapshot.slots.findIndex((stack) =>
            stack && (!selectedInventoryItemId || stack.itemId === selectedInventoryItemId));
          selectedInventorySlotIndex = nextSlotIndex >= 0
            ? nextSlotIndex
            : snapshot.slots.findIndex(Boolean);
          selectedInventoryItemId = selectedInventorySlotIndex >= 0
            ? snapshot.slots[selectedInventorySlotIndex]?.itemId
            : undefined;
        }
      }
      const fragment = document.createDocumentFragment();
      snapshot.slots.forEach((stack, slotIndex) => {
        const cell = document.createElement("li");
        cell.className = "inventory-panel__slot";
        cell.dataset.slot = `${slotIndex + 1}`.padStart(2, "0");
        if (!stack) {
          cell.dataset.empty = "true";
          const emptyMarker = document.createElement("span");
          emptyMarker.className = "inventory-panel__empty-slot";
          emptyMarker.setAttribute("aria-hidden", "true");
          cell.append(emptyMarker);
        } else {
          const { itemId, quantity } = stack;
          const definition = catalog.get(itemId);
          const button = document.createElement("button");
          button.type = "button";
          button.draggable = true;
          button.title = "拖到下方快捷栏";
          button.setAttribute("aria-describedby", "inventory-tooltip");
          button.setAttribute("aria-label", `${definition.displayName}，数量 ${quantity}`);
          button.dataset.selected = slotIndex === selectedInventorySlotIndex ? "true" : "false";
          const icon = document.createElement("span");
          icon.className = "ui-icon";
          icon.dataset.icon = definition.icon ?? definition.id;
          icon.setAttribute("aria-hidden", "true");
          const count = document.createElement("strong");
          count.className = "inventory-panel__item-count";
          count.textContent = `×${quantity}`;
          button.append(icon, count);
          const preview = (): void => {
            selectedInventoryItemId = itemId;
            selectedInventorySlotIndex = slotIndex;
            for (const candidate of inventoryItems.querySelectorAll("button")) {
              candidate.dataset.selected = candidate === button ? "true" : "false";
            }
            renderInventoryDetail(itemId, totals.get(itemId) ?? quantity, catalog);
            showInventoryTooltip(button, itemId, quantity, catalog);
          };
          button.addEventListener("pointerenter", preview);
          button.addEventListener("focus", preview);
          button.addEventListener("pointerleave", hideInventoryTooltip);
          button.addEventListener("blur", hideInventoryTooltip);
          button.addEventListener("dragstart", (event) => {
            if (!event.dataTransfer) return;
            selectedInventoryItemId = itemId;
            selectedInventorySlotIndex = slotIndex;
            hideInventoryTooltip();
            writeHotbarDragData(event.dataTransfer, {
              source: "catalog",
              entry: { type: "item", id: itemId },
            });
          });
          cell.append(button);
        }
        fragment.append(cell);
      });
      inventoryItems.replaceChildren(fragment);
      if (selectedInventoryItemId) {
        renderInventoryDetail(
          selectedInventoryItemId,
          totals.get(selectedInventoryItemId) ?? 0,
          catalog,
        );
      }
      setTextIfChanged(
        inventoryWeight,
        `${snapshot.totalWeightKilograms.toFixed(1)} / ${snapshot.maxWeightKilograms.toFixed(1)} kg`,
      );
      setTextIfChanged(inventorySlots, `${snapshot.usedSlots} / ${snapshot.maxSlots}`);
    },
    getSelectedInventoryItemId(): string | undefined {
      return selectedInventoryItemId;
    },
    showInteractionResult(result: InteractionResult, catalog: ItemCatalog): void {
      if (feedbackTimeout !== undefined) window.clearTimeout(feedbackTimeout);
      pickupFeedback.dataset.tone = result.success ? "success" : "warning";
      pickupFeedback.textContent = formatInteractionResult(result, catalog);
      pickupFeedback.hidden = false;
      feedbackTimeout = window.setTimeout(() => {
        pickupFeedback.hidden = true;
        feedbackTimeout = undefined;
      }, 1_600);
    },
    dispose(): void {
      enterButton.removeEventListener("click", requestControl);
      canvas.removeEventListener("click", requestControl);
      inventoryCloseButton.removeEventListener("click", closeMenusAndResume);
      playerMenuCloseButton.removeEventListener("click", closeMenusAndResume);
      resumeButton.removeEventListener("click", closeMenusAndResume);
      inventoryTabButton.removeEventListener("click", inventoryTabClick);
      craftingTabButton.removeEventListener("click", craftingTabClick);
      buildingTabButton.removeEventListener("click", buildingTabClick);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      window.removeEventListener("keydown", handleShellKeyDown);
      unsubscribeMode();
      if (feedbackTimeout !== undefined) window.clearTimeout(feedbackTimeout);
    },
  };

  function renderInventoryDetail(itemId: string, quantity: number, catalog: ItemCatalog): void {
    const definition = catalog.get(itemId);
    inventoryDetailIcon.dataset.icon = definition.icon ?? definition.id;
    setTextIfChanged(inventoryDetailCategory, ITEM_CATEGORY_LABELS[definition.category]);
    setTextIfChanged(inventoryDetailName, definition.displayName);
    setTextIfChanged(inventoryDetailDescription, definition.description);
    setTextIfChanged(inventoryDetailQuantity, `${quantity}`);
    setTextIfChanged(inventoryDetailWeight, `${definition.weight.toFixed(2)} kg`);
  }

  function showInventoryTooltip(
    anchor: HTMLElement,
    itemId: string,
    quantity: number,
    catalog: ItemCatalog,
  ): void {
    const definition = catalog.get(itemId);
    const bounds = anchor.getBoundingClientRect();
    const tooltipWidth = 210;
    const preferredLeft = bounds.right + 12;
    const left = preferredLeft + tooltipWidth <= window.innerWidth - 12
      ? preferredLeft
      : Math.max(12, bounds.left - tooltipWidth - 12);
    const top = Math.min(bounds.top, window.innerHeight - 124);
    setTextIfChanged(inventoryTooltipName, definition.displayName);
    setTextIfChanged(
      inventoryTooltipMeta,
      `${ITEM_CATEGORY_LABELS[definition.category]} · 当前格 ×${quantity} · ${definition.weight.toFixed(2)} kg/件`,
    );
    inventoryTooltip.style.left = `${left}px`;
    inventoryTooltip.style.top = `${Math.max(12, top)}px`;
    inventoryTooltip.hidden = false;
  }

  function hideInventoryTooltip(): void {
    inventoryTooltip.hidden = true;
  }

  function renderEmptyInventoryDetail(): void {
    inventoryDetailIcon.dataset.icon = "empty";
    setTextIfChanged(inventoryDetailCategory, "物资详情");
    setTextIfChanged(inventoryDetailName, "背包为空");
    setTextIfChanged(inventoryDetailDescription, "探索雪地并拾取资源后，可在这里查看用途与重量。");
    setTextIfChanged(inventoryDetailQuantity, "0");
    setTextIfChanged(inventoryDetailWeight, "—");
  }
}

function formatInteractionResult(result: InteractionResult, catalog: ItemCatalog): string {
  if (result.success && result.itemId && catalog.has(result.itemId)) {
    const remaining = result.remainingQuantity > 0
      ? ` · 地面剩余 ×${result.remainingQuantity}`
      : "";
    return `获得 ${catalog.get(result.itemId).displayName} ×${result.acceptedQuantity}${remaining}`;
  }
  switch (result.reason) {
    case "inventory_full": return "背包槽位已满，物资仍留在原处";
    case "too_heavy": return "负重已满，物资仍留在原处";
    case "unknown_item": return "无法识别该物资";
    case "out_of_range": return "距离过远";
    default: return "交互目标已失效";
  }
}

function formatCelsius(value: number): string {
  return `${value.toFixed(1)}℃`;
}

function formatSignedCelsius(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}℃`;
}

function formatSignedRate(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatVisualWeather(presentation: WeatherPresentationSnapshot): string {
  if (presentation.previewMode) {
    return `${WEATHER_LABELS[presentation.weatherId]} · 预览`;
  }
  if (
    presentation.targetWeatherId
    && presentation.transitionProgress !== undefined
  ) {
    return `${WEATHER_LABELS[presentation.weatherId]} → ${WEATHER_LABELS[presentation.targetWeatherId]} ${Math.round(presentation.transitionProgress * 100)}%`;
  }
  return WEATHER_LABELS[presentation.weatherId];
}

function setTextIfChanged(element: HTMLElement, text: string): void {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

function getElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`缺少必需的界面元素：#${id}`);
  }
  return element as T;
}
