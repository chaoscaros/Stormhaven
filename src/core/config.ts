export interface Vector3Data {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface WorldConfig {
  readonly sizeMeters: number;
  readonly groundThicknessMeters: number;
}

export interface PlayerConfig {
  readonly eyeHeightMeters: number;
  readonly walkSpeedMetersPerSecond: number;
  readonly runSpeedMetersPerSecond: number;
  readonly jumpSpeedMetersPerSecond: number;
  readonly lookSensitivity: number;
  readonly spawnPosition: Vector3Data;
}

export interface SimulationConfig {
  readonly initialDay: number;
  readonly initialHour: number;
  readonly initialMinute: number;
  /** 每经过 1 个真实秒所推进的游戏秒数。 */
  readonly timeScale: number;
  /** 防止后台 Tab 恢复时单帧推进过多模拟时间。 */
  readonly maxDeltaSeconds: number;
}

export const WORLD_CONFIG: Readonly<WorldConfig> = Object.freeze({
  sizeMeters: 500,
  groundThicknessMeters: 1,
});

export const PLAYER_CONFIG = Object.freeze({
  eyeHeightMeters: 1.75,
  walkSpeedMetersPerSecond: 4.5,
  runSpeedMetersPerSecond: 7.5,
  jumpSpeedMetersPerSecond: 7,
  lookSensitivity: 1_500,
  spawnPosition: Object.freeze({ x: 0, y: 1.8, z: -8 }),
});

export const SIMULATION_CONFIG: Readonly<SimulationConfig> = Object.freeze({
  initialDay: 1,
  initialHour: 14,
  initialMinute: 0,
  timeScale: 240,
  maxDeltaSeconds: 0.25,
});
