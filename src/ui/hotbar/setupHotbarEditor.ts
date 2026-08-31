import type { BuildCatalog } from "../../building/BuildCatalog";
import type { ItemCatalog } from "../../items/ItemCatalog";
import {
  HOTBAR_SLOT_COUNT,
  type HotbarEntry,
  type HotbarModel,
} from "./HotbarModel";

export interface HotbarEditor {
  refresh(): void;
  dispose(): void;
}

interface HotbarEditorOptions {
  readonly root: HTMLElement;
  readonly model: HotbarModel;
  readonly items: ItemCatalog;
  readonly builds: BuildCatalog;
  readonly getEntryToAssign: () => Exclude<HotbarEntry, { readonly type: "empty" }> | undefined;
}

/** Player Menu 内的轻量槽位绑定器；点击主体覆盖，点击 × 清空。 */
export function setupHotbarEditor(options: HotbarEditorOptions): HotbarEditor {
  const bindings = Array.from({ length: HOTBAR_SLOT_COUNT }, (_, slotIndex) => {
    const row = document.createElement("div");
    row.className = "hotbar-editor__slot";
    const assignButton = document.createElement("button");
    assignButton.type = "button";
    assignButton.className = "hotbar-editor__assign";
    const key = document.createElement("kbd");
    key.textContent = `${slotIndex + 1}`;
    const current = document.createElement("span");
    const action = document.createElement("small");
    action.textContent = "覆盖";
    assignButton.append(key, current, action);
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "hotbar-editor__clear";
    clearButton.textContent = "×";
    clearButton.setAttribute("aria-label", `清空快捷栏第 ${slotIndex + 1} 格`);
    const assign = (): void => {
      const entry = options.getEntryToAssign();
      if (entry) options.model.assign(slotIndex, entry);
    };
    const clear = (): void => { options.model.clear(slotIndex); };
    assignButton.addEventListener("click", assign);
    clearButton.addEventListener("click", clear);
    row.append(assignButton, clearButton);
    return { slotIndex, row, assignButton, clearButton, current, assign, clear };
  });
  options.root.replaceChildren(...bindings.map((binding) => binding.row));

  const refresh = (): void => {
    const entryToAssign = options.getEntryToAssign();
    for (const binding of bindings) {
      const slot = options.model.slots[binding.slotIndex];
      if (!slot) continue;
      binding.current.textContent = describeEntry(slot.entry, options.items, options.builds);
      binding.assignButton.disabled = !entryToAssign;
      binding.assignButton.dataset.target = entryToAssign && sameEntry(slot.entry, entryToAssign)
        ? "true"
        : "false";
      binding.clearButton.disabled = slot.entry.type === "empty";
    }
  };
  const unsubscribe = options.model.subscribe(refresh);

  return {
    refresh,
    dispose(): void {
      unsubscribe();
      for (const binding of bindings) {
        binding.assignButton.removeEventListener("click", binding.assign);
        binding.clearButton.removeEventListener("click", binding.clear);
      }
    },
  };
}

function describeEntry(entry: HotbarEntry, items: ItemCatalog, builds: BuildCatalog): string {
  if (entry.type === "item") return items.get(entry.id).displayName;
  if (entry.type === "build") return builds.get(entry.id).displayName;
  return "空槽";
}

function sameEntry(first: HotbarEntry, second: HotbarEntry): boolean {
  if (first.type !== second.type || first.type === "empty" || second.type === "empty") return false;
  return first.id === second.id;
}
