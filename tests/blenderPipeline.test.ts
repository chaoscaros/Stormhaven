import { describe, expect, it } from "vitest";
import manifest from "../art/blender/manifest.json";
import { ASSET_DEFINITIONS } from "../src/assets/AssetRegistry";
import { getGameplayThumbnailForBuild, getGameplayThumbnailForItem } from "../src/ui/thumbnails/thumbnailRegistry";
import { readSource } from "./helpers/assetFiles.mjs";

describe("Blender pipeline integration (not visual acceptance)", () => {
  it("maps P0 replacements to existing URLs without registering the unbuilt axe", () => {
    expect(manifest.assets).toHaveLength(5);
    for (const asset of manifest.assets) {
      if (asset.runtimeId) {
        const runtime = ASSET_DEFINITIONS.find(entry => entry.id === asset.runtimeId)!;
        expect(runtime.urls).toContain(asset.glb.replace(/^public\//, ""));
        expect(runtime.scale).toBe(1);
        expect(runtime.rotationOffset).toBe(0);
      } else {
        expect(asset.id).toBe("stone_axe");
        expect(ASSET_DEFINITIONS.some(entry => entry.urls.includes(asset.glb.replace(/^public\//, "")))).toBe(false);
      }
      if (asset.thumbnail) {
        const resolver = asset.id === "stone_axe" ? getGameplayThumbnailForItem : getGameplayThumbnailForBuild;
        expect(resolver(asset.thumbnail).url).toContain(`assets/thumbnails/${asset.thumbnail}.webp`);
      }
    }
  });
  it("keeps authoring out of game commands, domains and Save schema", () => {
    const pkg = JSON.parse(readSource("package.json")) as { scripts: Record<string, string> };
    expect(Object.values(pkg.scripts).join(" ")).not.toMatch(/blender|generate-thumbnails|author-first/);
    for (const path of ["src/save/schema/SaveGameV1.ts", "data/items/items.json", "data/building/buildings.json", "src/assets/AssetRegistry.ts"]) {
      expect(readSource(path)).not.toMatch(/\.blend|art\/blender/);
    }
    expect(manifest.validatedVersion).toBe("4.5.13");
    expect(manifest.status).toBe("foundation-pilot-awaiting-visual-acceptance");
  });
});
