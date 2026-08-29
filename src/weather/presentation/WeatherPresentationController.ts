import type { Camera } from "@babylonjs/core/Cameras/camera";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { GameSimulationSnapshot } from "../../core/simulation/GameSimulation";
import type { WeatherId } from "../WeatherDefinition";
import type { WeatherEnvironmentBindings } from "./WeatherEnvironmentBindings";
import { SnowParticleController } from "./SnowParticleController";
import { WeatherVisualMapper } from "./WeatherVisualMapper";

const PREVIEW_KEYS: Readonly<Record<string, WeatherId>> = Object.freeze({
  F1: "clear",
  F2: "cloudy",
  F3: "snow",
  F4: "blizzard",
});

export interface WeatherPresentationSnapshot {
  readonly weatherId: WeatherId;
  readonly previewMode: boolean;
  readonly targetWeatherId?: WeatherId;
  readonly transitionProgress?: number;
}

/** 将纯视觉状态集中写入 Babylon；Domain 不反向依赖本类。 */
export class WeatherPresentationController {
  readonly #snow: SnowParticleController;
  #previewWeatherId: WeatherId | undefined;

  constructor(
    private readonly scene: Scene,
    private readonly camera: Camera,
    private readonly environment: WeatherEnvironmentBindings,
    private readonly mapper: WeatherVisualMapper,
  ) {
    this.#snow = new SnowParticleController(scene);
    window.addEventListener("keydown", this.#handlePreviewKey);
  }

  update(snapshot: GameSimulationSnapshot): WeatherPresentationSnapshot {
    const visualWeatherId = this.#previewWeatherId ?? snapshot.weather.id;
    const state = this.#previewWeatherId
      ? this.mapper.map(this.#previewWeatherId)
      : this.mapper.map(
          snapshot.weather.id,
          snapshot.transition?.targetWeatherId,
          snapshot.transition?.progress,
        );

    this.scene.fogDensity = state.fogDensity;
    this.scene.fogColor.copyFromFloats(...state.fogColor);
    this.scene.clearColor.copyFromFloats(...state.fogColor, 1);
    this.environment.hemisphericLight.intensity = state.hemisphericLightIntensity;
    this.environment.directionalLight.intensity = state.directionalLightIntensity;
    this.environment.skyMaterial.setFloat("brightness", state.skyBrightness);
    this.environment.skyMaterial.setFloat("cloudiness", state.skyCloudiness);
    this.environment.skyMaterial.setColor3(
      "horizonColor",
      Color3.FromArray(state.horizonColor),
    );
    this.environment.skyMaterial.setColor3(
      "zenithColor",
      Color3.FromArray(state.zenithColor),
    );
    this.#snow.update(this.camera, state);

    return Object.freeze({
      weatherId: visualWeatherId,
      previewMode: this.#previewWeatherId !== undefined,
      ...(!this.#previewWeatherId && snapshot.transition
        ? {
            targetWeatherId: snapshot.transition.targetWeatherId,
            transitionProgress: snapshot.transition.progress,
          }
        : {}),
    });
  }

  dispose(): void {
    window.removeEventListener("keydown", this.#handlePreviewKey);
    this.#snow.dispose();
  }

  readonly #handlePreviewKey = (event: KeyboardEvent): void => {
    const weatherId = PREVIEW_KEYS[event.code];
    if (weatherId) {
      event.preventDefault();
      this.#previewWeatherId = weatherId;
      return;
    }
    if (event.code === "F5") {
      event.preventDefault();
      this.#previewWeatherId = undefined;
    }
  };
}
