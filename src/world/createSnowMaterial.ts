import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import { localAssetUrl } from "../assets/AssetRegistry";

/** Three local 1K maps, tiled every 4m. Texture failure keeps a readable snow fallback. */
export async function createSnowMaterial(scene: Scene, groundSize: number): Promise<PBRMaterial> {
  const material = new PBRMaterial("snow-ground-material", scene);
  material.albedoColor = new Color3(.74, .8, .8);
  material.metallic = 0;
  material.roughness = .94;
  const textures: Texture[] = [];
  const results = await Promise.allSettled(["albedo", "normal", "roughness"].map(kind => new Promise<Texture>((resolve, reject) => {
    const texture = new Texture(localAssetUrl(`assets/textures/terrain/snow-${kind}.png`), scene, false, false,
      Texture.TRILINEAR_SAMPLINGMODE, () => resolve(texture), message => reject(new Error(message ?? `snow-${kind}`)));
    textures.push(texture);
    texture.uScale = texture.vScale = groundSize / 4;
    texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.gammaSpace = kind === "albedo";
    texture.anisotropicFilteringLevel = 4;
  })));
  if (results.every(result => result.status === "fulfilled")) {
    material.albedoColor = Color3.White();
    [material.albedoTexture, material.bumpTexture, material.metallicTexture] = textures;
    material.useRoughnessFromMetallicTextureAlpha = false;
    material.useRoughnessFromMetallicTextureGreen = true;
    material.useMetallnessFromMetallicTextureBlue = true;
    material.roughness = 1;
  } else {
    console.warn("Stormhaven 雪地贴图加载失败，使用基础雪地材质", results.filter(result => result.status === "rejected"));
    for (const texture of textures) texture.dispose();
  }
  return material;
}
