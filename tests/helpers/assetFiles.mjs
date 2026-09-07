// Node-only fixture I/O; no Node types or filesystem access enter browser code.
import { readFileSync } from "node:fs";
// Opt-in staged imports before promotion; never affect browser code.
export const readAsset = path => {
  const staged = {
    "public/assets/models/buildings/wood-foundation.glb": process.env.STORMHAVEN_FOUNDATION_GLB,
    "public/assets/models/buildings/wood-wall.glb": process.env.STORMHAVEN_WALL_GLB,
  };
  return new Uint8Array(readFileSync(staged[path] || path));
};
export const readSource = path => readFileSync(path, "utf8");
