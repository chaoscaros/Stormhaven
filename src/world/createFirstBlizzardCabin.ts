import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import type { AxisAlignedBounds } from "../survival/shelter/AxisAlignedVolume";
import type { SurvivalEnvironmentScenario } from "../survival/environment/SurvivalEnvironmentScenario";

const WALL_THICKNESS = 0.25;
const FLOOR_THICKNESS = 0.12;
const DOOR_WIDTH = 2.4;
const DOOR_HEIGHT = 2.5;
const DOOR_FRAME_WIDTH = 0.16;
const DOOR_FRAME_DEPTH = 0.42;
const DOOR_THRESHOLD_HEIGHT = 0.055;

/** 创建与 Scenario Volume 共用坐标的固定测试木屋与测试炉表现。 */
export function createFirstBlizzardCabin(
  scene: Scene,
  scenario: SurvivalEnvironmentScenario,
): void {
  const cabin = scenario.shelters[0];
  if (!cabin) return;

  const wallMaterial = new StandardMaterial("test-cabin-wall-material", scene);
  wallMaterial.diffuseColor = new Color3(0.18, 0.14, 0.11);
  wallMaterial.specularColor = new Color3(0.04, 0.035, 0.03);
  wallMaterial.roughness = 0.95;

  const floorMaterial = new StandardMaterial("test-cabin-floor-material", scene);
  floorMaterial.diffuseColor = new Color3(0.12, 0.105, 0.085);
  floorMaterial.specularColor = Color3.Black();
  floorMaterial.roughness = 1;

  const doorFrameMaterial = new StandardMaterial("test-cabin-door-frame-material", scene);
  doorFrameMaterial.diffuseColor = new Color3(0.42, 0.25, 0.11);
  doorFrameMaterial.emissiveColor = new Color3(0.035, 0.018, 0.006);
  doorFrameMaterial.specularColor = Color3.Black();
  doorFrameMaterial.roughness = 0.9;

  createCabinShell(scene, cabin.bounds, wallMaterial, floorMaterial, doorFrameMaterial);

  const heaterMaterial = new StandardMaterial("debug-heater-material", scene);
  heaterMaterial.diffuseColor = new Color3(0.22, 0.07, 0.025);
  heaterMaterial.emissiveColor = new Color3(0.95, 0.24, 0.04);
  heaterMaterial.specularColor = new Color3(0.15, 0.08, 0.03);

  for (const source of scenario.heatSources) {
    const heater = MeshBuilder.CreateBox(
      `heat-source-visual-${source.id}`,
      { width: 0.9, height: 1.4, depth: 0.8 },
      scene,
    );
    heater.position.set(source.position.x, source.position.y, source.position.z);
    heater.material = heaterMaterial;
    heater.checkCollisions = true;
  }
}

function createCabinShell(
  scene: Scene,
  bounds: AxisAlignedBounds,
  wallMaterial: StandardMaterial,
  floorMaterial: StandardMaterial,
  doorFrameMaterial: StandardMaterial,
): void {
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerZ = (bounds.min.z + bounds.max.z) / 2;
  const width = bounds.max.x - bounds.min.x + WALL_THICKNESS * 2;
  const depth = bounds.max.z - bounds.min.z + WALL_THICKNESS * 2;
  const height = bounds.max.y - bounds.min.y;
  const wallY = bounds.min.y + height / 2;
  const frontZ = bounds.min.z - WALL_THICKNESS / 2;
  const backZ = bounds.max.z + WALL_THICKNESS / 2;
  const sideX = width / 2 - DOOR_WIDTH / 2;

  const createPart = (
    name: string,
    dimensions: { width: number; height: number; depth: number },
    x: number,
    y: number,
    z: number,
    material: StandardMaterial,
  ): void => {
    const mesh = MeshBuilder.CreateBox(name, dimensions, scene);
    mesh.position.set(x, y, z);
    mesh.material = material;
    mesh.checkCollisions = true;
    mesh.receiveShadows = true;
  };

  createPart(
    "test-cabin-floor",
    { width, height: FLOOR_THICKNESS, depth },
    centerX,
    bounds.min.y + FLOOR_THICKNESS / 2,
    centerZ,
    floorMaterial,
  );
  createPart(
    "test-cabin-roof",
    { width: width + 0.45, height: 0.28, depth: depth + 0.45 },
    centerX,
    bounds.max.y + 0.14,
    centerZ,
    wallMaterial,
  );
  createPart(
    "test-cabin-left-wall",
    { width: WALL_THICKNESS, height, depth },
    bounds.min.x - WALL_THICKNESS / 2,
    wallY,
    centerZ,
    wallMaterial,
  );
  createPart(
    "test-cabin-right-wall",
    { width: WALL_THICKNESS, height, depth },
    bounds.max.x + WALL_THICKNESS / 2,
    wallY,
    centerZ,
    wallMaterial,
  );
  createPart(
    "test-cabin-back-wall",
    { width, height, depth: WALL_THICKNESS },
    centerX,
    wallY,
    backZ,
    wallMaterial,
  );
  createPart(
    "test-cabin-front-left",
    { width: sideX, height, depth: WALL_THICKNESS },
    bounds.min.x + sideX / 2,
    wallY,
    frontZ,
    wallMaterial,
  );
  createPart(
    "test-cabin-front-right",
    { width: sideX, height, depth: WALL_THICKNESS },
    bounds.max.x - sideX / 2,
    wallY,
    frontZ,
    wallMaterial,
  );
  createPart(
    "test-cabin-front-header",
    { width: DOOR_WIDTH, height: height - DOOR_HEIGHT, depth: WALL_THICKNESS },
    centerX,
    bounds.min.y + DOOR_HEIGHT + (height - DOOR_HEIGHT) / 2,
    frontZ,
    wallMaterial,
  );

  // 入口保持开放，但用高对比木色框体明确表达“门洞”，避免看起来像透明墙面。
  createDecorativePart(
    "test-cabin-door-frame-left",
    { width: DOOR_FRAME_WIDTH, height: DOOR_HEIGHT, depth: DOOR_FRAME_DEPTH },
    centerX - DOOR_WIDTH / 2,
    bounds.min.y + DOOR_HEIGHT / 2,
    frontZ,
    doorFrameMaterial,
  );
  createDecorativePart(
    "test-cabin-door-frame-right",
    { width: DOOR_FRAME_WIDTH, height: DOOR_HEIGHT, depth: DOOR_FRAME_DEPTH },
    centerX + DOOR_WIDTH / 2,
    bounds.min.y + DOOR_HEIGHT / 2,
    frontZ,
    doorFrameMaterial,
  );
  createDecorativePart(
    "test-cabin-door-frame-header",
    { width: DOOR_WIDTH + DOOR_FRAME_WIDTH * 2, height: DOOR_FRAME_WIDTH, depth: DOOR_FRAME_DEPTH },
    centerX,
    bounds.min.y + DOOR_HEIGHT,
    frontZ,
    doorFrameMaterial,
  );
  createDecorativePart(
    "test-cabin-door-threshold",
    { width: DOOR_WIDTH, height: DOOR_THRESHOLD_HEIGHT, depth: DOOR_FRAME_DEPTH },
    centerX,
    bounds.min.y + DOOR_THRESHOLD_HEIGHT / 2,
    frontZ,
    doorFrameMaterial,
  );

  function createDecorativePart(
    name: string,
    dimensions: { width: number; height: number; depth: number },
    x: number,
    y: number,
    z: number,
    material: StandardMaterial,
  ): void {
    const mesh = MeshBuilder.CreateBox(name, dimensions, scene);
    mesh.position.set(x, y, z);
    mesh.material = material;
    mesh.checkCollisions = false;
    mesh.isPickable = false;
  }
}
