# Asset Credits & Delivery Budget

## Blender Foundation Pilot (2026-09-07)

**Only Foundation was remodeled in real Blender 4.5.13 LTS**, build `daeeeca98fb0`.
Author: Stormhaven project, AI-assisted bpy mesh/UV/bevel modeling + Cycles diffuse
bake; no GUI-clicking claim. Source: `art/blender/buildings/foundation_wood.blend`
(1,267,369 bytes). Runtime: `public/assets/models/buildings/wood-foundation.glb`
(862,424 bytes, 1,836 triangles, 2 meshes, 1 material). Thumbnail:
`public/assets/thumbnails/foundation_wood.webp` (6,684 bytes, 256² transparent).
One original 1K wood albedo is packed in the source/embedded in GLB; matte PBR
roughness 0.82. No external artwork or textures, no additional asset license,
not a CC0 claim. Exact hashes/rights/tool metadata:
`art/blender/buildings/foundation_wood.provenance.json`.

Same saved `.blend` feeds official glTF export and Cycles thumbnail rendering.
See [Pilot report](BLENDER_FOUNDATION_PILOT.md) for actual commands, tests,
render correction, metrics and pending **user visual acceptance**. Other four P0
sources remain absent; do not credit them as completed Blender artwork.
Legacy Python authoring remains available but must not overwrite promoted art;
`generate-thumbnails.py` rejects sources.json containing `.blend` sources.

## Game Item Icon Art Pass v0.1 (2026-09-07)

System Icon and Gameplay Thumbnail are separate. Phosphor (MIT, bundled `@phosphor-icons/core`) remains for navigation/status/actions; old object SVGs and the project-original branch SVG are fallback-only. No CDN, downloaded artwork, brand or commercial-game extraction.

All 12 thumbnails are project-original. **Foundation now uses the Blender source
above**; the other 11 retain their original GLB/thumbnail-only authored geometry
and legacy `scripts/generate-thumbnails.py` output. No third-party art license,
not a CC0 claim. Transparent 256² WebP, natural color, 3/4 orthographic lighting,
78% geometry long-edge coverage, light contact shadow. Foundation uses Cycles
64 samples, others legacy 3× supersampling. No text/frame/count baked into art.
Runtime uses static `<img>`, never live 3D previews.

| Stable ID / WebP basename | Source under `public/assets/models/` | Bytes |
| --- | --- | ---: |
| wood | items/split-log.glb | 6,082 |
| stone | items/granite-1.glb | 6,100 |
| stick | items/branched-stick.glb | 4,996 |
| water_bottle | items/water-bottle.glb | 4,780 |
| canned_food | items/ration-can.glb | 5,880 |
| raw_meat | items/raw-meat.glb | 6,202 |
| foundation_wood | `art/blender/buildings/foundation_wood.blend` (repo-relative) | 6,684 |
| wall_wood | buildings/wood-wall.glb | 4,674 |
| campfire_basic | buildings/campfire.glb + thumbnail-only flame | 10,612 |
| cloth | Thumbnail-only folded fabric mesh | 6,746 |
| scrap_metal | Thumbnail-only bent/chipped metal sheets with rusty edges | 6,114 |
| stone_axe | Thumbnail-only granite blade, timber haft, pale bindings | 6,476 |

Files: `public/assets/thumbnails/*.webp`. Metadata: `public/assets/thumbnails/sources.json`
(source SHA-256 and output bytes; Foundation references `.blend`). Image total
**75,346 bytes**, largest 10,612 bytes; all <50 KB, total <1 MB. Excludes metadata,
world GLB/PNG, JS and WASM. World art + thumbnails = **4,676,418 bytes**; complete
cold HTTP load/FPS remain unmeasured.

### Reproduction / replacement

- Legacy offline command: `python3 scripts/generate-thumbnails.py` now intentionally
  refuses the promoted `.blend` provenance. Do not run it to update Foundation;
  use the Blender paired workflow. Players need neither Python nor authoring libraries.
- Repository-relative script reads the original author's GLB subset (unindexed float32 position/normal/color, root mesh, PBR factors), rejects unsupported forms, and never executes the world authoring script's main function. No world asset is overwritten.
- Development-only review sheet: `node_modules/.cache/stormhaven-thumbnail-review.png`; not runtime art or a browser screenshot. Never auto-run the tool in install/dev/build.
- Paths belong only to `src/ui/thumbnails/thumbnailRegistry.ts`. Replace files/registry plus metadata/credits/tests, keeping Item/Build IDs. Public filenames are stable: deployment must invalidate caches after replacement. Domain/Save cannot store thumbnail URLs/keys.
- All requested 9 items/3 builds are covered. Future objects require registered object art. Cloth/scrap/axe **world** models remain absent; no spawns, equipment or tool gameplay were added. Unknown IDs and failed images use local SVG/info, finally a safe text marker. Save v1 requires no migration.

### Evidence / open acceptance

Actual tsc (`pnpm exec tsc -b --pretty false`), `pnpm test` (43 files / 312 tests), and `git diff --check` passed. Offline thumbnails inspected; WebP alpha/dimensions/budget, registry coverage, DOM error events, actual UI renderer wiring, timing and unchanged Save v1 round trip tested. DOM contract doubles are not a browser: layout, decoding, native drag, Pointer Lock and final visual acceptance remain user checks. No install/dev/build/preview/browser was run. If the user's Hotbar screenshot still looks like a software toolbar, the visual goal remains unaccepted.

---

## Previous 3D Asset Foundation delivery

## Provenance

All models and terrain textures introduced by **3D Asset Foundation + First Blizzard Visual Pass v0.1 (2026-09-07)** are original Stormhaven assets, authored for this repository with deterministic geometry/pixel generation. No downloaded model pack, real brand, extracted commercial-game content, scanned texture, or third-party artwork is included.

| Assets | Source / author | License / rights record | Original source | Modified |
| --- | --- | --- | --- | --- |
| Other 11 GLBs below (Foundation superseded above) | Stormhaven project, AI-assisted procedural authoring | Project-original work; no third-party asset license applies. Not claimed to be CC0 or a third-party licensed pack. | `scripts/author-first-blizzard-assets.py` (no external download page) | Original creation, meter/pivot calibration, merged per material |
| Snow albedo / normal / roughness | Stormhaven project, deterministic periodic noise | Same project-original provenance | Same authoring script | 1024² RGB PNG, seamless sampling and packed roughness |

This document records provenance, not a legal guarantee of exclusive copyright. Any future external replacement must record its actual author, original download URL, exact license and modification history here, and retain the license text in `docs/assets/`. Do not infer CC0 from this first-party asset list. Existing UI Phosphor licensing is independent of these 3D assets; its package contains its MIT license.

## Runtime inventory

All paths below are relative to `public/assets/models/`. PBR values and vertex colors are embedded in GLB. No external model buffers/images, runtime CDN, Draco decoder or texture transcoder is required.

| Semantic asset ID | File | Bytes | Triangles | Materials |
| --- | --- | ---: | ---: | ---: |
| `pickup_wood` | `items/split-log.glb` | 15,708 | 116 | 2 |
| `pickup_stone` | `items/granite-1.glb` | 11,972 | 90 | 1 |
| same ID, variant 2 | `items/granite-2.glb` | 11,972 | 90 | 1 |
| same ID, variant 3 | `items/granite-3.glb` | 11,972 | 90 | 1 |
| `pickup_stick` | `items/branched-stick.glb` | 25,924 | 198 | 2 |
| `pickup_water_bottle` | `items/water-bottle.glb` | 133,276 | 1,088 | 3 |
| `pickup_canned_food` | `items/ration-can.glb` | 125,608 | 1,024 | 3 |
| `pickup_raw_meat` | `items/raw-meat.glb` | 23,664 | 180 | 2 |
| `building_foundation_wood` | `buildings/wood-foundation.glb` | 862,424 | 1,836 | 1 |
| `building_wall_wood` | `buildings/wood-wall.glb` | 82,516 | 672 | 2 |
| `building_campfire` | `buildings/campfire.glb` | 132,700 | 1,080 | 3 |
| `environment_cabin` | `environment/cabin.glb` | 414,492 | 3,420 | 5 |

Terrain files, relative to `public/assets/textures/terrain/`:

| File | Size | Bytes | Use |
| --- | --- | ---: | --- |
| `snow-albedo.png` | 1024×1024 | 520,776 | sRGB cool off-white detail |
| `snow-normal.png` | 1024×1024 | 1,909,256 | Linear tangent-space normal |
| `snow-roughness.png` | 1024×1024 | 318,812 | Linear: G=roughness, B=metalness 0 |

Measured model/terrain payload after Foundation replacement: **4,601,072 bytes**,
before HTTP compression. Not total first-load traffic: JS, WASM, UI and HTML are
additional. Total Network transfer and Chrome 1080p FPS remain **unmeasured**.
Do not inflate assets to meet an arbitrary size range. Budget: cold load <50 MB,
ordinary GLB <1 MB, cabin <3–5 MB. Current individual art files fit; tests enforce
individual/model+texture budget and 1K dimensions.

## Art and scale contract

- Coherent stylized realism: muted warm timber, cold faceted granite, blue plastic, plain metal packaging and nongory meat. No photo scans mixed with unrelated packs.
- All model pivots: bottom-center; one unit is one meter. Foundation uses Blender
  Z-up → official glTF Y-up → Babylon AUTO; no hand-authored mirror or runtime scale
  correction. Other legacy models retain their game-coordinate X/winding conversion.
- Foundation is exactly 2×0.2×2 m: ten planks, two rim beams and five joists.
  Wall remains 2×2.4×0.18 m: ten boards plus three horizontal supports on each side.
  Authoritative `BuildDefinition` is unchanged.
- Cabin visual is authored for the existing scenario: 10×10 m floor, internal 9.5×4×9.5 m, roof within the existing 10.45×0.28×10.45 m slab. Flat felt roof, fascia, timber courses, corners and open entry; no new roof/door gameplay. Original front compound boxes actually leave **1.9 m clear width** (the existing `DOOR_WIDTH=2.4` also describes header/frame): preserve those boxes rather than “correcting” the opening during an art pass.
- Pickup registry offsets convert existing center placements to bottom pivots. Stable pickup ID hashes select granite variants; gameplay RNG and Save do not change.
- Raw meat has a complete model/mapping/load test but **no existing scenario placement**. It is intentionally not newly spawned. Cloth, scrap metal and stone axe remain UI/inventory-only in this scenario; unknown/new world assets use the generic fallback until separately authored.
- Fire flame mesh/PointLight and placement Ghost remain existing primitives; sky is procedural. Snow ground is still a flat 500 m surface, now PBR with 4 m tiles. No forest/road/lake terrain pass, accumulation, audio, LOD or new shadow-generator pipeline.

## Reproducibility and replacement

The legacy source script is offline tooling, not a runtime/build step. **Do not run
`scripts/author-first-blizzard-assets.py` as an all-assets regeneration now:** it
would overwrite the promoted Foundation. Edit the `.blend` and use the paired
workflow; preserve other assets until separately authorized. Repository checkouts
contain all runtime files; nothing automatically generates art on install/dev/build.

Future artists can replace individual files or URLs in `src/assets/AssetRegistry.ts`, preserving semantic IDs and documented pivots/scales. New texture/model revisions need appropriate host cache invalidation; `public/` filenames are stable, not Vite-hashed. Deployment cache policy remains the hosting application's responsibility. Save v1 never stores URLs/materials/meshes.

## Validation evidence / remaining acceptance

- Actual bundled GLBs loaded with Babylon's official loader under NullEngine; source cache, clones, meter bounds, front doorway triangles, hidden proxy picking and repeated Save restore tested.
- Offline software contact sheet inspected for silhouettes; label/roof coplanar surfaces and a 2 mm foundation width discrepancy were corrected. This preview is not a Babylon render and does not validate PBR lighting, pixel artifacts or game FPS.
- `pnpm typecheck`, `pnpm test` (41 files / 298 tests) and `git diff --check`: passed in this issue. No dependency install, game server, production build, preview or browser operation performed by AI.
- User must run `pnpm build`, then the Asset Visual Pass checklist in `docs/COMMAND_RUNBOOK.md`, including old Save → Refresh → Continue and Chrome 1080p FPS. Until then browser visual acceptance is open.
