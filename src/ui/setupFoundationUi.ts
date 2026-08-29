import type { GameSimulationSnapshot } from "../core/simulation/GameSimulation";
import { formatGameTime } from "../core/time/formatGameTime";
import type { WeatherId } from "../weather/WeatherDefinition";
import type { WeatherPresentationSnapshot } from "../weather/presentation/WeatherPresentationController";

const WEATHER_LABELS: Readonly<Record<WeatherId, string>> = Object.freeze({
  clear: "晴朗",
  cloudy: "多云",
  snow: "降雪",
  blizzard: "暴雪",
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
    },
  };
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
