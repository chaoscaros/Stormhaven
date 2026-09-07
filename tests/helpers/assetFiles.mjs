// Node-only fixture I/O; no Node types or filesystem access enter browser code.
import { readFileSync } from "node:fs";
// Opt-in staged Foundation import before promotion; never affects browser code.
export const readAsset = path => new Uint8Array(readFileSync(
  path === "public/assets/models/buildings/wood-foundation.glb" && process.env.STORMHAVEN_FOUNDATION_GLB
    ? process.env.STORMHAVEN_FOUNDATION_GLB : path
));
export const readSource = path => readFileSync(path, "utf8");
