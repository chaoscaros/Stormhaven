import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOTBAR_SLOTS,
  HotbarModel,
  isHotbarGameplayMode,
} from "../src/ui/hotbar/HotbarModel";
import { readHotbarDragData } from "../src/ui/hotbar/HotbarDragData";

describe("HotbarModel", () => {
  it("默认 8 格并绑定三个建造快捷入口", () => {
    expect(DEFAULT_HOTBAR_SLOTS).toHaveLength(8);
    expect(DEFAULT_HOTBAR_SLOTS.slice(0, 3).map((slot) => slot.entry)).toEqual([
      { type: "build", id: "foundation_wood" },
      { type: "build", id: "wall_wood" },
      { type: "build", id: "campfire_basic" },
    ]);
    expect(DEFAULT_HOTBAR_SLOTS.slice(3).every((slot) => slot.entry.type === "empty")).toBe(true);
  });

  it("数字键 1~8 选择对应槽位且区分 build/empty", () => {
    const model = new HotbarModel();
    expect(model.selectKeyCode("Digit3")?.slot.entry).toEqual({ type: "build", id: "campfire_basic" });
    expect(model.selectKeyCode("Numpad8")?.slot.entry).toEqual({ type: "empty" });
    expect(model.selectedIndex).toBe(7);
  });

  it("滚轮前后循环并在边界回绕", () => {
    const model = new HotbarModel();
    expect(model.cycleByWheel(-1).selectedIndex).toBe(7);
    expect(model.cycleByWheel(1).selectedIndex).toBe(0);
    expect(model.cycleByWheel(1).selectedIndex).toBe(1);
  });

  it("越界、无效数字键和零滚轮增量安全忽略", () => {
    const model = new HotbarModel();
    expect(model.select(99).selectedIndex).toBe(0);
    expect(model.selectKeyCode("Digit9")).toBeUndefined();
    expect(model.cycleByWheel(0).selectedIndex).toBe(0);
  });

  it("item entry 与 build entry 保持明确类型", () => {
    const slots = DEFAULT_HOTBAR_SLOTS.map((slot) => ({ ...slot, entry: { ...slot.entry } }));
    slots[4] = { slotIndex: 4, entry: { type: "item", id: "wood" } };
    const model = new HotbarModel(slots);
    expect(model.select(4).slot.entry).toEqual({ type: "item", id: "wood" });
    expect(model.select(0).slot.entry.type).toBe("build");
  });

  it("只有 Gameplay 与 BuildPlacement 允许快捷栏玩法输入", () => {
    expect(isHotbarGameplayMode("gameplay")).toBe(true);
    expect(isHotbarGameplayMode("build_placement")).toBe(true);
    expect(isHotbarGameplayMode("player_menu")).toBe(false);
    expect(isHotbarGameplayMode("interaction_menu")).toBe(false);
    expect(isHotbarGameplayMode("paused")).toBe(false);
  });

  it("可以覆盖槽位为物品或建筑，并可单独清空", () => {
    const model = new HotbarModel();
    expect(model.assign(0, { type: "item", id: "wood" })).toBe(true);
    expect(model.slots[0]?.entry).toEqual({ type: "item", id: "wood" });
    expect(model.assign(7, { type: "build", id: "wall_wood" })).toBe(true);
    expect(model.slots[7]?.entry).toEqual({ type: "build", id: "wall_wood" });
    expect(model.clear(0)).toBe(true);
    expect(model.slots[0]?.entry).toEqual({ type: "empty" });
  });

  it("拖动快捷栏槽位时交换内容，空槽也可参与交换", () => {
    const model = new HotbarModel();
    expect(model.swap(0, 1)).toBe(true);
    expect(model.slots[0]?.entry).toEqual({ type: "build", id: "wall_wood" });
    expect(model.slots[1]?.entry).toEqual({ type: "build", id: "foundation_wood" });
    expect(model.swap(1, 7)).toBe(true);
    expect(model.slots[1]?.entry).toEqual({ type: "empty" });
    expect(model.slots[7]?.entry).toEqual({ type: "build", id: "foundation_wood" });
    expect(model.swap(7, 7)).toBe(false);
    expect(model.swap(-1, 0)).toBe(false);
  });

  it("槽位修改通知订阅者，无变化与越界操作保持安全", () => {
    const model = new HotbarModel();
    let notifications = 0;
    const unsubscribe = model.subscribe(() => { notifications += 1; });
    expect(notifications).toBe(1);
    expect(model.assign(0, { type: "build", id: "foundation_wood" })).toBe(true);
    expect(notifications).toBe(1);
    expect(model.assign(0, { type: "item", id: "stone" })).toBe(true);
    expect(notifications).toBe(2);
    expect(model.clear(99)).toBe(false);
    expect(model.assign(-1, { type: "item", id: "wood" })).toBe(false);
    expect(notifications).toBe(2);
    unsubscribe();
  });

  it("只接受已知且完整的快捷栏拖拽数据", () => {
    const transfer = (serialized: string): DataTransfer => ({
      getData: () => serialized,
    }) as unknown as DataTransfer;
    expect(readHotbarDragData(transfer('{"source":"catalog","entry":{"type":"item","id":"wood"}}')))
      .toEqual({ source: "catalog", entry: { type: "item", id: "wood" } });
    expect(readHotbarDragData(transfer('{"source":"hotbar","slotIndex":7}')))
      .toEqual({ source: "hotbar", slotIndex: 7 });
    expect(readHotbarDragData(transfer('{"source":"hotbar","slotIndex":8}'))).toBeUndefined();
    expect(readHotbarDragData(transfer('{"source":"catalog","entry":{"type":"empty"}}')))
      .toBeUndefined();
    expect(readHotbarDragData(transfer("not-json"))).toBeUndefined();
  });
});
