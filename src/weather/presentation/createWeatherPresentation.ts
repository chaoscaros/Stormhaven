import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Scene } from "@babylonjs/core/scene";
import weatherVisualsData from "../../../data/weather/weather-visuals.json";
import type { WeatherEnvironmentBindings } from "./WeatherEnvironmentBindings";
import { WeatherPresentationController } from "./WeatherPresentationController";
import { WeatherVisualMapper } from "./WeatherVisualMapper";
import { WeatherVisualProfileCatalog } from "./WeatherVisualProfileCatalog";

/** 从 JSON 视觉配置创建表现控制器。 */
export function createWeatherPresentation(
  scene: Scene,
  camera: Camera,
  environment: WeatherEnvironmentBindings,
): WeatherPresentationController {
  const profiles = WeatherVisualProfileCatalog.fromUnknown(weatherVisualsData);
  return new WeatherPresentationController(
    scene,
    camera,
    environment,
    new WeatherVisualMapper(profiles),
  );
}
