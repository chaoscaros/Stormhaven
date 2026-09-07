import type { SpatialPoint } from "../survival/environment/SpatialPoint";

export interface PlayerTransform {
  readonly position: SpatialPoint;
  /** Radians, Babylon yaw (Y) and pitch (X); no roll or transient velocity. */
  readonly rotation: { readonly yaw: number; readonly pitch: number };
}

export interface PlayerTransformPort {
  captureTransform(): PlayerTransform;
  restoreTransform(transform: PlayerTransform): void;
}
