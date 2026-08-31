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
import { formatInteractionPrompt, type InteractionTarget } from "../interaction/InteractionTarget";
import type { InventorySnapshot } from "../inventory/Inventory";
import type { ItemCatalog } from "../items/ItemCatalog";
import { GameUiModeController } from "./GameUiModeController";

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

export interface FoundationUi {
  readonly modes: GameUiModeController;
  showReady(): void;
  showError(message: string): void;
  updateDebugHud(
    snapshot: GameSimulationSnapshot,
    presentation?: WeatherPresentationSnapshot,
  ): void;
  updateInteractionPrompt(target?: InteractionTarget): void;
  updateInventory(snapshot: InventorySnapshot, catalog: ItemCatalog): void;
  showInteractionResult(result: InteractionResult, catalog: ItemCatalog): void;
  dispose(): void;
}

/** 将基础启动界面与 Pointer Lock 入口连接起来。 */
export function setupFoundationUi(canvas: HTMLCanvasElement): FoundationUi {
  const startScreen = getElement("start-screen");
  const enterButton = getElement<HTMLButtonElement>("enter-button");
  const hud = getElement("hud");
  const errorScreen = getElement("error-screen");
  const errorMessage = getElement("error-message");
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
  const pickupFeedback = getElement("pickup-feedback");
  let feedbackTimeout: number | undefined;
  const modes = new GameUiModeController(canvas);

  const requestControl = (): void => {
    if (modes.mode !== "gameplay") return;
    void canvas.requestPointerLock();
  };

  const closeMenusAndResume = (): void => modes.resumeGameplay();

  enterButton.addEventListener("click", requestControl);
  canvas.addEventListener("click", requestControl);
  const handlePointerLockChange = (): void => {
    const isPlaying = document.pointerLockElement === canvas;
    const isMenuOpen = modes.isMenuOpen();
    startScreen.hidden = isPlaying || isMenuOpen;
    hud.hidden = !isPlaying && !isMenuOpen;
    if (isPlaying) {
      canvas.focus({ preventScroll: true });
    } else if (!isMenuOpen) {
      if (modes.mode === "gameplay") {
        inventoryPanel.hidden = true;
        craftingPanel.hidden = true;
        buildingPanel.hidden = true;
        campfirePanel.hidden = true;
      }
    }
  };
  const handleInventoryKeyDown = (event: KeyboardEvent): void => {
    if (
      event.code !== INTERACTION_CONFIG.inventoryKeyCode
      || event.repeat
      || (document.pointerLockElement !== canvas
        && !modes.isMenuOpen())
    ) return;
    event.preventDefault();
    if (modes.mode === "inventory_menu") modes.resumeGameplay();
    else modes.openMenu("inventory_menu");
  };
  const unsubscribeMode = modes.subscribe((mode) => {
    inventoryPanel.hidden = mode !== "inventory_menu";
    craftingPanel.hidden = mode !== "crafting_menu";
    buildingPanel.hidden = mode !== "building_menu";
    campfirePanel.hidden = mode !== "campfire_menu";
    if (modes.isMenuOpen()) hud.dataset.menuOpen = "true";
    else delete hud.dataset.menuOpen;
    hud.dataset.mode = mode;
  });
  inventoryCloseButton.addEventListener("click", closeMenusAndResume);
  document.addEventListener("pointerlockchange", handlePointerLockChange);
  window.addEventListener("keydown", handleInventoryKeyDown);

  return {
    modes,
    showReady(): void {
      enterButton.disabled = false;
      enterButton.querySelector("span")?.replaceChildren("进入测试区域");
    },
    showError(message: string): void {
      startScreen.hidden = true;
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
      if (totals.size === 0) {
        const empty = document.createElement("li");
        empty.className = "inventory-panel__empty";
        empty.textContent = "暂无物资";
        inventoryItems.replaceChildren(empty);
      } else {
        const fragment = document.createDocumentFragment();
        for (const [itemId, quantity] of totals) {
          const row = document.createElement("li");
          const name = document.createElement("span");
          const count = document.createElement("strong");
          name.textContent = catalog.get(itemId).displayName;
          count.textContent = `×${quantity}`;
          row.append(name, count);
          fragment.append(row);
        }
        inventoryItems.replaceChildren(fragment);
      }
      setTextIfChanged(
        inventoryWeight,
        `${snapshot.totalWeightKilograms.toFixed(1)} / ${snapshot.maxWeightKilograms.toFixed(1)} kg`,
      );
      setTextIfChanged(inventorySlots, `${snapshot.usedSlots} / ${snapshot.maxSlots}`);
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
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      window.removeEventListener("keydown", handleInventoryKeyDown);
      unsubscribeMode();
      if (feedbackTimeout !== undefined) window.clearTimeout(feedbackTimeout);
    },
  };
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
