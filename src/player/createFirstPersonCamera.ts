import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import "@babylonjs/core/Collisions/collisionCoordinator";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import type { Scene } from "@babylonjs/core/scene";
import { PLAYER_CONFIG } from "../core/config";
import { toBabylonCameraSpeed } from "./cameraSpeed";
import { PlayerVerticalMotion } from "./PlayerVerticalMotion";

const KEY_W = 87;
const KEY_A = 65;
const KEY_S = 83;
const KEY_D = 68;
const KEY_SHIFT = 16;
const MAX_FRAME_SECONDS = 0.05;
const GRAVITY_METERS_PER_SECOND_SQUARED = 9.81;
const GROUND_PROBE_MARGIN_METERS = 0.12;

/** 配置基础第一人称控制器，不包含任何后续玩法系统。 */
export function createFirstPersonCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
  isInputEnabled: () => boolean = () => true,
): UniversalCamera {
  const spawn = PLAYER_CONFIG.spawnPosition;
  const camera = new UniversalCamera(
    "first-person-camera",
    new Vector3(spawn.x, spawn.y, spawn.z),
    scene,
  );

  camera.minZ = 0.1;
  camera.fov = 1.05;
  camera.speed = toBabylonCameraSpeed(PLAYER_CONFIG.walkSpeedMetersPerSecond);
  camera.angularSensibility = PLAYER_CONFIG.lookSensitivity;
  camera.inertia = 0.15;
  camera.applyGravity = false;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(0.42, PLAYER_CONFIG.eyeHeightMeters / 2, 0.42);
  // FreeCamera 已经会将碰撞椭球中心下移 ellipsoid.y；不要再次负向偏移。
  camera.ellipsoidOffset = Vector3.Zero();
  camera.keysUp.push(KEY_W);
  camera.keysDown.push(KEY_S);
  camera.keysLeft.push(KEY_A);
  camera.keysRight.push(KEY_D);
  camera.attachControl(canvas, true);

  const verticalMotion = new PlayerVerticalMotion({
    gravityMetersPerSecondSquared: GRAVITY_METERS_PER_SECOND_SQUARED,
    jumpSpeedMetersPerSecond: PLAYER_CONFIG.jumpSpeedMetersPerSecond,
  });

  const isGrounded = (): boolean => {
    const groundProbe = new Ray(
      camera.position,
      Vector3.Down(),
      PLAYER_CONFIG.eyeHeightMeters + GROUND_PROBE_MARGIN_METERS,
    );
    return scene.pickWithRay(
      groundProbe,
      (mesh) =>
        mesh.name === "snow-ground"
        || mesh.name === "test-cabin-floor"
        || typeof mesh.metadata?.buildingEntityId === "string",
    )?.hit ?? false;
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!isInputEnabled()) return;
    if (event.keyCode === KEY_SHIFT) {
      camera.speed = toBabylonCameraSpeed(PLAYER_CONFIG.runSpeedMetersPerSecond);
    }
    if (event.code === "Space" && !event.repeat && isGrounded()) {
      verticalMotion.tryJump(true);
    }
  };
  const handleKeyUp = (event: KeyboardEvent): void => {
    if (event.keyCode === KEY_SHIFT) {
      camera.speed = toBabylonCameraSpeed(PLAYER_CONFIG.walkSpeedMetersPerSecond);
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  const verticalMotionObserver = scene.onBeforeRenderObservable.add(() => {
    if (!isInputEnabled()) return;
    const deltaSeconds = Math.min(scene.getEngine().getDeltaTime() / 1_000, MAX_FRAME_SECONDS);
    camera.cameraDirection.y += verticalMotion.update(deltaSeconds, isGrounded());
  });

  camera.onDisposeObservable.addOnce(() => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    scene.onBeforeRenderObservable.remove(verticalMotionObserver);
  });

  scene.activeCamera = camera;
  return camera;
}
