// Node-only fixture I/O; no Node types or filesystem access enter browser code.
import { readFileSync } from "node:fs";
export const readAsset = path => new Uint8Array(readFileSync(path));
export const readSource = path => readFileSync(path, "utf8");
