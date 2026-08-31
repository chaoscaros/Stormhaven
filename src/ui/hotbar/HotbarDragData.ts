import { HOTBAR_SLOT_COUNT, type HotbarEntry } from "./HotbarModel";

export const HOTBAR_DRAG_MIME = "application/x-stormhaven-hotbar-entry";

export type HotbarDragPayload =
  | {
    readonly source: "catalog";
    readonly entry: Exclude<HotbarEntry, { readonly type: "empty" }>;
  }
  | {
    readonly source: "hotbar";
    readonly slotIndex: number;
  };

export function writeHotbarDragData(
  transfer: DataTransfer,
  payload: HotbarDragPayload,
): void {
  transfer.setData(HOTBAR_DRAG_MIME, JSON.stringify(payload));
  transfer.effectAllowed = payload.source === "hotbar" ? "move" : "copy";
}

export function readHotbarDragData(transfer: DataTransfer): HotbarDragPayload | undefined {
  const serialized = transfer.getData(HOTBAR_DRAG_MIME);
  if (!serialized) return undefined;
  try {
    const candidate: unknown = JSON.parse(serialized);
    if (!isRecord(candidate)) return undefined;
    if (candidate.source === "hotbar" && isSlotIndex(candidate.slotIndex)) {
      return { source: "hotbar", slotIndex: candidate.slotIndex };
    }
    if (candidate.source !== "catalog" || !isRecord(candidate.entry)) return undefined;
    const { type, id } = candidate.entry;
    if ((type !== "item" && type !== "build") || typeof id !== "string" || id.trim() === "") {
      return undefined;
    }
    return { source: "catalog", entry: { type, id } };
  } catch {
    return undefined;
  }
}

export function hasHotbarDragData(transfer: DataTransfer): boolean {
  return [...transfer.types].includes(HOTBAR_DRAG_MIME);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSlotIndex(value: unknown): value is number {
  return Number.isInteger(value)
    && Number(value) >= 0
    && Number(value) < HOTBAR_SLOT_COUNT;
}
