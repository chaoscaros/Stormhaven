import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/physicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { WORLD_CONFIG } from "../core/config";
import { createControlReferenceMarkers } from "./createControlReferenceMarkers";
import type { WeatherEnvironmentBindings } from "../weather/presentation/WeatherEnvironmentBindings";

const GRAVITY = new Vector3(0, -9.81, 0);

export interface WorldSceneRuntime {
  readonly scene: Scene;
  readonly weatherEnvironment: WeatherEnvironmentBindings;
}

/** 创建基础 Scene，并显式暴露天气表现层需要的最小环境引用。 */
export async function createWorldScene(engine: Engine): Promise<WorldSceneRuntime> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.54, 0.64, 0.67, 1);
  scene.ambientColor = new Color3(0.18, 0.23, 0.25);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = new Color3(0.64, 0.71, 0.72);
  scene.fogDensity = 0.0018;
  scene.collisionsEnabled = true;
  scene.gravity = GRAVITY;

  const havok = await HavokPhysics();
  scene.enablePhysics(GRAVITY, new HavokPlugin(true, havok));

  const skyMaterial = createSky(scene);
  const lights = createLights(scene);
  createGround(scene);
  createControlReferenceMarkers(scene);

  return Object.freeze({
    scene,
    weatherEnvironment: Object.freeze({
      skyMaterial,
      hemisphericLight: lights.ambient,
      directionalLight: lights.sun,
    }),
  });
}

function createSky(scene: Scene): ShaderMaterial {
  const sky = MeshBuilder.CreateSphere(
    "foundation-sky",
    { diameter: 900, segments: 24, sideOrientation: Mesh.BACKSIDE },
    scene,
  );
  const skyMaterial = new ShaderMaterial(
    "weather-sky-material",
    scene,
    {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        uniform mat4 worldViewProjection;
        varying float vSkyHeight;
        void main(void) {
          vSkyHeight = normalize(position).y * 0.5 + 0.5;
          gl_Position = worldViewProjection * vec4(position, 1.0);
        }
      `,
      fragmentSource: `
        precision highp float;
        varying float vSkyHeight;
        uniform vec3 horizonColor;
        uniform vec3 zenithColor;
        uniform float brightness;
        uniform float cloudiness;
        void main(void) {
          float verticalMix = smoothstep(0.38, 0.86, vSkyHeight);
          vec3 gradient = mix(horizonColor, zenithColor, verticalMix);
          vec3 overcast = vec3(dot(gradient, vec3(0.299, 0.587, 0.114)));
          vec3 skyColor = mix(gradient, overcast, cloudiness * 0.34) * brightness;
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
    },
    {
      attributes: ["position"],
      uniforms: [
        "worldViewProjection",
        "horizonColor",
        "zenithColor",
        "brightness",
        "cloudiness",
      ],
    },
  );
  skyMaterial.backFaceCulling = false;
  skyMaterial.setColor3("horizonColor", new Color3(0.58, 0.7, 0.73));
  skyMaterial.setColor3("zenithColor", new Color3(0.25, 0.4, 0.48));
  skyMaterial.setFloat("brightness", 1);
  skyMaterial.setFloat("cloudiness", 0.08);
  sky.material = skyMaterial;
  sky.isPickable = false;
  sky.infiniteDistance = true;
  return skyMaterial;
}

function createLights(scene: Scene): {
  readonly ambient: HemisphericLight;
  readonly sun: DirectionalLight;
} {
  const ambient = new HemisphericLight("cold-ambient", new Vector3(0, 1, 0), scene);
  ambient.diffuse = new Color3(0.7, 0.79, 0.8);
  ambient.groundColor = new Color3(0.18, 0.23, 0.25);
  ambient.intensity = 0.9;

  const sun = new DirectionalLight("winter-sun", new Vector3(-0.45, -1, 0.25), scene);
  sun.diffuse = new Color3(0.92, 0.88, 0.78);
  sun.intensity = 1.2;
  return { ambient, sun };
}

function createGround(scene: Scene): void {
  const ground = MeshBuilder.CreateBox(
    "snow-ground",
    {
      width: WORLD_CONFIG.sizeMeters,
      height: WORLD_CONFIG.groundThicknessMeters,
      depth: WORLD_CONFIG.sizeMeters,
    },
    scene,
  );
  ground.position.y = -WORLD_CONFIG.groundThicknessMeters / 2;
  const groundMaterial = new StandardMaterial("snow-ground-material", scene);
  groundMaterial.diffuseColor = new Color3(0.74, 0.8, 0.8);
  groundMaterial.specularColor = new Color3(0.1, 0.12, 0.12);
  groundMaterial.roughness = 0.92;
  ground.material = groundMaterial;
  ground.checkCollisions = true;
  ground.receiveShadows = true;

  new PhysicsAggregate(
    ground,
    PhysicsShapeType.BOX,
    { mass: 0, restitution: 0, friction: 0.85 },
    scene,
  );
}
