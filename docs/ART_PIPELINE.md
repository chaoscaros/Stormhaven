# Blender Art Pipeline + Core Asset Remodeling v0.1

## Status — Wall delivered, wall visual acceptance open (2026-09-07)

Latest: **Blender Wall Remodeling v0.1** has followed the existing pipeline. Two
P0 sources (Foundation and Wall) are now authored; campfire/cabin/axe remain pending.
Only Wall's live GLB/WebP changed this Issue, with a saved editable source and
provenance. Wall: 1,620 tris / 2 meshes / 1 matte PBR material, same packed 1K albedo
as Foundation (embedded PNG equality tested), source 1,221,569 bytes, GLB 858,976,
WebP 7,502. Four independent edge placement and repeated SaveService load pass;
existing adjacent-corner AABB restrictions remain. Staged pair passed all gates
before promotion. Final tests: 46 files/327 Vitest, 20 Python, tsc/diff pass.
No GUI/build/browser/FPS acceptance; see [Wall report](BLENDER_WALL_REMODELING.md).

Wall adds `contactShadow: true` to the existing rig. This exposed an actual stale
Foundation test caused by hashing unrelated asset overrides. New reports/checker
use `effectivePresetSha256` (shared settings + this asset override), retaining full
historical hash and strict old-report fallback. Foundation provenance only gained
its unchanged effective rig digest; Foundation source/GLB/WebP remain untouched.
Relevant rig changes still invalidate art; unrelated overrides no longer do.

Current next step: user approves Wall + Foundation visuals; only then recommend a
new **Blender Campfire Remodeling v0.1** Issue. Do not execute other assets now.
Historical Foundation evidence below is retained, with current production status
clarified where needed.

Blender is the **authoring standard for new core assets**, not a game dependency.
The earlier no-Blender preparation was followed by a separately authorized install
and **real Blender Foundation Pilot**. Foundation now has a saved editable `.blend`,
official GLB export and same-source Cycles WebP. At that Pilot, other four P0 sources
were pending; Wall has since been delivered above. Full Foundation evidence,
source/texture details, metrics and user acceptance: [Pilot report](BLENDER_FOUNDATION_PILOT.md).

Target API: **Blender 4.5.x**, a pinned compatibility target, not a claim about
the newest release. Actual validated version is **4.5.13 LTS**, build `daeeeca98fb0`,
bpy `(4, 5, 13)` / Python 3.11.15. The scripts reject other minor versions until
deliberately ported and tested. Foundation is technically delivered, not user-art
approved; its symmetry cannot certify the future cabin's doorway orientation.

## Ownership and files

```text
art/blender/manifest.json           P0 source/URL/size/budget contracts (not runtime imports)
art/blender/thumbnail-preset.json   fixed rig + explicit per-asset overrides
art/blender/items/                 pending stone_axe.blend
art/blender/buildings/             real foundation/wall .blend + provenance; campfire pending
art/blender/environment/           pending environment_cabin.blend
scripts/blender/common/            scene template, PBR checks, mesh validation, pure contracts
scripts/blender/validate.py        read-only Blender source validation
scripts/blender/export/            official glTF exporter → staged GLB + report
scripts/blender/render/            Blender PNG → optional offline Pillow WebP
scripts/blender/check_artifacts.py paired source/output hash and container checks
output/blender/                    ignored staging/reports; never runtime-loaded
public/assets/models/             existing checked-in runtime GLBs
public/assets/thumbnails/         existing checked-in WebPs and sources.json
```

Executed for Foundation: **saved `.blend` → official GLB export → runtime visual**;
the **same saved `.blend` → fixed thumbnail rig → PNG → WebP → UI Registry**.
GUI modeling is a first-class workflow. Template creation only sets an empty
scene/collections; it does not generate or approximate finished P0 art.

Runtime registry remains `src/assets/AssetRegistry.ts`; UI registry remains
`src/ui/thumbnails/thumbnailRegistry.ts`. New filenames do not rename Item/Build
IDs. `stone_axe` has a reserved art output, but no runtime AssetRegistry entry,
spawn or equipment logic until separately authorized. Cabin has no UI item;
its staged thumbnail is review-only, not a new inventory item.

## P0 production order and acceptance

| Order / ID | Blender XYZ meters | Triangles target / cap | Required art |
| --- | --- | --- | --- |
| 1 foundation_wood | exact 2 × 2 × 0.2 | 500–4,000 | Boards, seams, supports, bevels, grain/wear; 2m snap stays exact |
| 2 wall_wood | exact 2 × 0.18 × 2.4 | 500–4,000 | Both sides finished, board edges/joints, readable supports |
| 3 campfire_basic | within 1.1 × 1.1 × 0.5 | 1,000–5,000 | Irregular stones, charred crossed logs; no baked flame/light |
| 4 environment_cabin | exact 10.45 × 10.45 × 4.28 | 5,000–20,000 | Boards, corners, door frame, thick floor/roof/eaves |
| 5 stone_axe | within 0.7 × 0.3 × 1.1 | 300–3,000 | Chipped stone blade, shaped haft, distinct lashings; no gameplay |

Foundation and Wall are authored; other three remain pending. No P1 expansion. Stylized realism
requires material contrast, restrained irregularity, believable construction,
beveled edges, useful normals and UVs—not simply primitive assemblies or excess
faces to meet a minimum. Triangle minima warn; caps fail. Current material cap is
3 per asset. Reuse a wood family across cabin/foundation/wall. Default textures
1K, cabin maximum 2K; no 4K/8K. Packed source gate is 25 MB (review/optimization
required above it, not automatic Git LFS). GLB gates: ordinary <1 MB, cabin <3 MB.
Changing a cap requires a documented measured reason; don't silently suppress it.

### Coordinates, origin and gameplay boundaries

- Metric, unit scale 1, **Blender Z-up**, source front **+Y**. Saved source anchor
  is world (0,0,0), bottom-center. Our strict initial static-mesh contract uses
  identity transforms for every EXPORT object: apply rotation/scale/location,
  put the 3D cursor at zero, then set Origin to 3D Cursor (geometry stays put).
  Mesh offsets belong in mesh data. No parent chains, negative scale, constraints,
  animation or shape keys. Each object name is `asset_id__descriptive_part`.
- Official glTF `export_yup=True` performs Z-up→Y-up conversion. Do not add a
  runtime 90° fix, extra mirror or scale fudge. The proposed +Y source front is
  chosen for existing Babylon AUTO handedness; **actual Blender→Babylon axis
  calibration remains unverified**. Run the real importer/door-triangle tests
  before promoting. Do not reuse the old Python generator's X-mirror code in Blender.
- Foundation/wall extents are exact within 1 mm, not enlarged by bevels. Centered
  XY and min Z=0 are checked. Campfire/axe may be smaller than their envelopes.
- Cabin uses the existing 10m floor / 0.12m thickness / 4m wall / roof slab
  z=4..4.28. Source front +Y matches intended game local -Z. Existing compound
  wall boxes leave **1.9m clear entry**, even though `DOOR_WIDTH` is 2.4. Keep
  opening/frame/threshold geometry compatible; do not redesign the scenario.
- GLB meshes are presentation only. Do not derive collision, precipitation,
  Shelter, Snap or interaction bounds from artistic triangles. Existing hidden
  proxies retain `visibility=0`, `isVisible=true`, picking/ground metadata and
  names. Save v1 remains unchanged. No roof/door/enclosure/tool systems added.
- Campfire EXPORT contains stones/logs only. The current gameplay flame and
  PointLight remain owned by campfire state, including extinguished/loaded states.

### Collections and PBR

`EXPORT` contains only visible static meshes. `COLLISION_REFERENCE` is reference
geometry, `THUMBNAIL_HELPERS` is an authoring aid, and `WORK` is unfinished work;
none belong in a GLB. The thumbnail renderer creates a fresh isolated scene/rig,
so source cameras, lights, world, compositor and hidden helpers do not affect it.

Validation inspects evaluated meshes (modifier-result triangle count), transforms,
bounds, finite vertices/UV coordinates, active UV, material slots, texture existence
and dimensions. It rejects mismatched viewport/render modifier toggles. Only
Bevel/Weighted Normal/Triangulate may remain live; apply other modifiers before
delivery. The pipeline does not certify Geometry Nodes or simulation caches.

Materials must use Principled BSDF directly connected to the active Material Output.
The conservative node whitelist supports Image Texture, Normal Map, Separate Color/
RGB and reroutes/frames. Complex procedural/custom nodes must be baked to local
images before export. Save textures with `//` repository-relative paths or pack
them in the `.blend`; no machine-specific external paths or missing images.
Use sRGB for base color and Non-Color for roughness/metalness/normal. glTF PBR node
recognition is limited; a valid node list does **not** prove every socket connection
or visual result exports correctly. Inspect imported materials explicitly.

### Thumbnail contract

256×256 RGBA, transparent background, unified 3/4 orthographic view, fixed key/fill/
rim area lights, Cycles CPU 64 samples, AgX/neutral look/exposure 0/gamma 1. Bounds
are projected for framing; default coverage is 78%. Light power/size scale with
asset dimensions. No text, frame, numbers, UI colors or gameplay flame baked in.
Foundation and Wall opt into `contactShadow: true`: isolated shadow-catcher geometry,
separate denoised pass and light neutral-alpha composition after real Pilot review.
Other assets default to the unchanged no-catcher rig. PBR remains the source's
actual material. Optional preset `overrides` also maps ID to `rotationDegrees: [x,y,z]`
and `coverage` (0.5..0.85); use it for deliberate reproducible orientation, never
drag the camera differently for each run. Source transforms are not saved by rendering.

Blender renders PNG; a separately invoked existing Python/Pillow environment
converts it to WebP (quality 90, <50 KB). No assumption that Blender's bundled
Python has Pillow, no hidden pip install. Reports hash the source, preset and
output; paired GLB/WebP must refer to the same current `.blend`. This detects
stale/mixed artifacts, not maliciously forged reports or artistic quality.

## Commands — user operated, from repository root

No Blender is needed for `pnpm install/dev/test/build` or normal CI. Checkout already
contains runtime art. **Execution requires user authorization.** Foundation Pilot
authorized background Blender and checks; GUI, browser and game build remain
user-operated. Foundation source exists: do not reinitialize or overwrite it.

In an installed Blender 4.5 environment, check:

```bash
blender --version
```

On macOS if the app exists but PATH has no `blender`, substitute
`/Applications/Blender.app/Contents/MacOS/Blender` for the executable only. Do not
hard-code any person's home/project path into scripts.

First-time template only (already executed for Foundation; now correctly refuses):

```bash
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/common/scene_setup.py -- --asset foundation_wood
```

Then **open the `.blend` yourself in Blender GUI, model/UV/material/edit and save**.
Foundation Pilot used actual bpy modeling/UV/bevels and a Cycles bake through the
bounded `scripts/blender/author_foundation_pilot.py` recipe, not GUI clicking.
That recipe only accepts an empty Foundation template; future edits use the source.
Exporting an empty template is supposed to fail. The pipeline does not substitute
for an artist. `--asset all` initializes all missing sources only if none exist;
when some exist use individual IDs to avoid batch overwrite.

After saving a finished source:

```bash
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/validate.py -- --asset foundation_wood
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/export/export_glb.py -- --asset foundation_wood
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/render/render_thumbnail.py -- --asset foundation_wood
python3 scripts/blender/render/convert_thumbnail.py --asset foundation_wood
python3 scripts/blender/check_artifacts.py --asset foundation_wood
```

Wall has executed this same chain with `--asset wall_wood`. Its bounded recipe
`scripts/blender/author_wall_remodeling.py` accepts only an empty Wall template;
it appends Foundation's packed material without rebaking or modifying Foundation.
Both saved sources now exist: edit them, never reinitialize.
Only in separately authorized later Issues, repeat with `campfire_basic`, `environment_cabin`, `stone_axe`; use
`--asset all` only after **every** real source exists and is modeled. Tools stop
on the first error and can leave earlier successful staged outputs; they do not
claim batch atomicity. Old staged artifacts are not acceptance evidence—check
current source/preset hashes. No tool copies into `public/` or changes registries.

No-Blender checks, using Python 3.9+ standard library:

```bash
python3 -m unittest discover -s tests/blender -v
pnpm exec tsc -b --pretty false
pnpm test
git diff --check
```

`check_artifacts.py`/conversion need an existing Pillow environment with WebP
support. If missing, ask the user to prepare that optional authoring environment;
never install automatically. These tools are not pnpm/CI prerequisites.

## Promotion and rollback — intentionally review-gated

Foundation Pilot's explicit Issue authorized technical promotion after staged
checks, with user GUI/game acceptance **after delivery**. That exception does not
approve the artwork or authorize subsequent P0 production; see its report. The
general later-asset review workflow below remains the default.

1. Save/commit actual `.blend` sources and packed/relative images after GUI review.
   Record actual Blender version. Ignore `.blend1/.blend2`, autosave/cache/downloads,
   temporary FBX and output. Do not fake source files or require LFS without approval.
2. Run validation→export→render→conversion→paired checker. Inspect staged GLB in
   Blender and review all staged thumbnails. Test open passage, normals, bevels,
   UVs, lighting and min/max zoom readability. Fix sources, not runtime scale offsets.
3. In a separate explicit replacement change, copy reviewed staged `{id}.glb` to
   the manifest `glb` path. Copy WebP to `public/assets/thumbnails/{thumbnail}.webp`
   only when `thumbnail` is not null. Cabin WebP stays review-only. Axe GLB can be
   checked-in art without registering a pickup or new gameplay.
4. Update each promoted thumbnail row in `sources.json`: keep ID, set `source` to
   repository-relative `.blend`, `sourceSha256` to current file SHA-256, `bytes` to
   actual WebP size. Record GLB/texture/material/triangle/source size, provenance,
   measured budgets and preview evidence in ASSET_CREDITS/AI_HANDOFF. Update prepared
   manifest status/version and its status test to reflect only actually completed art.
5. Run tsc/tests/diff, user runs `pnpm build`. Existing tests import GLBs under
   NullEngine and verify cache/clones/dispose, bounds, cabin doorway orientation,
   proxies, fallbacks and repeat Save reconstruction. Do not weaken them to accept
   incorrect art. Add real axe import coverage when the file is first delivered.
6. User operates browser: check new game and old Save→refresh→Continue, repeated
   loads with no duplicate objects/lights, placement/snap/ground height, walls
   occluding resources, rain/snow obstruction, empty/lit campfire, thumbnails in
   Inventory/Hotbar/Crafting/Building/Campfire; verify 404 fallback and Chrome 1080p
   FPS/network budgets. No automated check here proves those visual outcomes.
7. Chinese art commit + push. Rollback with a reviewed Git revert of the art change
   (models, source, metadata and images together); never clear browser saves or use
   hard reset. Invalidate deployment caches for stable public filenames.

`scripts/author-first-blizzard-assets.py` and `scripts/generate-thumbnails.py` are
**legacy fallback authoring tools**, not the new source of truth. Don't regenerate
all legacy world assets after promoting Blender art. The legacy thumbnail tool
now refuses to overwrite metadata containing a `.blend` source; it must not silently
undo promoted art. Normal builds invoke neither tool.

## Evidence and remaining work

Foundation: real initialization, bpy authoring + bake, validation, official export,
Cycles rendering, Pillow WebP conversion and staged pair checks passed. Actual
`pnpm exec tsc -b --pretty false`, `pnpm test` (45 files / 319 tests), Python tests
(15) and `git diff --check` passed. Staged GLB and promoted GLB both went through
Babylon/Save regression. Foundation-only contact-shadow catcher/pass compositing
fix followed real render inspection; it cannot enter EXPORT or change the source.
Source is 1,267,369 bytes; GLB 862,424; WebP 6,684; 1,836 triangles / 2 meshes / 1
material. No GUI, production build, browser, pixel shader/FPS or actual IndexedDB
acceptance was performed. NullEngine imports do not decode/shade texture pixels.

Historical Foundation next step was Wall; the user accepted Foundation's visual
direction and authorized that Issue. Current next step is the Wall acceptance
recorded at the top of this document. No automatic Campfire/other asset production.

## API references

- [Official glTF exporter operator](https://docs.blender.org/api/main/bpy.ops.export_scene.html)
- [Official glTF PBR material guidance](https://docs.blender.org/manual/en/4.0/addons/import_export/scene_gltf2.html)

These references inform the prepared options/material restrictions. They are not
a substitute for actual local execution evidence; see the Pilot report above.
