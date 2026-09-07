import scheduleData from "../../../data/weather/first-blizzard-schedule.json";
import { createGameTimeSnapshot, toTotalGameMinutes } from "../../core/time/GameTime";
import { SIMULATION_CONFIG } from "../../core/config";
import type { FirstBlizzardGameplayFoundation } from "../../core/gameplay/createFirstBlizzardGameplayFoundation";
import { WorldBuildingRegistry } from "../../building/WorldBuildingRegistry";
import type { SavedBuilding, SaveGameV1 } from "./SaveGameV1";
import { SAVE_SLOT_ID } from "./SaveGameV1";
import type { WeatherId } from "../../weather/WeatherDefinition";
import { parseWeatherSchedule } from "../../weather/WeatherSchedule";
import type { HotbarEntry } from "../../ui/hotbar/HotbarModel";
import { HotbarModel, HOTBAR_SLOT_COUNT } from "../../ui/hotbar/HotbarModel";

const schedule = parseWeatherSchedule(scheduleData);
const initialMinutes = toTotalGameMinutes({ day: SIMULATION_CONFIG.initialDay, hour: SIMULATION_CONFIG.initialHour, minute: SIMULATION_CONFIG.initialMinute });

/** Parse untrusted storage into fresh, canonical plain data before any live mutation. */
export function validateSaveGame(raw: unknown, gameplay: FirstBlizzardGameplayFoundation): { data: SaveGameV1; warnings: string[] } {
  assertPlainData(raw);
  const root = object(raw);
  requireValue(root.version === 1);
  const metadata = object(root.metadata);
  requireValue(metadata.saveId === SAVE_SLOT_ID && metadata.scenarioId === schedule.scenarioId);
  const createdAt = integer(metadata.createdAt, 0);
  const updatedAt = integer(metadata.updatedAt, createdAt);
  const player = object(root.player);
  const rotation = object(player.rotation);
  const position = point(player.position);
  const thermalReserve = number(player.thermalReserve, 0, 100);
  const time = object(root.time);
  const totalGameMinutes = number(time.totalGameMinutes, initialMinutes, Number.MAX_SAFE_INTEGER / 60);
  createGameTimeSnapshot(totalGameMinutes);
  const timeScale = number(time.timeScale, 0, Number.MAX_SAFE_INTEGER);
  const weather = object(root.weather);
  const currentWeatherId = weatherId(weather.currentWeatherId);
  const transition = weather.transition === null ? null : (() => {
    const entry = object(weather.transition);
    const durationGameSeconds = number(entry.durationGameSeconds, Number.EPSILON, Number.MAX_SAFE_INTEGER);
    const elapsedGameSeconds = number(entry.elapsedGameSeconds, 0, durationGameSeconds);
    requireValue(elapsedGameSeconds < durationGameSeconds);
    return { targetWeatherId: weatherId(entry.targetWeatherId), durationGameSeconds, elapsedGameSeconds };
  })();
  // Only the scenario drives Domain weather. Reject inconsistent timelines rather than replaying actions twice.
  let expectedCurrent = schedule.initialWeatherId;
  let expectedTransition: typeof transition = null;
  for (const entry of schedule.entries) {
    const start = toTotalGameMinutes(entry.transitionStartsAt);
    if (totalGameMinutes >= toTotalGameMinutes(entry.startsAt)) {
      expectedCurrent = entry.weatherId;
      expectedTransition = null;
    } else if (totalGameMinutes >= start) {
      expectedTransition = {
        targetWeatherId: entry.weatherId,
        durationGameSeconds: entry.transitionDurationGameMinutes * 60,
        elapsedGameSeconds: (totalGameMinutes - start) * 60,
      };
    }
  }
  requireValue(currentWeatherId === expectedCurrent);
  requireValue((transition === null) === (expectedTransition === null));
  if (transition && expectedTransition) {
    requireValue(transition.targetWeatherId === expectedTransition.targetWeatherId
      && transition.durationGameSeconds === expectedTransition.durationGameSeconds
      && Math.abs(transition.elapsedGameSeconds - expectedTransition.elapsedGameSeconds) < 0.01);
  }

  const slots = array(object(root.inventory).slots).map((value) => {
    if (value === null) return null;
    const stack = object(value);
    const itemId = string(stack.itemId);
    const definition = gameplay.itemCatalog.get(itemId);
    return { itemId, quantity: integer(stack.quantity, 1, definition.stackSize) };
  });
  // Existing Inventory validation is the sole authority on stack capacity and weight.
  gameplay.inventory.clone().replaceWithSnapshot({ ...gameplay.inventory.snapshot, slots: slots.map((entry) => entry ?? undefined) });
  const pickups = array(root.pickups).map((value) => {
    const entry = object(value);
    const id = string(entry.id);
    const placement = gameplay.pickupPlacements.find((candidate) => candidate.pickup.id === id);
    requireValue(placement !== undefined);
    return { id, quantity: integer(entry.quantity, 0, placement.pickup.quantity) };
  });
  unique(pickups.map((entry) => entry.id));
  requireValue(pickups.length === gameplay.pickupPlacements.length);

  const buildings: SavedBuilding[] = array(root.buildings).map((value) => {
    const entry = object(value);
    const definitionId = string(entry.definitionId);
    const definition = gameplay.buildCatalog.get(definitionId);
    const rotationDegrees = number(entry.rotationDegrees, 0, 359.999999);
    requireValue(rotationDegrees % definition.rotationStep === 0);
    return { id: string(entry.id), definitionId, position: point(entry.position), rotationDegrees,
      snapPointId: entry.snapPointId === null ? null : string(entry.snapPointId) };
  });
  unique(buildings.map((entry) => entry.id));
  const registry = new WorldBuildingRegistry();
  for (const building of orderBuildings(buildings)) {
    const definition = gameplay.buildCatalog.get(building.definitionId);
    requireValue((definition.snapType === "foundation_edge") === (building.snapPointId !== null));
    if (building.snapPointId) {
      const snap = registry.getSnapPoint(building.snapPointId);
      requireValue(Math.abs(building.position.x - snap.position.x) < 0.0001
        && Math.abs(building.position.z - snap.position.z) < 0.0001
        && Math.abs(building.position.y - snap.position.y - definition.size.y / 2) < 0.0001
        && building.rotationDegrees === snap.rotationDegrees);
    }
    registry.register(building, definition, building.snapPointId ?? undefined);
  }

  const campfires = array(root.campfires).map<SaveGameV1["campfires"][number]>((value) => {
    const entry = object(value);
    const id = string(entry.id);
    const worldBuildingId = string(entry.worldBuildingId);
    const entity = registry.get(worldBuildingId);
    requireValue(gameplay.buildCatalog.get(entity.definitionId).tags.includes("campfire") && id === `campfire_${worldBuildingId}`);
    const fuelSecondsRemaining = number(entry.fuelSecondsRemaining, 0, gameplay.campfireSystem.fuelCapacitySeconds);
    const status = entry.status;
    requireValue(status === "unlit" || status === "burning" || status === "out_of_fuel");
    requireValue(status !== "burning" || fuelSecondsRemaining > 0);
    requireValue(status !== "out_of_fuel" || fuelSecondsRemaining === 0);
    return { id, worldBuildingId, fuelSecondsRemaining, status };
  });
  unique(campfires.map((entry) => entry.id));
  requireValue(campfires.length === buildings.filter((building) => gameplay.buildCatalog.get(building.definitionId).tags.includes("campfire")).length);

  const warnings: string[] = [];
  const hotbar = object(root.hotbar);
  const hotbarSlots = array(hotbar.slots).map((value, index) => {
    const slot = object(value);
    requireValue(slot.slotIndex === index);
    const entry = object(slot.entry);
    let parsed: HotbarEntry;
    if (entry.type === "empty") parsed = { type: "empty" };
    else {
      requireValue(entry.type === "item" || entry.type === "build");
      const id = string(entry.id);
      const known = entry.type === "item" ? gameplay.itemCatalog.has(id) : gameplay.buildCatalog.has(id);
      parsed = known ? { type: entry.type, id } : { type: "empty" };
      if (!known) warnings.push(`hotbar_unknown_id:${index}:${id}`);
    }
    return { slotIndex: index, entry: parsed };
  });
  const selectedIndex = integer(hotbar.selectedIndex, 0, HOTBAR_SLOT_COUNT - 1);
  new HotbarModel().restore(hotbarSlots, selectedIndex);
  return { data: {
    version: 1, metadata: { saveId: SAVE_SLOT_ID, scenarioId: schedule.scenarioId, createdAt, updatedAt },
    player: { position, rotation: { yaw: number(rotation.yaw), pitch: number(rotation.pitch, -Math.PI / 2, Math.PI / 2) }, thermalReserve },
    time: { totalGameMinutes, timeScale }, weather: { currentWeatherId, transition },
    inventory: { slots }, pickups, buildings, campfires, hotbar: { slots: hotbarSlots, selectedIndex },
  }, warnings };
}

export function orderBuildings(buildings: readonly SavedBuilding[]): SavedBuilding[] {
  return [...buildings].sort((a, b) => Number(a.snapPointId !== null) - Number(b.snapPointId !== null));
}

function object(value: unknown): Record<string, unknown> {
  requireValue(typeof value === "object" && value !== null && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function array(value: unknown): unknown[] {
  requireValue(Array.isArray(value));
  for (let index = 0; index < value.length; index++) requireValue(index in value);
  return value;
}
function string(value: unknown): string { requireValue(typeof value === "string" && value.trim().length > 0 && value.length <= 256); return value; }
function number(value: unknown, min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): number {
  requireValue(typeof value === "number" && Number.isFinite(value) && value >= min && value <= max); return value;
}
function integer(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number {
  const result = number(value, min, max); requireValue(Number.isSafeInteger(result)); return result;
}
function point(value: unknown) {
  const p = object(value); return { x: number(p.x), y: number(p.y), z: number(p.z) };
}
function weatherId(value: unknown): WeatherId {
  requireValue(value === "clear" || value === "cloudy" || value === "snow" || value === "blizzard"); return value;
}
function unique(ids: string[]): void { requireValue(new Set(ids).size === ids.length); }
function requireValue(condition: unknown): asserts condition { if (!condition) throw new Error("Invalid save data"); }
function assertPlainData(value: unknown, ancestors = new Set<object>(), depth = 0): void {
  requireValue(depth <= 16);
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") { requireValue(Number.isFinite(value)); return; }
  requireValue(typeof value === "object" && value !== null && !ancestors.has(value));
  requireValue(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  ancestors.add(value);
  for (const child of Object.values(value)) assertPlainData(child, ancestors, depth + 1);
  ancestors.delete(value);
}
