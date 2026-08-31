export const BUILDING_CONFIG = Object.freeze({
  gridSizeMeters: 2,
  foundationGridOriginMeters: Object.freeze({ x: 0, z: 1 }),
  maximumBuildDistanceMeters: 5,
  wallSnapSearchRadiusMeters: 1.25,
  overlapEpsilonMeters: 0.001,
});

export const BUILDING_INPUT_CONFIG = Object.freeze({
  toggleKeyCode: "KeyB",
  rotateKeyCode: "KeyR",
  cancelKeyCode: "Escape",
});
