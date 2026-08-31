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
import {
  hasHotbarDragData,
  readHotbarDragData,
  writeHotbarDragData,
} from "./HotbarDragData";

export interface HotbarUi {
  refresh(): void;
  dispose(): void;
}

interface HotbarUiCallbacks {
  readonly onBuildSelected: (definitionId: string) => void;
  readonly onNonBuildSelected: () => void;
  readonly getMenuEntryToAssign: () => Exclude<HotbarEntry, { readonly type: "empty" }> | undefined;
}

/** 将纯 Hotbar 状态连接到键盘、滚轮与现有 BuildPlacement。 */
export function setupHotbarUi(
  canvas: HTMLCanvasElement,
  inventory: Inventory,
  items: ItemCatalog,
  builds: BuildCatalog,
  modes: GameUiModeController,
  model: HotbarModel,
  callbacks: HotbarUiCallbacks,
): HotbarUi {
  const root = getElement("hotbar");
  const buttonBindings = model.slots.map((slot) => createSlotButton(slot.slotIndex));
  const discardZone = document.createElement("div");
  discardZone.className = "hotbar__discard";
  discardZone.textContent = "拖到这里清空";
  discardZone.setAttribute("aria-label", "将快捷栏槽位拖到这里清空");
  root.replaceChildren(...buttonBindings.map(({ frame }) => frame), discardZone);

  const render = (): void => {
    for (const { slotIndex, frame, button, clearButton, icon, label, quantity } of buttonBindings) {
      const slot = model.slots[slotIndex] as HotbarSlot;
      const selected = slotIndex === model.selectedIndex;
      button.dataset.selected = selected ? "true" : "false";
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.setAttribute("aria-label", describeEntry(slot.entry));
      icon.dataset.icon = iconId(slot.entry);
      label.textContent = entryDisplayName(slot.entry);
      frame.dataset.empty = slot.entry.type === "empty" ? "true" : "false";
      clearButton.disabled = slot.entry.type === "empty";
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

  for (const binding of buttonBindings) {
    const { slotIndex, button, clearButton } = binding;
    const handleClick = (): void => {
      if (isHotbarGameplayMode(modes.mode)) {
        select(slotIndex);
        return;
      }
      if (modes.mode === "player_menu") {
        const entry = callbacks.getMenuEntryToAssign();
        if (entry) model.assign(slotIndex, entry);
      }
    };
    const handleClear = (): void => { model.clear(slotIndex); };
    const handleDragStart = (event: DragEvent): void => {
      if (modes.mode !== "player_menu" || !event.dataTransfer) {
        event.preventDefault();
        return;
      }
      const slot = model.slots[slotIndex];
      if (!slot || slot.entry.type === "empty") {
        event.preventDefault();
        return;
      }
      writeHotbarDragData(event.dataTransfer, { source: "hotbar", slotIndex });
      root.dataset.dragging = "true";
      binding.frame.dataset.dragging = "true";
    };
    const handleDragEnd = (): void => {
      delete root.dataset.dragging;
      delete binding.frame.dataset.dragging;
      delete binding.frame.dataset.dropTarget;
    };
    const handleDragOver = (event: DragEvent): void => {
      if (modes.mode !== "player_menu" || !event.dataTransfer || !hasHotbarDragData(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = event.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
      binding.frame.dataset.dropTarget = "true";
    };
    const handleDragLeave = (): void => { delete binding.frame.dataset.dropTarget; };
    const handleDrop = (event: DragEvent): void => {
      event.preventDefault();
      delete binding.frame.dataset.dropTarget;
      if (!event.dataTransfer) return;
      const payload = readHotbarDragData(event.dataTransfer);
      if (!payload) return;
      if (payload.source === "hotbar") model.swap(payload.slotIndex, slotIndex);
      else if (
        (payload.entry.type === "item" && items.has(payload.entry.id))
        || (payload.entry.type === "build" && builds.has(payload.entry.id))
      ) model.assign(slotIndex, payload.entry);
    };
    button.addEventListener("click", handleClick);
    clearButton.addEventListener("click", handleClear);
    button.addEventListener("dragstart", handleDragStart);
    button.addEventListener("dragend", handleDragEnd);
    binding.frame.addEventListener("dragover", handleDragOver);
    binding.frame.addEventListener("dragleave", handleDragLeave);
    binding.frame.addEventListener("drop", handleDrop);
    Object.assign(binding, {
      handleClick,
      handleClear,
      handleDragStart,
      handleDragEnd,
      handleDragOver,
      handleDragLeave,
      handleDrop,
    });
  }

  const handleDiscardDragOver = (event: DragEvent): void => {
    if (
      modes.mode !== "player_menu"
      || !event.dataTransfer
      || event.dataTransfer.effectAllowed !== "move"
      || !hasHotbarDragData(event.dataTransfer)
    ) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    discardZone.dataset.dropTarget = "true";
  };
  const handleDiscardDragLeave = (): void => { delete discardZone.dataset.dropTarget; };
  const handleDiscardDrop = (event: DragEvent): void => {
    event.preventDefault();
    delete discardZone.dataset.dropTarget;
    if (!event.dataTransfer) return;
    const payload = readHotbarDragData(event.dataTransfer);
    if (payload?.source === "hotbar") model.clear(payload.slotIndex);
  };
  discardZone.addEventListener("dragover", handleDiscardDragOver);
  discardZone.addEventListener("dragleave", handleDiscardDragLeave);
  discardZone.addEventListener("drop", handleDiscardDrop);

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
    root.hidden = !isHotbarGameplayMode(state.mode) && state.mode !== "player_menu";
    root.dataset.editing = state.mode === "player_menu" ? "true" : "false";
    for (const { button } of buttonBindings) {
      button.draggable = state.mode === "player_menu";
    }
  });
  const unsubscribeModel = model.subscribe(render);
  window.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  render();

  return {
    refresh: render,
    dispose(): void {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("wheel", handleWheel);
      unsubscribeMode();
      unsubscribeModel();
      discardZone.removeEventListener("dragover", handleDiscardDragOver);
      discardZone.removeEventListener("dragleave", handleDiscardDragLeave);
      discardZone.removeEventListener("drop", handleDiscardDrop);
      for (const binding of buttonBindings) {
        binding.button.removeEventListener("click", binding.handleClick);
        binding.clearButton.removeEventListener("click", binding.handleClear);
        binding.button.removeEventListener("dragstart", binding.handleDragStart);
        binding.button.removeEventListener("dragend", binding.handleDragEnd);
        binding.frame.removeEventListener("dragover", binding.handleDragOver);
        binding.frame.removeEventListener("dragleave", binding.handleDragLeave);
        binding.frame.removeEventListener("drop", binding.handleDrop);
      }
    },
  };

  function createSlotButton(slotIndex: number): {
    readonly slotIndex: number;
    readonly frame: HTMLElement;
    readonly button: HTMLButtonElement;
    readonly clearButton: HTMLButtonElement;
    readonly icon: HTMLElement;
    readonly label: HTMLElement;
    readonly quantity: HTMLElement;
    handleClick: () => void;
    handleClear: () => void;
    handleDragStart: (event: DragEvent) => void;
    handleDragEnd: () => void;
    handleDragOver: (event: DragEvent) => void;
    handleDragLeave: () => void;
    handleDrop: (event: DragEvent) => void;
  } {
    const slot = model.slots[slotIndex] as HotbarSlot;
    const frame = document.createElement("div");
    frame.className = "hotbar__slot-frame";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hotbar__slot";
    button.setAttribute("aria-label", describeEntry(slot.entry));
    const key = document.createElement("kbd");
    key.textContent = `${slotIndex + 1}`;
    const icon = document.createElement("span");
    icon.className = "ui-icon";
    icon.dataset.icon = iconId(slot.entry);
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "hotbar__label";
    label.textContent = entryDisplayName(slot.entry);
    const quantity = document.createElement("strong");
    quantity.className = "hotbar__quantity";
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "hotbar__clear";
    clearButton.textContent = "×";
    clearButton.setAttribute("aria-label", `清空快捷栏第 ${slotIndex + 1} 格`);
    button.append(key, icon, label, quantity);
    frame.append(button, clearButton);
    const noop = (): void => undefined;
    return {
      slotIndex,
      frame,
      button,
      clearButton,
      icon,
      label,
      quantity,
      handleClick: noop,
      handleClear: noop,
      handleDragStart: noop,
      handleDragEnd: noop,
      handleDragOver: noop,
      handleDragLeave: noop,
      handleDrop: noop,
    };
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
