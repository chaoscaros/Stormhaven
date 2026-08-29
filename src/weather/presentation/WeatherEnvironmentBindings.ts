import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";

/** World Scene 暴露给天气表现层的最小 Babylon 引用集合。 */
export interface WeatherEnvironmentBindings {
  readonly skyMaterial: ShaderMaterial;
  readonly hemisphericLight: HemisphericLight;
  readonly directionalLight: DirectionalLight;
}
