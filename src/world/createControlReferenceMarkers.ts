import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

interface MarkerDefinition {
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly accent: boolean;
}

const MARKERS: readonly MarkerDefinition[] = Object.freeze([
  { name: "north-beacon", x: 0, z: 24, height: 7, accent: true },
  { name: "west-beacon", x: -16, z: 12, height: 4, accent: false },
  { name: "east-beacon", x: 16, z: 12, height: 4, accent: false },
  { name: "rear-beacon", x: 0, z: -24, height: 5, accent: false },
]);

/** 创建无玩法含义的基础标杆，用于确认移动、转向和跳跃是否生效。 */
export function createControlReferenceMarkers(scene: Scene): void {
  const standardMaterial = createMarkerMaterial(
    scene,
    "control-marker-standard-material",
    new Color3(0.16, 0.23, 0.25),
  );
  const accentMaterial = createMarkerMaterial(
    scene,
    "control-marker-accent-material",
    new Color3(0.78, 0.52, 0.2),
  );

  for (const definition of MARKERS) {
    const marker = MeshBuilder.CreateBox(
      definition.name,
      { width: 0.65, height: definition.height, depth: 0.65 },
      scene,
    );
    marker.position.set(definition.x, definition.height / 2, definition.z);
    marker.material = definition.accent ? accentMaterial : standardMaterial;
    marker.checkCollisions = true;

    const cap = MeshBuilder.CreateBox(
      `${definition.name}-cap`,
      { width: 1.8, height: 0.18, depth: 1.8 },
      scene,
    );
    cap.position.set(definition.x, definition.height, definition.z);
    cap.material = definition.accent ? accentMaterial : standardMaterial;
    cap.checkCollisions = true;
  }
}

function createMarkerMaterial(
  scene: Scene,
  name: string,
  color: Color3,
): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = Color3.Black();
  material.roughness = 0.9;
  return material;
}
