import { describe, expect, it, vi } from "vitest";
import { PickupBuildObstacles } from "../src/building/PickupBuildObstacles";
import { PlacementValidator } from "../src/building/PlacementValidator";
import { WorldBuildingRegistry } from "../src/building/WorldBuildingRegistry";
import { WorldPickupRegistry } from "../src/world/pickups/WorldPickupRegistry";
import { createSaveFixture } from "./helpers/saveFixture";

const bottleRequest = {
  definitionId: "foundation_wood",
  playerPosition: { x: 2, y: 1.8, z: 1 },
  placement: { position: { x: 2.3, y: 0, z: 3.2 }, rotationDegrees: 0, surface: "ground" as const },
};

describe("Pickup building occupancy", () => {
  it("真实场景水瓶阻止预览和提交，不扣材料、不生成建筑；拾取后允许", () => {
    const { gameplay, builds } = createSaveFixture();
    gameplay.interactionService.interact("pickup_wood_001");
    gameplay.interactionService.interact("pickup_wood_002");
    const inventory = gameplay.inventory.snapshot;
    const prepare = vi.fn(() => ({ activate() {}, dispose() {} }));
    expect(builds.plan(bottleRequest)).toMatchObject({ canCommit: false, reason: "blocked_by_pickup" });
    expect(builds.place(bottleRequest, { prepare })).toMatchObject({ success: false, reason: "blocked_by_pickup" });
    expect(prepare).not.toHaveBeenCalled();
    expect(gameplay.inventory.snapshot).toEqual(inventory);
    expect(gameplay.worldBuildingRegistry.getAll()).toHaveLength(0);
    expect(gameplay.interactionService.interact("pickup_water_bottle_001").success).toBe(true);
    expect(builds.place(bottleRequest, { prepare }).success).toBe(true);
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  it("部分消耗仍占位；零数量、移除与反复读档均实时更新", () => {
    const pickup = { id: "wood", itemId: "wood", quantity: 8, consumed: false };
    const registry = new WorldPickupRegistry([pickup]);
    const obstacles = new PickupBuildObstacles([{ pickup, position: { x: 0, y: 0.12, z: 1 } }], registry);
    expect(obstacles.getBounds()).toHaveLength(1);
    registry.consume("wood", 7);
    expect(obstacles.getBounds()).toHaveLength(1);
    registry.consume("wood", 1);
    expect(obstacles.getBounds()).toHaveLength(0);
    for (let i = 0; i < 3; i++) {
      registry.restoreQuantities([{ id: "wood", quantity: 8 }]);
      expect(obstacles.getBounds()).toHaveLength(1);
      registry.restoreQuantities([{ id: "wood", quantity: 0 }]);
      expect(obstacles.getBounds()).toHaveLength(0);
    }
    registry.restoreQuantities([{ id: "wood", quantity: 1 }]);
    registry.remove("wood");
    expect(obstacles.getBounds()).toHaveLength(0);
  });

  it("按吸附后的地基校验，且不把高处物资误当成地面占位", () => {
    const { gameplay } = createSaveFixture();
    const pickup = { id: "bottle", itemId: "water_bottle", quantity: 1, consumed: false };
    const registry = new WorldPickupRegistry([pickup]);
    const validateAt = (x: number, y: number) => new PlacementValidator(new WorldBuildingRegistry(), [],
      new PickupBuildObstacles([{ pickup, position: { x, y, z: 3 } }], registry),
    ).validate(gameplay.buildCatalog.get("foundation_wood"), {
      playerPosition: bottleRequest.playerPosition,
      candidate: { ...bottleRequest.placement, position: { x: 2.9, y: 0, z: 3 } },
    });
    // Raw center 2.9 would miss this bottle; snapped center 2 overlaps it.
    expect(validateAt(1.2, 0.4).reason).toBe("blocked_by_pickup");
    expect(validateAt(1.2, 2).valid).toBe(true);
    // Edge contact at foundation max X=3 is not penetration.
    expect(validateAt(3.16, 0.4).valid).toBe(true);
    expect(validateAt(3.14, 0.4).reason).toBe("blocked_by_pickup");
  });

  it("预览后恢复未拾取状态，正式提交重新阻止", () => {
    const { gameplay, builds } = createSaveFixture();
    gameplay.interactionService.interact("pickup_wood_001");
    gameplay.interactionService.interact("pickup_wood_002");
    const quantities = gameplay.pickupPlacements.map(({ pickup }) => ({
      id: pickup.id, quantity: gameplay.pickupRegistry.get(pickup.id)?.quantity ?? 0,
    }));
    gameplay.interactionService.interact("pickup_water_bottle_001");
    expect(builds.plan(bottleRequest).canCommit).toBe(true);
    gameplay.pickupRegistry.restoreQuantities(quantities);
    const prepare = vi.fn(() => ({ activate() {}, dispose() {} }));
    expect(builds.place(bottleRequest, { prepare }).reason).toBe("blocked_by_pickup");
    expect(prepare).not.toHaveBeenCalled();
  });
});
