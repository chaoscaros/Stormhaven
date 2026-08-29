import type { Camera } from "@babylonjs/core/Cameras/camera";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { Scene } from "@babylonjs/core/scene";
import type { Particle } from "@babylonjs/core/Particles/particle";
import type { WeatherVisualState } from "./WeatherVisualState";
import {
  segmentIntersectsPrecipitationBounds,
  type PrecipitationCollisionBounds,
} from "./PrecipitationCollision";

const PARTICLE_CAPACITY = 2_000;
const EMITTER_HEIGHT_METERS = 10;

interface PreviousParticleState {
  x: number;
  y: number;
  z: number;
  age: number;
}

/** 单一局部 ParticleSystem；发射器跟随相机，不创建雪花 Mesh。 */
export class SnowParticleController {
  readonly #emitter = Vector3.Zero();
  readonly #particleTexture: DynamicTexture;
  readonly #particles: ParticleSystem;
  readonly #collisionBounds: readonly PrecipitationCollisionBounds[];
  readonly #previousParticleStates = new Map<number, PreviousParticleState>();

  constructor(scene: Scene) {
    this.#particleTexture = createSnowParticleTexture(scene);
    this.#particles = new ParticleSystem("weather-local-snow", PARTICLE_CAPACITY, scene);
    this.#particles.particleTexture = this.#particleTexture;
    this.#particles.emitter = this.#emitter;
    this.#particles.minEmitBox = new Vector3(-15, -1, -15);
    this.#particles.maxEmitBox = new Vector3(15, 3, 15);
    this.#particles.minLifeTime = 1.4;
    this.#particles.maxLifeTime = 2.7;
    this.#particles.minAngularSpeed = -1.2;
    this.#particles.maxAngularSpeed = 1.2;
    this.#particles.color1 = new Color4(0.92, 0.97, 1, 0.88);
    this.#particles.color2 = new Color4(0.72, 0.82, 0.85, 0.62);
    this.#particles.colorDead = new Color4(0.65, 0.73, 0.76, 0);
    this.#particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    this.#particles.updateSpeed = 0.018;
    this.#particles.emitRate = 0;
    this.#collisionBounds = collectStaticCollisionBounds(scene);
    const updateParticles = this.#particles.updateFunction;
    this.#particles.updateFunction = (particles): void => {
      updateParticles(particles);
      this.#recycleBlockedParticles(particles);
    };
    this.#particles.start();
  }

  update(camera: Camera, state: WeatherVisualState): void {
    this.#emitter.copyFrom(camera.globalPosition);
    this.#emitter.y += EMITTER_HEIGHT_METERS;

    const wind = new Vector3(...state.windDirection).normalize();
    const spread = 0.12 + state.snowIntensity * 0.18;
    this.#particles.direction1.copyFromFloats(
      wind.x - spread,
      wind.y,
      wind.z - spread,
    );
    this.#particles.direction2.copyFromFloats(
      wind.x + spread,
      wind.y - spread * 0.25,
      wind.z + spread,
    );
    this.#particles.minEmitPower = state.snowParticleSpeed * 0.72;
    this.#particles.maxEmitPower = state.snowParticleSpeed * 1.08;
    this.#particles.minSize = state.snowParticleSize * 0.55;
    this.#particles.maxSize = state.snowParticleSize * 1.45;
    this.#particles.emitRate = state.snowEmitRate;
    this.#particles.gravity.copyFromFloats(
      state.windDirection[0] * state.windVisualStrength * 1.5,
      -1.7,
      state.windDirection[2] * state.windVisualStrength * 1.5,
    );
  }

  dispose(): void {
    this.#particles.dispose(false);
    this.#particleTexture.dispose();
  }

  #recycleBlockedParticles(particles: Particle[]): void {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      if (!particle) continue;
      const previous = this.#previousParticleStates.get(particle.id);
      const wasReused = previous !== undefined && particle.age < previous.age;
      const blocked = previous !== undefined
        && !wasReused
        && this.#collisionBounds.some((bounds) =>
          segmentIntersectsPrecipitationBounds(previous, particle.position, bounds));

      if (blocked) {
        this.#previousParticleStates.delete(particle.id);
        this.#particles.recycleParticle(particle);
        continue;
      }

      if (previous) {
        previous.x = particle.position.x;
        previous.y = particle.position.y;
        previous.z = particle.position.z;
        previous.age = particle.age;
      } else {
        this.#previousParticleStates.set(particle.id, {
          x: particle.position.x,
          y: particle.position.y,
          z: particle.position.z,
          age: particle.age,
        });
      }
    }
  }
}

function collectStaticCollisionBounds(scene: Scene): readonly PrecipitationCollisionBounds[] {
  return Object.freeze(scene.meshes
    .filter((mesh) => mesh.checkCollisions && mesh.isEnabled())
    .map((mesh) => {
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      return Object.freeze({
        min: Object.freeze({
          x: box.minimumWorld.x,
          y: box.minimumWorld.y,
          z: box.minimumWorld.z,
        }),
        max: Object.freeze({
          x: box.maximumWorld.x,
          y: box.maximumWorld.y,
          z: box.maximumWorld.z,
        }),
      });
    }));
}

function createSnowParticleTexture(scene: Scene): DynamicTexture {
  const texture = new DynamicTexture(
    "weather-snow-particle-texture",
    { width: 32, height: 32 },
    scene,
    false,
  );
  const context = texture.getContext();
  context.clearRect(0, 0, 32, 32);
  const gradient = context.createRadialGradient(16, 16, 1, 16, 16, 15);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.35, "rgba(239, 248, 250, 0.92)");
  gradient.addColorStop(1, "rgba(214, 231, 235, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  texture.hasAlpha = true;
  texture.update(false);
  return texture;
}
