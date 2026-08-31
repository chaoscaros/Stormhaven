import type { GameUiMode } from "../GameUiModeController";

export const HOTBAR_SLOT_COUNT = 8;

export type HotbarEntry =
  | { readonly type: "empty" }
  | { readonly type: "item"; readonly id: string }
  | { readonly type: "build"; readonly id: string };

export interface HotbarSlot {
  /** Zero-based index; the player-facing key is slotIndex + 1. */
  readonly slotIndex: number;
  readonly entry: HotbarEntry;
}

export interface HotbarSelection {
  readonly selectedIndex: number;
  readonly slot: HotbarSlot;
  readonly changed: boolean;
}

export type HotbarListener = (slots: readonly HotbarSlot[]) => void;

const EMPTY_ENTRY: HotbarEntry = Object.freeze({ type: "empty" });

export const DEFAULT_HOTBAR_SLOTS: readonly HotbarSlot[] = createHotbarSlots([
  { type: "build", id: "foundation_wood" },
  { type: "build", id: "wall_wood" },
  { type: "build", id: "campfire_basic" },
]);

/** DOM/Babylon 无关、支持当前会话编辑的 8 格快捷栏状态。 */
export class HotbarModel {
  readonly #listeners = new Set<HotbarListener>();
  #slots: readonly HotbarSlot[];
  #selectedIndex = 0;

  constructor(slots: readonly HotbarSlot[] = DEFAULT_HOTBAR_SLOTS) {
    validateSlots(slots);
    this.#slots = Object.freeze(slots.map((slot) => Object.freeze({
      slotIndex: slot.slotIndex,
      entry: Object.freeze({ ...slot.entry }),
    })));
  }

  get slots(): readonly HotbarSlot[] {
    return this.#slots;
  }

  get selectedIndex(): number {
    return this.#selectedIndex;
  }

  get selectedSlot(): HotbarSlot {
    return this.#slots[this.#selectedIndex] as HotbarSlot;
  }

  select(index: number): HotbarSelection {
    if (!Number.isInteger(index) || index < 0 || index >= HOTBAR_SLOT_COUNT) {
      return this.#selection(false);
    }
    const changed = index !== this.#selectedIndex;
    this.#selectedIndex = index;
    return this.#selection(changed);
  }

  selectKeyCode(code: string): HotbarSelection | undefined {
    const match = /^(?:Digit|Numpad)([1-8])$/.exec(code);
    if (!match) return undefined;
    return this.select(Number(match[1]) - 1);
  }

  cycleByWheel(deltaY: number): HotbarSelection {
    if (!Number.isFinite(deltaY) || deltaY === 0) return this.#selection(false);
    const direction = deltaY > 0 ? 1 : -1;
    return this.select((this.#selectedIndex + direction + HOTBAR_SLOT_COUNT) % HOTBAR_SLOT_COUNT);
  }

  assign(slotIndex: number, entry: Exclude<HotbarEntry, { readonly type: "empty" }>): boolean {
    if (!isValidSlotIndex(slotIndex) || entry.id.trim().length === 0) return false;
    this.#replaceEntry(slotIndex, entry);
    return true;
  }

  clear(slotIndex: number): boolean {
    if (!isValidSlotIndex(slotIndex)) return false;
    this.#replaceEntry(slotIndex, EMPTY_ENTRY);
    return true;
  }

  swap(firstSlotIndex: number, secondSlotIndex: number): boolean {
    if (
      !isValidSlotIndex(firstSlotIndex)
      || !isValidSlotIndex(secondSlotIndex)
      || firstSlotIndex === secondSlotIndex
    ) return false;
    const first = this.#slots[firstSlotIndex] as HotbarSlot;
    const second = this.#slots[secondSlotIndex] as HotbarSlot;
    this.#slots = Object.freeze(this.#slots.map((slot, index) => {
      if (index === firstSlotIndex) {
        return Object.freeze({ slotIndex: index, entry: Object.freeze({ ...second.entry }) });
      }
      if (index === secondSlotIndex) {
        return Object.freeze({ slotIndex: index, entry: Object.freeze({ ...first.entry }) });
      }
      return slot;
    }));
    this.#notify();
    return true;
  }

  subscribe(listener: HotbarListener): () => void {
    this.#listeners.add(listener);
    listener(this.#slots);
    return () => this.#listeners.delete(listener);
  }

  #selection(changed: boolean): HotbarSelection {
    return Object.freeze({
      selectedIndex: this.#selectedIndex,
      slot: this.selectedSlot,
      changed,
    });
  }

  #replaceEntry(slotIndex: number, entry: HotbarEntry): void {
    const current = this.#slots[slotIndex] as HotbarSlot;
    if (sameEntry(current.entry, entry)) return;
    this.#slots = Object.freeze(this.#slots.map((slot, index) => index === slotIndex
      ? Object.freeze({ slotIndex, entry: Object.freeze({ ...entry }) })
      : slot));
    this.#notify();
  }

  #notify(): void {
    for (const listener of this.#listeners) listener(this.#slots);
  }
}

export function isHotbarGameplayMode(mode: GameUiMode): boolean {
  return mode === "gameplay" || mode === "build_placement";
}

function createHotbarSlots(entries: readonly HotbarEntry[]): readonly HotbarSlot[] {
  return Object.freeze(Array.from({ length: HOTBAR_SLOT_COUNT }, (_, slotIndex) => Object.freeze({
    slotIndex,
    entry: Object.freeze({ ...(entries[slotIndex] ?? EMPTY_ENTRY) }),
  })));
}

function validateSlots(slots: readonly HotbarSlot[]): void {
  if (slots.length !== HOTBAR_SLOT_COUNT) {
    throw new Error(`Hotbar 必须包含 ${HOTBAR_SLOT_COUNT} 个槽位。`);
  }
  slots.forEach((slot, index) => {
    if (slot.slotIndex !== index) throw new Error("Hotbar slotIndex 必须连续且从 0 开始。");
    if (slot.entry.type !== "empty" && slot.entry.id.trim().length === 0) {
      throw new Error("Hotbar entryId 不能为空。");
    }
  });
}

function isValidSlotIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < HOTBAR_SLOT_COUNT;
}

function sameEntry(first: HotbarEntry, second: HotbarEntry): boolean {
  return first.type === second.type
    && (first.type === "empty" || second.type === "empty" || first.id === second.id);
}
