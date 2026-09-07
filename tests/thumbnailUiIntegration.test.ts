import { afterEach, expect, it, vi } from "vitest";
import { setupFoundationUi } from "../src/ui/setupFoundationUi";
import { setupCraftingDebugUi } from "../src/ui/setupCraftingDebugUi";
import { setupBuildingDebugUi } from "../src/ui/setupBuildingDebugUi";
import { setupCampfireUi } from "../src/ui/setupCampfireUi";
import { setupHotbarUi } from "../src/ui/hotbar/setupHotbarUi";
import { HOTBAR_DRAG_MIME } from "../src/ui/hotbar/HotbarDragData";
import { installUiDom, emit, UiElement } from "./helpers/uiDomFixture";
import { createSaveFixture } from "./helpers/saveFixture";
import { readSource } from "./helpers/assetFiles.mjs";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function setup() {
  const dom = installUiDom();
  const fixture = createSaveFixture();
  const foundation = setupFoundationUi(dom.canvasDom, { onSimulationPausedChanged: vi.fn() });
  foundation.showReady();
  foundation.modes.startGame();
  return { ...dom, ...fixture, foundation, modes: foundation.modes };
}

const artIds = (element: UiElement): string[] => element.querySelectorAll(".gameplay-thumbnail").map((art) => art.dataset.thumbnail!);

it("Inventory's real renderer uses all 24 slots and hover/focus updates thumbnail details without clicks", () => {
  const s = setup();
  s.gameplay.inventory.addItem("wood",2);
  s.gameplay.inventory.addItem("stick",1);
  s.modes.openPlayerMenu("inventory");
  s.foundation.updateInventory(s.gameplay.inventory.snapshot,s.gameplay.itemCatalog);
  const list = s.get("inventory-items");
  expect(list.children).toHaveLength(24);
  expect(artIds(list)).toEqual(["wood","stick"]);
  const branch = list.querySelectorAll("button")[1]!;
  emit(branch,"pointerenter");
  expect(s.get("inventory-detail-icon").dataset.thumbnail).toBe("stick");
  expect(s.get("inventory-tooltip-icon").dataset.thumbnail).toBe("stick");
  expect(s.get("inventory-tooltip").hidden).toBe(false);
  const original = branch.querySelector("img");
  emit(branch,"focus");
  expect(branch.querySelector("img")).toBe(original);
  emit(branch,"blur");
  expect(s.get("inventory-tooltip").hidden).toBe(true);
  s.foundation.dispose();
});

it("Crafting output and actual stick/stone recipe inputs use object art; crafting still consumes the same items", () => {
  const s = setup();
  const g = s.gameplay;
  g.inventory.addItem("stick",2); g.inventory.addItem("stone",2);
  const ui = setupCraftingDebugUi(g.craftingService,g.recipeCatalog,g.itemCatalog,s.modes,{ onInventoryChanged: vi.fn() });
  s.modes.openPlayerMenu("crafting");
  expect(s.get("crafting-detail-icon").dataset.thumbnail).toBe("stone_axe");
  expect(artIds(s.get("crafting-recipe-list"))).toEqual(["stone_axe"]);
  expect(artIds(s.get("crafting-requirements"))).toEqual(["stick","stone"]);
  expect(artIds(s.get("crafting-output"))).toEqual(["stone_axe"]);
  emit(s.get("crafting-action-button"),"click");
  expect(g.inventory.getItemCount("stone_axe")).toBe(1);
  expect(g.inventory.getItemCount("stick")).toBe(0);
  ui.dispose(); s.foundation.dispose();
});

it("Building and campfire actual renderers distinguish object art from fuel/action UI", () => {
  const s = setup();
  const g = s.gameplay;
  const building = setupBuildingDebugUi(g.buildCatalog,g.inventory,g.itemCatalog,s.modes,{ onSelect: vi.fn() });
  s.modes.openPlayerMenu("building");
  expect(artIds(s.get("building-definition-list"))).toEqual(["foundation_wood","wall_wood","campfire_basic"]);
  const fireButton = s.get("building-definition-list").querySelectorAll("button")[2]!;
  emit(fireButton,"click");
  expect(s.get("building-definition-icon").dataset.thumbnail).toBe("campfire_basic");
  expect(artIds(s.get("building-requirements"))).toEqual(["stone","wood"]);
  const campfire = setupCampfireUi(g.campfireSystem,g.fuelCatalog,g.inventory,g.itemCatalog,s.modes,{ onInventoryChanged: vi.fn() });
  expect(s.get("campfire-object-art").dataset.thumbnail).toBe("campfire_basic");
  expect(s.get("campfire-fuel-art").dataset.thumbnail).toBe("wood");
  expect(s.get("campfire-ignite-button").querySelector("img")).toBeNull();
  building.dispose(); campfire.dispose(); s.foundation.dispose();
});

it("Hotbar keeps art through menu drag/drop, swaps/clear, and short name timing follows actual keyboard selection", () => {
  vi.useFakeTimers();
  const s = setup();
  const g = s.gameplay;
  g.inventory.addItem("wood",3);
  const buildSelected = vi.fn();
  const ui = setupHotbarUi(s.canvasDom,g.inventory,g.itemCatalog,g.buildCatalog,s.modes,s.hotbar,{
    onBuildSelected: buildSelected,onNonBuildSelected: vi.fn(),getMenuEntryToAssign: () => ({ type: "item",id: "wood" }),
  });
  const root = s.get("hotbar");
  const frames = root.querySelectorAll(".hotbar__slot-frame");
  const slots = root.querySelectorAll(".hotbar__slot");
  expect(root.querySelector(".hotbar__label")).toBeNull();
  expect(artIds(frames[0]!)).toEqual(["foundation_wood"]);
  expect(frames[0]!.querySelector(".hotbar__quantity")!.hidden).toBe(true);
  emit(s.windowEvents,"keydown",{ code: "Digit2",repeat: false });
  expect(buildSelected).toHaveBeenLastCalledWith("wall_wood");
  const notice = root.querySelector(".hotbar__notice")!;
  expect(notice.dataset.visible).toBe("true");
  vi.advanceTimersByTime(1250);
  expect(notice.dataset.visible).toBe("false");
  s.modes.openPlayerMenu("inventory");
  const storage = new Map<string,string>();
  const transfer = { types: [HOTBAR_DRAG_MIME],effectAllowed: "copy",
    setData: (key: string,value: string) => storage.set(key,value),getData: (key: string) => storage.get(key) ?? "" };
  s.foundation.updateInventory(g.inventory.snapshot,g.itemCatalog);
  emit(s.get("inventory-items").querySelector("button")!,"dragstart",{ dataTransfer: transfer });
  emit(frames[3]!,"drop",{ dataTransfer: transfer });
  expect(s.hotbar.slots[3]!.entry).toEqual({ type: "item",id: "wood" });
  expect(artIds(frames[3]!)).toEqual(["wood"]);
  expect(frames[3]!.querySelector(".hotbar__quantity")!.textContent).toBe("3");
  emit(slots[3]!,"dragstart",{ dataTransfer: transfer });
  emit(frames[0]!,"drop",{ dataTransfer: transfer });
  expect(s.hotbar.slots[0]!.entry).toEqual({ type: "item",id: "wood" });
  expect(s.hotbar.slots[3]!.entry).toEqual({ type: "build",id: "foundation_wood" });
  emit(frames[0]!.querySelector(".hotbar__clear")!,"click");
  expect(artIds(frames[0]!)).toEqual(["empty"]);
  expect(g.inventory.getItemCount("wood")).toBe(3);
  emit(s.windowEvents,"keydown",{ code: "Digit7",repeat: false });
  expect(s.hotbar.selectedIndex).toBe(1); // Menu input is still blocked.
  s.modes.resumeGameplay();
  emit(s.canvas,"wheel",{ deltaY: 1 });
  expect(notice.dataset.visible).toBe("true");
  s.modes.pauseFromPointerUnlock();
  expect(notice.dataset.visible).toBe("false");
  expect(vi.getTimerCount()).toBe(0);
  ui.dispose(); s.foundation.dispose();
});

it("system navigation/status/action markup remains Phosphor, while runtime code never owns thumbnail file paths", () => {
  const html = readSource("index.html");
  for (const id of ["inventory","crafting","building","close","pause","resume","temperature","weather","weight"]) {
    expect(html).toContain(`data-game-icon="${id}"`);
  }
  for (const file of ["setupFoundationUi","setupCraftingDebugUi","setupBuildingDebugUi","setupCampfireUi","hotbar/setupHotbarUi"]) {
    const source = readSource(`src/ui/${file}.ts`);
    expect(source).not.toContain(".webp");
    expect(source).not.toContain("createElement(\"canvas\")");
  }
});
