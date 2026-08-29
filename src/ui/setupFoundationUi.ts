import type { GameSimulationSnapshot } from "../core/simulation/GameSimulation";
import { formatGameTime } from "../core/time/formatGameTime";
import type { WeatherId } from "../weather/WeatherDefinition";
import type { WeatherPresentationSnapshot } from "../weather/presentation/WeatherPresentationController";
import type {
  ThermalStatus,
  ThermalTrend,
} from "../survival/thermal/ThermalState";

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

interface FoundationUi {
  showReady(): void;
  showError(message: string): void;
  updateDebugHud(
    snapshot: GameSimulationSnapshot,
    presentation?: WeatherPresentationSnapshot,
  ): void;
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

  const requestControl = (): void => {
    void canvas.requestPointerLock();
  };

  enterButton.addEventListener("click", requestControl);
  canvas.addEventListener("click", requestControl);
  document.addEventListener("pointerlockchange", () => {
    const isPlaying = document.pointerLockElement === canvas;
    startScreen.hidden = isPlaying;
    hud.hidden = !isPlaying;
    if (isPlaying) {
      canvas.focus({ preventScroll: true });
    }
  });

  return {
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
  };
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
