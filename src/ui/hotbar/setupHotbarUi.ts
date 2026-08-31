import type { BuildCatalog } from "../../building/BuildCatalog";
import type { Inventory } from "../../inventory/Inventory";
import type { ItemCatalog } from "../../items/ItemCatalog";
import type { GameUiModeController } from "../GameUiModeController";
import {
  HotbarModel,
  isHotbarGameplayMode,
  type HotbarEntry,
  type HotbarSlot,
} from "./HotbarModel";

export interface HotbarUi {
  refresh(): void;
  dispose(): void;
}

interface HotbarUiCallbacks {
  readonly onBuildSelected: (definitionId: string) => void;
  readonly onNonBuildSelected: () => void;
}

/** 将纯 Hotbar 状态连接到键盘、滚轮与现有 BuildPlacement。 */
export function setupHotbarUi(
  canvas: HTMLCanvasElement,
  inventory: Inventory,
  items: ItemCatalog,
  builds: BuildCatalog,
  modes: GameUiModeController,
  callbacks: HotbarUiCallbacks,
): HotbarUi {
  const root = getElement("hotbar");
  const model = new HotbarModel();
  const buttonBindings = model.slots.map((slot) => createSlotButton(slot));
  const clickHandlers = new Map<HTMLButtonElement, () => void>();
  root.replaceChildren(...buttonBindings.map(({ button }) => button));

  const render = (): void => {
    for (const { slot, button, quantity } of buttonBindings) {
      const selected = slot.slotIndex === model.selectedIndex;
      button.dataset.selected = selected ? "true" : "false";
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      if (slot.entry.type === "item") {
        const count = inventory.getItemCount(slot.entry.id);
        quantity.textContent = count > 0 ? `${count}` : "0";
        quantity.hidden = false;
        button.dataset.available = count > 0 ? "true" : "false";
      } else {
        quantity.hidden = true;
        delete button.dataset.available;
      }
    }
  };

  const activateSelection = (entry: HotbarEntry): void => {
    if (entry.type === "build") callbacks.onBuildSelected(entry.id);
    else callbacks.onNonBuildSelected();
  };

  const select = (slotIndex: number): void => {
    const selection = model.select(slotIndex);
    render();
    activateSelection(selection.slot.entry);
  };

  for (const { slot, button } of buttonBindings) {
    const handleClick = (): void => {
      if (isHotbarGameplayMode(modes.mode)) select(slot.slotIndex);
    };
    button.addEventListener("click", handleClick);
    clickHandlers.set(button, handleClick);
  }

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || !isHotbarGameplayMode(modes.mode)) return;
    const selection = model.selectKeyCode(event.code);
    if (!selection) return;
    event.preventDefault();
    render();
    activateSelection(selection.slot.entry);
  };

  const handleWheel = (event: WheelEvent): void => {
    if (!isHotbarGameplayMode(modes.mode) || event.deltaY === 0) return;
    event.preventDefault();
    const selection = model.cycleByWheel(event.deltaY);
    render();
    activateSelection(selection.slot.entry);
  };

  const unsubscribeMode = modes.subscribe((state) => {
    root.hidden = !isHotbarGameplayMode(state.mode);
  });
  window.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  render();

  return {
    refresh: render,
    dispose(): void {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("wheel", handleWheel);
      unsubscribeMode();
      for (const { button } of buttonBindings) {
        const handleClick = clickHandlers.get(button);
        if (handleClick) button.removeEventListener("click", handleClick);
      }
    },
  };

  function createSlotButton(slot: HotbarSlot): {
    readonly slot: HotbarSlot;
    readonly button: HTMLButtonElement;
    readonly quantity: HTMLElement;
  } {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hotbar__slot";
    button.setAttribute("aria-label", describeEntry(slot.entry));
    const key = document.createElement("kbd");
    key.textContent = `${slot.slotIndex + 1}`;
    const icon = document.createElement("span");
    icon.className = "ui-icon";
    icon.dataset.icon = iconId(slot.entry);
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "hotbar__label";
    label.textContent = entryDisplayName(slot.entry);
    const quantity = document.createElement("strong");
    quantity.className = "hotbar__quantity";
    button.append(key, icon, label, quantity);
    return { slot, button, quantity };
  }

  function entryDisplayName(entry: HotbarEntry): string {
    if (entry.type === "build") return builds.get(entry.id).displayName;
    if (entry.type === "item") return items.get(entry.id).displayName;
    return "空槽";
  }

  function describeEntry(entry: HotbarEntry): string {
    if (entry.type === "empty") return "空快捷槽";
    return `${entry.type === "build" ? "建造" : "物品"}：${entryDisplayName(entry)}`;
  }
}

function iconId(entry: HotbarEntry): string {
  if (entry.type === "empty") return "empty";
  return entry.id;
}

function getElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`缺少必需的界面元素：#${id}`);
  return element as T;
}
