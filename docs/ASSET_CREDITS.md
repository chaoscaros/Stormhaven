# 3D Asset Credits & Delivery Budget

## Provenance

All models and terrain textures introduced by **3D Asset Foundation + First Blizzard Visual Pass v0.1 (2026-09-07)** are original Stormhaven assets, authored for this repository with deterministic geometry/pixel generation. No downloaded model pack, real brand, extracted commercial-game content, scanned texture, or third-party artwork is included.

| Assets | Source / author | License / rights record | Original source | Modified |
| --- | --- | --- | --- | --- |
| All 12 GLBs below | Stormhaven project, AI-assisted procedural authoring | Project-original work; no third-party asset license applies. Not claimed to be CC0 or a third-party licensed pack. | `scripts/author-first-blizzard-assets.py` (no external download page) | Original creation, meter/pivot calibration, merged per material |
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
| `building_foundation_wood` | `buildings/wood-foundation.glb` | 65,256 | 528 | 2 |
| `building_wall_wood` | `buildings/wood-wall.glb` | 82,516 | 672 | 2 |
| `building_campfire` | `buildings/campfire.glb` | 132,700 | 1,080 | 3 |
| `environment_cabin` | `environment/cabin.glb` | 414,492 | 3,420 | 5 |

Terrain files, relative to `public/assets/textures/terrain/`:

| File | Size | Bytes | Use |
| --- | --- | ---: | --- |
| `snow-albedo.png` | 1024×1024 | 520,776 | sRGB cool off-white detail |
| `snow-normal.png` | 1024×1024 | 1,909,256 | Linear tangent-space normal |
| `snow-roughness.png` | 1024×1024 | 318,812 | Linear: G=roughness, B=metalness 0 |

Measured new art payload: **3,803,904 bytes (3.80 MB / 3.63 MiB)**, uncompressed HTTP transfer before any server compression. This is **not total first-load traffic**: Babylon JS, Havok WASM, UI and HTML are additional. Total Network transfer and Chrome 1080p FPS remain **not measured / user acceptance pending**. Do not inflate assets merely to reach the suggested 20–35 MB range. Budget: total cold load <50 MB, ordinary GLB <1 MB, cabin <3–5 MB; current individual art files fit. Tests enforce individual/model+texture budget and 1K dimensions.

## Art and scale contract

- Coherent stylized realism: muted warm timber, cold faceted granite, blue plastic, plain metal packaging and nongory meat. No photo scans mixed with unrelated packs.
- All model pivots: bottom-center; one unit is one meter. Authoring uses game coordinates and mirrors X/winding for glTF; Babylon AUTO restores that handedness. Do not add an extra model-root mirror.
- Foundation is exactly 2×0.2×2 m: four support beams and ten boards. Wall is 2×2.4×0.18 m: ten boards plus three horizontal supports on each side. Authoritative `BuildDefinition` is unchanged.
- Cabin visual is authored for the existing scenario: 10×10 m floor, internal 9.5×4×9.5 m, roof within the existing 10.45×0.28×10.45 m slab. Flat felt roof, fascia, timber courses, corners and open entry; no new roof/door gameplay. Original front compound boxes actually leave **1.9 m clear width** (the existing `DOOR_WIDTH=2.4` also describes header/frame): preserve those boxes rather than “correcting” the opening during an art pass.
- Pickup registry offsets convert existing center placements to bottom pivots. Stable pickup ID hashes select granite variants; gameplay RNG and Save do not change.
- Raw meat has a complete model/mapping/load test but **no existing scenario placement**. It is intentionally not newly spawned. Cloth, scrap metal and stone axe remain UI/inventory-only in this scenario; unknown/new world assets use the generic fallback until separately authored.
- Fire flame mesh/PointLight and placement Ghost remain existing primitives; sky is procedural. Snow ground is still a flat 500 m surface, now PBR with 4 m tiles. No forest/road/lake terrain pass, accumulation, audio, LOD or new shadow-generator pipeline.

## Reproducibility and replacement

The source script is a small authoring tool, not a runtime asset store or game build step. If intentionally regenerating assets, run `python3 scripts/author-first-blizzard-assets.py` (Python 3 standard library only). Commit only intentional optimized GLB/PNG changes and their updated table. Do not run it automatically on install/dev/build. Repository checkouts already contain all runtime files.

Future artists can replace individual files or URLs in `src/assets/AssetRegistry.ts`, preserving semantic IDs and documented pivots/scales. New texture/model revisions need appropriate host cache invalidation; `public/` filenames are stable, not Vite-hashed. Deployment cache policy remains the hosting application's responsibility. Save v1 never stores URLs/materials/meshes.

## Validation evidence / remaining acceptance

- Actual bundled GLBs loaded with Babylon's official loader under NullEngine; source cache, clones, meter bounds, front doorway triangles, hidden proxy picking and repeated Save restore tested.
- Offline software contact sheet inspected for silhouettes; label/roof coplanar surfaces and a 2 mm foundation width discrepancy were corrected. This preview is not a Babylon render and does not validate PBR lighting, pixel artifacts or game FPS.
- `pnpm typecheck`, `pnpm test` (41 files / 298 tests) and `git diff --check`: passed in this issue. No dependency install, game server, production build, preview or browser operation performed by AI.
- User must run `pnpm build`, then the Asset Visual Pass checklist in `docs/COMMAND_RUNBOOK.md`, including old Save → Refresh → Continue and Chrome 1080p FPS. Until then browser visual acceptance is open.
