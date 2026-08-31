import type { BuildCatalog } from "../building/BuildCatalog";
import type { BuildDefinition } from "../building/BuildingTypes";
import type { Inventory } from "../inventory/Inventory";
import type { ItemCatalog } from "../items/ItemCatalog";
import type { GameUiModeController } from "./GameUiModeController";
import type { HotbarModel } from "./hotbar/HotbarModel";
import { setupHotbarEditor } from "./hotbar/setupHotbarEditor";

export interface BuildingDebugUi {
  refresh(): void;
  showPlacementStatus(message: string, valid: boolean): void;
  hidePlacementStatus(): void;
  dispose(): void;
}

interface BuildingDebugUiCallbacks {
  readonly onSelect: (definitionId: string) => void;
}

/** 鼠标优先的工业遥测风格 Building Menu；只读取 Catalog 与 Inventory。 */
export function setupBuildingDebugUi(
  definitions: BuildCatalog,
  inventory: Inventory,
  items: ItemCatalog,
  modes: GameUiModeController,
  hotbar: HotbarModel,
  callbacks: BuildingDebugUiCallbacks,
): BuildingDebugUi {
  const panel = getElement("building-panel");
  const closeButton = getElement<HTMLButtonElement>("building-close-button");
  const definitionListElement = getElement("building-definition-list");
  const name = getElement("building-definition-name");
  const detailIcon = getElement("building-definition-icon");
  const description = getElement("building-definition-description");
  const requirements = getElement<HTMLUListElement>("building-requirements");
  const status = getElement("building-status");
  const selectButton = getElement<HTMLButtonElement>("building-select-button");
  const placementStatus = getElement("building-placement-status");
  const crosshair = getElement("crosshair");
  const hotbarEditorRoot = getElement("building-hotbar-editor");
  const definitionList = definitions.getAll();
  let selectedIndex = 0;

  const getSelected = (): BuildDefinition | undefined => definitionList[selectedIndex];
  const hotbarEditor = setupHotbarEditor({
    root: hotbarEditorRoot,
    model: hotbar,
    items,
    builds: definitions,
    getEntryToAssign: () => {
      const definition = getSelected();
      return definition ? { type: "build", id: definition.id } : undefined;
    },
  });

  const render = (): void => {
    const definition = getSelected();
    if (!definition) return;
    name.textContent = definition.displayName;
    detailIcon.dataset.icon = definition.id;
    description.textContent = definition.description;
    const costState = definition.cost.map((cost) => {
      const available = inventory.getItemCount(cost.itemId);
      return { ...cost, available, satisfied: available >= cost.quantity };
    });
    requirements.replaceChildren(...costState.map((cost) => {
      const row = document.createElement("li");
      const label = document.createElement("span");
      const count = document.createElement("strong");
      label.textContent = items.get(cost.itemId).displayName;
      count.textContent = `${cost.quantity} / ${cost.available}`;
      count.dataset.satisfied = cost.satisfied ? "true" : "false";
      row.append(label, count);
      return row;
    }));
    const missing = costState.filter((cost) => !cost.satisfied);
    const canBuild = missing.length === 0;
    status.textContent = canBuild
      ? "可以建造"
      : `缺少 ${missing.map((cost) =>
        `${items.get(cost.itemId).displayName} ×${cost.quantity - cost.available}`).join("、")}`;
    status.dataset.available = canBuild ? "true" : "false";
    selectButton.disabled = !canBuild;
    for (const [index, button] of [...definitionListElement.querySelectorAll("button")].entries()) {
      button.setAttribute("aria-current", index === selectedIndex ? "true" : "false");
    }
    hotbarEditor.refresh();
  };

  const definitionButtons = definitionList.map((definition, index) => {
    const button = document.createElement("button");
    button.type = "button";
    const title = document.createElement("span");
    const icon = document.createElement("span");
    icon.className = "ui-icon";
    icon.dataset.icon = definition.id;
    icon.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span");
    copy.className = "menu-list-card__copy";
    const meta = document.createElement("small");
    title.textContent = definition.displayName;
    meta.textContent = definition.category === "foundation"
      ? "GROUND / GRID"
      : definition.category === "wall"
        ? "EDGE / SNAP"
        : "SURVIVAL / GROUND";
    copy.append(title, meta);
    button.append(icon, copy);
    const handleClick = (): void => {
      selectedIndex = index;
      render();
    };
    button.addEventListener("click", handleClick);
    definitionListElement.append(button);
    return { button, handleClick };
  });

  const close = (): void => modes.resumeGameplay();
  const select = (): void => {
    const definition = getSelected();
    if (!definition || selectButton.disabled) return;
    callbacks.onSelect(definition.id);
  };
  const unsubscribeMode = modes.subscribe((state) => {
    panel.hidden = state.mode !== "player_menu" || state.playerMenuTab !== "building";
    if (!panel.hidden) render();
    if (state.mode !== "build_placement") placementStatus.hidden = true;
  });

  closeButton.addEventListener("click", close);
  selectButton.addEventListener("click", select);
  render();

  return {
    refresh: render,
    showPlacementStatus(message: string, valid: boolean): void {
      placementStatus.textContent = message;
      placementStatus.dataset.valid = valid ? "true" : "false";
      placementStatus.hidden = false;
      crosshair.dataset.buildValid = valid ? "true" : "false";
    },
    hidePlacementStatus(): void {
      placementStatus.hidden = true;
      delete crosshair.dataset.buildValid;
    },
    dispose(): void {
      closeButton.removeEventListener("click", close);
      selectButton.removeEventListener("click", select);
      unsubscribeMode();
      hotbarEditor.dispose();
      definitionButtons.forEach(({ button, handleClick }) =>
        button.removeEventListener("click", handleClick));
    },
  };
}

function getElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`缺少必需的界面元素：#${id}`);
  return element as T;
}
