import { describe, expect, it } from "vitest";
import { createSaveFixture, populateSaveFixture, InMemorySaveRepository } from "./helpers/saveFixture";
import { SaveService } from "../src/save/SaveService";
import { SaveSnapshotBuilder } from "../src/save/SaveSnapshotBuilder";
import { migrateSave } from "../src/save/schema/migrateSave";
import { validateSaveGame } from "../src/save/schema/validateSaveGame";
import { SAVE_SLOT_ID, type SaveGameV1 } from "../src/save/schema/SaveGameV1";
import { GameUiStateMachine } from "../src/ui/GameUiModeController";

const access = { canSave: () => true, canLoad: () => true };
const capture = (fixture: ReturnType<typeof createSaveFixture>) => new SaveSnapshotBuilder(fixture.runtime).capture(1000);

describe("Save schema and complete world round trip", () => {
  it("captures plain structured data and preserves every subsystem through repository + restore", async () => {
    const source = createSaveFixture();
    populateSaveFixture(source);
    const before = capture(source);
    expect(validateSaveGame(before, source.gameplay).data).toEqual(before);
    expect(before.time.totalGameMinutes).toBe(1065);
    expect(before.weather.transition?.elapsedGameSeconds).toBe(900);
    expect(before.player.thermalReserve).toBe(62.5);
    expect(before.inventory.slots[0]).toBeNull();
    expect(JSON.parse(JSON.stringify(before))).toEqual(before);
    const repository = new InMemorySaveRepository();
    const save = new SaveService(repository, source.runtime, access, () => 1000);
    expect(await save.save()).toMatchObject({ reason: "ok" });
    const target = createSaveFixture();
    const stages: string[] = [];
    const load = new SaveService(repository, target.runtime, access, () => 9999999);
    expect(await load.load((stage) => { stages.push(stage); })).toMatchObject({ reason: "ok" });
    expect(stages).toEqual(["读取存档", "验证版本", "恢复库存", "恢复世界资源", "恢复建筑", "恢复生存状态", "完成"]);
    expect(capture(target)).toEqual(before);
    expect(target.velocity()).toBe(0);
    expect(target.gameplay.inventory.snapshot).toEqual(source.gameplay.inventory.snapshot);
    expect(target.gameplay.worldBuildingRegistry.getSnapPoint("building_000001:north").occupied).toBe(true);
    const fire = target.gameplay.campfireSystem.getAll()[0]!;
    expect(target.environment.heatSourceSystem.getContribution(fire.position).temperatureBonusCelsius).toBeGreaterThan(0);
    expect(target.gameplay.campfireSystem.getInteractionTarget(`interaction:${fire.id}`)).toMatchObject({ campfireId: fire.id });
    // A paused frame never consumes restored fuel or advances the saved instant.
    target.simulation.update(100, target.player.captureTransform().position);
    expect(capture(target)).toEqual(before);
    target.simulation.setPaused(false);
    const update = target.simulation.update(0.25, target.player.captureTransform().position);
    expect(update.events.some((event) => event.type === "weather-transition-started")).toBe(false);
    expect(target.simulation.snapshot.transition?.progress).toBeCloseTo(16 / 30);
    for (let i = 0; i < 14; i++) target.simulation.update(0.25);
    expect(target.simulation.snapshot.weather.id).toBe("blizzard");
    expect(target.simulation.snapshot.transition).toBeUndefined();
  });

  it("restores empty slots, fully consumed, partial and untouched pickups without respawning", async () => {
    const source = createSaveFixture();
    source.gameplay.pickupRegistry.consume("pickup_wood_001", 8);
    source.gameplay.pickupRegistry.consume("pickup_wood_002", 3);
    source.gameplay.inventory.addItem("wood", 2);
    source.gameplay.inventory.moveStack(0, 23);
    const repository = new InMemorySaveRepository();
    await new SaveService(repository, source.runtime, access).save();
    const target = createSaveFixture();
    expect(await new SaveService(repository, target.runtime, access).load()).toMatchObject({ reason: "ok" });
    expect(capture(target).pickups).toEqual(capture(source).pickups);
    expect(target.gameplay.pickupRegistry.get("pickup_wood_001")).toBeUndefined();
    expect(target.gameplay.pickupRegistry.get("pickup_wood_002")?.quantity).toBe(5);
    expect(target.gameplay.pickupRegistry.get("pickup_stick_001")?.quantity).toBe(3);
    expect(target.gameplay.inventory.snapshot.slots).toEqual(source.gameplay.inventory.snapshot.slots);
  });

  it.each(["unlit", "burning", "out_of_fuel"] as const)("restores %s fire, fuel, heat and no offline burn", async (status) => {
    const source = createSaveFixture();
    populateSaveFixture(source);
    const fire = source.gameplay.campfireSystem.getAll()[0]!;
    source.gameplay.campfireSystem.restoreState(fire.id, status === "out_of_fuel" ? 0 : 400, status);
    const repository = new InMemorySaveRepository();
    await new SaveService(repository, source.runtime, access, () => 1000).save();
    const target = createSaveFixture();
    expect(await new SaveService(repository, target.runtime, access, () => 10801000).load()).toMatchObject({ reason: "ok" });
    const restored = target.gameplay.campfireSystem.get(fire.id);
    expect(restored).toEqual(source.gameplay.campfireSystem.get(fire.id));
    expect(target.environment.heatSourceSystem.getContribution(restored.position).temperatureBonusCelsius > 0).toBe(status === "burning");
  });

  it("new construction after load uses a free stable ID and only charges its own cost", async () => {
    const fixture = createSaveFixture();
    populateSaveFixture(fixture);
    const repository = new InMemorySaveRepository();
    await new SaveService(repository, fixture.runtime, access).save();
    const target = createSaveFixture();
    await new SaveService(repository, target.runtime, access).load();
    target.gameplay.inventory.addItem("wood", 4);
    const before = target.gameplay.inventory.getItemCount("wood");
    const result = target.builds.place({ definitionId: "foundation_wood", playerPosition: { x: 12, y: 1.8, z: -1 },
      placement: { position: { x: 12, y: 0, z: 1 }, rotationDegrees: 0, surface: "ground" },
    }, target.buildPresentation);
    expect(result).toMatchObject({ success: true, buildingEntityId: "building_000004" });
    expect(target.gameplay.inventory.getItemCount("wood")).toBe(before - 4);
  });

  it("unknown hotbar references clear with warnings; known absent items keep their binding", async () => {
    const fixture = createSaveFixture();
    const data = capture(fixture);
    const slots = [...data.hotbar.slots];
    slots[0] = { slotIndex: 0, entry: { type: "item", id: "future_item" } };
    slots[1] = { slotIndex: 1, entry: { type: "build", id: "future_build" } };
    slots[2] = { slotIndex: 2, entry: { type: "item", id: "stone_axe" } };
    const repository = new InMemorySaveRepository();
    repository.data = { ...data, hotbar: { slots, selectedIndex: 2 } };
    const result = await new SaveService(repository, fixture.runtime, access).load();
    expect(result).toMatchObject({ reason: "ok", warnings: ["hotbar_unknown_id:0:future_item", "hotbar_unknown_id:1:future_build"] });
    expect(fixture.hotbar.slots[0]?.entry).toEqual({ type: "empty" });
    expect(fixture.hotbar.slots[1]?.entry).toEqual({ type: "empty" });
    expect(fixture.hotbar.slots[2]?.entry).toEqual({ type: "item", id: "stone_axe" });
    expect(fixture.gameplay.inventory.getItemCount("stone_axe")).toBe(0);
  });

  it.each([
    ["missing version", (data: SaveGameV1) => ({ ...data, version: undefined }), "validation_failed"],
    ["future version", (data: SaveGameV1) => ({ ...data, version: 2 }), "unsupported_future_version"],
    ["old version", (data: SaveGameV1) => ({ ...data, version: 0 }), "unsupported_version"],
    ["scenario", (data: SaveGameV1) => ({ ...data, metadata: { ...data.metadata, scenarioId: "other" } }), "validation_failed"],
    ["item", (data: SaveGameV1) => ({ ...data, inventory: { slots: [{ itemId: "wrong", quantity: 1 }, ...data.inventory.slots.slice(1)] } }), "validation_failed"],
    ["stack overflow", (data: SaveGameV1) => ({ ...data, inventory: { slots: [{ itemId: "wood", quantity: 21 }, ...data.inventory.slots.slice(1)] } }), "validation_failed"],
    ["weight overflow", (data: SaveGameV1) => ({ ...data, inventory: { slots: [{ itemId: "stone", quantity: 20 }, { itemId: "wood", quantity: 1 }, ...data.inventory.slots.slice(2)] } }), "validation_failed"],
    ["slot count", (data: SaveGameV1) => ({ ...data, inventory: { slots: [] } }), "validation_failed"],
    ["building definition", (data: SaveGameV1) => ({ ...data, buildings: [{ ...data.buildings[0], definitionId: "unknown" }] }), "validation_failed"],
    ["duplicate buildings", (data: SaveGameV1) => ({ ...data, buildings: [...data.buildings, data.buildings[0]] }), "validation_failed"],
    ["missing snap", (data: SaveGameV1) => ({ ...data, buildings: data.buildings.map((b) => ({ ...b, snapPointId: null })) }), "validation_failed"],
    ["campfire reference", (data: SaveGameV1) => ({ ...data, campfires: [{ ...data.campfires[0], worldBuildingId: "missing" }] }), "validation_failed"],
    ["missing campfire", (data: SaveGameV1) => ({ ...data, campfires: [] }), "validation_failed"],
    ["invalid fuel", (data: SaveGameV1) => ({ ...data, campfires: [{ ...data.campfires[0], fuelSecondsRemaining: 901 }] }), "validation_failed"],
    ["thermal", (data: SaveGameV1) => ({ ...data, player: { ...data.player, thermalReserve: 101 } }), "validation_failed"],
    ["nonfinite position", (data: SaveGameV1) => ({ ...data, player: { ...data.player, position: { x: NaN, y: 1, z: 1 } } }), "validation_failed"],
    ["missing weather", (data: SaveGameV1) => ({ ...data, weather: null }), "validation_failed"],
    ["inconsistent timeline", (data: SaveGameV1) => ({ ...data, weather: { ...data.weather, transition: null } }), "validation_failed"],
    ["invalid pickup quantity", (data: SaveGameV1) => ({ ...data, pickups: data.pickups.map((p) => ({ ...p, quantity: 999 })) }), "validation_failed"],
    ["missing pickup", (data: SaveGameV1) => ({ ...data, pickups: data.pickups.slice(1) }), "validation_failed"],
    ["runtime object", (data: SaveGameV1) => ({ ...data, mesh: new Date() }), "validation_failed"],
  ] as const)("rejects %s without changing live state", async (_label, mutate, reason) => {
    const fixture = createSaveFixture();
    populateSaveFixture(fixture);
    const repository = new InMemorySaveRepository();
    repository.data = mutate(capture(fixture));
    const target = createSaveFixture();
    const before = capture(target);
    const result = await new SaveService(repository, target.runtime, access).load();
    expect(result.reason).toBe(reason);
    expect(capture(target)).toEqual(before);
  });

  it.each([840, 1050, 1065, 1080, 1800])("weather at minute %s round trips without duplicate forecast actions", async (minute) => {
    const source = createSaveFixture();
    for (let i = 840; i < minute; i++) source.simulation.update(0.25);
    source.simulation.setPaused(true);
    const repository = new InMemorySaveRepository();
    expect(await new SaveService(repository, source.runtime, access).save()).toMatchObject({ reason: "ok" });
    const target = createSaveFixture();
    expect(await new SaveService(repository, target.runtime, access).load()).toMatchObject({ reason: "ok" });
    expect(target.simulation.capturePersistentState()).toEqual(source.simulation.capturePersistentState());
    target.simulation.setPaused(false);
    expect(target.simulation.update(0).events).toEqual([]);
  });

  it("retains createdAt and preserves the previous save on write failure", async () => {
    const fixture = createSaveFixture();
    const repository = new InMemorySaveRepository();
    let now = 1000;
    const service = new SaveService(repository, fixture.runtime, access, () => now);
    expect(await service.hasSave()).toEqual({ reason: "ok", exists: false });
    expect(await service.load()).toEqual({ reason: "not_found" });
    await service.save();
    now = 2000;
    fixture.gameplay.inventory.addItem("wood", 1);
    await service.save();
    const saved = await repository.load() as SaveGameV1;
    expect(saved.metadata).toMatchObject({ createdAt: 1000, updatedAt: 2000 });
    repository.failWrites = true;
    fixture.gameplay.inventory.addItem("wood", 1);
    expect(await service.save()).toEqual({ reason: "storage_error" });
    expect(await repository.load()).toEqual(saved);
    repository.failReads = true;
    expect(await service.load()).toEqual({ reason: "storage_error" });
    expect(await service.hasSave()).toEqual({ reason: "storage_error" });
  });

  it("rolls back a presentation failure completely and can retry the same save", async () => {
    const source = createSaveFixture();
    populateSaveFixture(source);
    const repository = new InMemorySaveRepository();
    await repository.save(SAVE_SLOT_ID, capture(source));
    const target = createSaveFixture();
    const before = capture(target);
    let fail = true;
    target.presentation.restoreBuildings = () => { if (fail) { fail = false; throw new Error("Mesh allocation failed"); } };
    const service = new SaveService(repository, target.runtime, access);
    expect(await service.load()).toEqual({ reason: "restore_failed", recoveryRequired: false });
    expect(capture(target)).toEqual(before);
    expect(target.environment.heatSourceSystem.getContribution({ x: 6, y: 0.25, z: 1 }).temperatureBonusCelsius).toBe(0);
    expect(await service.load()).toMatchObject({ reason: "ok" });
    expect(capture(target)).toEqual(capture(source));
  });

  it("returns a reload requirement if even the rollback presentation fails", async () => {
    const fixture = createSaveFixture();
    const repository = new InMemorySaveRepository();
    repository.data = capture(fixture);
    fixture.presentation.restorePickups = () => { throw new Error("GPU unavailable"); };
    expect(await new SaveService(repository, fixture.runtime, access).load()).toEqual({ reason: "restore_failed", recoveryRequired: true });
  });

  it("gates save/load by mode and serializes in-flight operations", async () => {
    const fixture = createSaveFixture();
    const repository = new InMemorySaveRepository();
    const denied = new SaveService(repository, fixture.runtime, { canSave: () => false, canLoad: () => false });
    expect(await denied.save()).toEqual({ reason: "invalid_state" });
    expect(await denied.load()).toEqual({ reason: "invalid_state" });
    const service = new SaveService(repository, fixture.runtime, access);
    const saving = service.save();
    expect(await service.save()).toEqual({ reason: "busy" });
    expect(await service.load()).toEqual({ reason: "busy" });
    expect(await saving).toMatchObject({ reason: "ok" });
  });

  it("keeps shell paused while saving and main-menu while loading despite Escape/start attempts", () => {
    const shell = new GameUiStateMachine();
    shell.showMainMenu();
    shell.setOperationPending(true);
    shell.startGame();
    expect(shell.state.mode).toBe("main_menu");
    shell.setOperationPending(false);
    shell.startGame();
    shell.pause();
    shell.setOperationPending(true);
    shell.handleEscape();
    shell.closeToGameplay();
    expect(shell.state.mode).toBe("paused");
    shell.setOperationPending(false);
    shell.handleEscape();
    expect(shell.state.mode).toBe("gameplay");
  });

  it("does not silently downgrade a future save on overwrite", async () => {
    const fixture = createSaveFixture();
    const repository = new InMemorySaveRepository();
    repository.data = { version: 2 };
    expect(await new SaveService(repository, fixture.runtime, access).save()).toEqual({ reason: "unsupported_future_version" });
    expect(repository.data).toEqual({ version: 2 });
    expect(migrateSave(capture(fixture), fixture.gameplay).reason).toBe("ok");
  });
});
