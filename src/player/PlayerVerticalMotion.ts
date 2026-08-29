export interface PlayerVerticalMotionConfig {
  readonly gravityMetersPerSecondSquared: number;
  readonly jumpSpeedMetersPerSecond: number;
}

/** 只计算垂直速度和位移，不依赖 Babylon、DOM 或输入事件。 */
export class PlayerVerticalMotion {
  readonly #gravity: number;
  readonly #jumpSpeed: number;
  #velocity = 0;

  constructor(config: PlayerVerticalMotionConfig) {
    if (!Number.isFinite(config.gravityMetersPerSecondSquared) || config.gravityMetersPerSecondSquared <= 0) {
      throw new Error("gravityMetersPerSecondSquared 必须是大于 0 的有限数值。");
    }
    if (!Number.isFinite(config.jumpSpeedMetersPerSecond) || config.jumpSpeedMetersPerSecond <= 0) {
      throw new Error("jumpSpeedMetersPerSecond 必须是大于 0 的有限数值。");
    }
    this.#gravity = config.gravityMetersPerSecondSquared;
    this.#jumpSpeed = config.jumpSpeedMetersPerSecond;
  }

  get velocityMetersPerSecond(): number {
    return this.#velocity;
  }

  tryJump(isGrounded: boolean): boolean {
    if (!isGrounded) {
      return false;
    }
    this.#velocity = this.#jumpSpeed;
    return true;
  }

  update(deltaSeconds: number, isGrounded: boolean): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new Error("deltaSeconds 必须是大于或等于 0 的有限数值。");
    }

    if (isGrounded && this.#velocity <= 0) {
      this.#velocity = 0;
      return 0;
    }

    this.#velocity -= this.#gravity * deltaSeconds;
    return this.#velocity * deltaSeconds;
  }
}
