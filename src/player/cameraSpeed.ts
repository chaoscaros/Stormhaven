/**
 * Babylon TargetCamera 在稳定帧率下将 `camera.speed` 乘以 sqrt(10)，
 * 转换为近似每秒世界单位，因此这里集中处理米/秒配置的换算。
 */
const BABYLON_SPEED_FACTOR = Math.sqrt(10);

export function toBabylonCameraSpeed(metersPerSecond: number): number {
  if (!Number.isFinite(metersPerSecond) || metersPerSecond < 0) {
    throw new Error("metersPerSecond 必须是大于或等于 0 的有限数值。");
  }
  return metersPerSecond / BABYLON_SPEED_FACTOR;
}
