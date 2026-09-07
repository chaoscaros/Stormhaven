# Blender Wall Remodeling v0.1

## Status / scope — 2026-09-07

Technical delivery complete; **user Blender GUI and game visual acceptance remain open**.
Foundation's visual direction was accepted as the basis for this explicitly authorized
Wall Issue. Only the player-built wall was remodeled. Fixed cabin, Foundation source/
GLB/WebP, campfire, axe, runtime TypeScript, gameplay data, registries and Save v1
are unchanged. Do not start Campfire until wall visual approval and a new Issue.

## Delivered artifacts

| Property | Actual result |
| --- | --- |
| Tool | Blender 4.5.13 LTS, build `daeeeca98fb0`, bpy 4.5.13, Python 3.11.15 |
| Source | `art/blender/buildings/wall_wood.blend` — 1,221,569 bytes |
| Runtime | `public/assets/models/buildings/wood-wall.glb` — 858,976 bytes |
| Thumbnail | `public/assets/thumbnails/wall_wood.webp` — 7,502 bytes, 256² RGBA |
| Provenance | `art/blender/buildings/wall_wood.provenance.json` |
| Source SHA-256 | `87a435de3b00f041857a2fb9e39446293b2709ffa33e3c2d9ff342436eb40c2f` |
| GLB SHA-256 | `1c5a8b7d6675220483079d73534d057c23860ecfbd99c1096c06c3abc6d34950` |
| WebP SHA-256 | `3de7399b3f9fb98cb07c2250db24ef08273a84ed8da3db50909ba4a13ac48e77` |
| Source XYZ / game XYZ | 2 × 0.18 × 2.4 m / 2 × 2.4 × 0.18 m |
| Evaluated triangles / meshes / materials | 1,620 / 2 / 1 |
| Origin / source transforms | Bottom-center (0,0,0); identity, scale 1; no negative scale |
| Axes | Blender Z-up, thickness Y → official glTF Y-up, thickness Z → Babylon AUTO |
| PBR | Metallic 0, roughness 0.82, one embedded 1024² sRGB wood albedo |

Real bpy modeling, not GUI clicking or the legacy hand-written GLB generator.
Eight separate vertical boards, two structural posts, two rails on **each** face,
and recessed joint backing. Runtime groups: `wall_wood__boards_mesh` and
`wall_wood__frame_mesh`; 2.5mm two-segment bevels + weighted normals. Editable
disconnected timber pieces remain in the two source meshes (Blender loose-part
selection/separation is possible). No cameras/lights/helpers/animations in EXPORT.
Backing caps are inset 5mm to avoid overlapping coplanar plank caps. Middle seams
read as recessed grooves, not holes through which pickups are visible.

The authoring recipe appends **only** Foundation's packed matte timber material
and original baked image. No duplicate bake, downloaded art or runtime texture URL.
The two GLBs contain byte-identical PNGs (tested). UV V follows each board/post's
vertical axis and each rail's horizontal axis; consistent meter mapping with
different texture slices creates modest variation. UV repeat is continuous, not
per-corner modulo. Each self-contained GLB embeds the shared image: disk payload
duplicates it across the two files, but repeated wall instances share cached
geometry/materials. No texture-atlas/instancing pipeline was added.

Thumbnail uses the existing isolated Cycles CPU 64-sample rig, AgX neutral lighting,
3/4 view, 78% projected geometry coverage and restrained contact shadow. Same saved
source drives GLB and thumbnail. Final WebP inspected offline; not a game screenshot.
No image-generation service, software geometry thumbnail renderer or new dependency.

## Actual execution and staged promotion

Commands below run from the repository root. This Issue authorized background Blender,
type checks/tests, artifact checks and Git. On this Mac, `blender` was substituted by
`/Applications/Blender.app/Contents/MacOS/Blender` (not on PATH); no GUI was launched.
Conversion/checking used the already available Pillow 12.3.0 Python environment,
not a new install. System Python remains sufficient for all `tests/blender` tests.

```bash
blender --version
# Already executed. Never initialize or overwrite the authored wall again:
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/common/scene_setup.py -- --asset wall_wood
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/author_wall_remodeling.py
# Normal workflow after editing/saving the .blend:
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/validate.py -- --asset wall_wood
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/export/export_glb.py -- --asset wall_wood
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/render/render_thumbnail.py -- --asset wall_wood
# python3 here must refer to an EXISTING Pillow + WebP environment:
python3 scripts/blender/render/convert_thumbnail.py --asset wall_wood
python3 scripts/blender/check_artifacts.py --asset wall_wood
STORMHAVEN_WALL_GLB=output/blender/wall_wood.glb pnpm test
STORMHAVEN_WALL_ARTIFACT_DIR=output/blender python3 -m unittest discover -s tests/blender -v
pnpm exec tsc -b --pretty false
git diff --check
```

Real source validation, official export, PNG/WebP validation and paired checker
passed before promotion. Final staged pair passed **46 Vitest files / 326 tests**,
**20 Python tests**, tsc and diff check **before** copying into `public/`. A later
test documents the existing perpendicular-corner placement limitation (no runtime
change); final promoted suite is **46 files / 327 tests**, Python **20**, tsc/diff
also pass. No new art was promoted on failing gates.

Tests cover finite normalized normals/UVs, 1,620 triangles, mesh/material/budget,
official Blender generator, embedded 1K image identity, no camera/light/helpers,
source and paired hashes, WebP alpha/size, stable IDs, 404 primitive fallback,
joint-backing rays from both faces, and **four independent edge fixtures**:

| Edge | Y rotation | Bottom / top | Save regression |
| --- | ---: | --- | --- |
| North | 0° | 0.2 / 2.6 m | Initial BuildService placement + save + 3 actual loads |
| East | 90° | 0.2 / 2.6 m | Same |
| South | 180° | 0.2 / 2.6 m | Same |
| West | 270° | 0.2 / 2.6 m | Same |

Each checks root transform/GLB bounds against the existing rotated proxy, stable
ID/definition/position/rotation, consumed snap ID/occupancy, duplicate placement
rejection, exact inventory preservation (cost only once: wood ×3), mesh/root/light
counts, precipitation registry and cleanup. Existing Save tests also restore
domain-only existing entities into the new GLB, Primitive and failed-GLB scenes.
Repository is in-memory for these tests; actual browser IndexedDB remains a user gate.

## Minimal pipeline correction discovered by execution

Adding only `wall_wood.contactShadow` to the existing preset caused the Foundation
Python provenance test to fail: it hashed every asset's overrides as one indivisible
rig. Foundation's actual rig/art were unchanged. Fixed by recording/verifying a
canonical `effectivePresetSha256` (shared settings + **this** asset override).
Relevant lighting/coverage/override changes still invalidate that asset; unrelated
overrides do not. Full historical `presetSha256` remains recorded. Old staged
reports without the effective field retain strict full-file hash checks.

Foundation provenance received only the effective digest of its unchanged rig;
no Foundation .blend/GLB/WebP was regenerated. New test covers both invalidating
and non-invalidating changes. Other pipeline behavior is unchanged. Initial new
four-edge tests also exposed an over-strict test equality at `0.2` versus ordinary
floating-point `0.19999999999999996`; assertions use 1e-6 tolerance, no scale fix.

## User acceptance — not executed by AI

用户先运行 `pnpm build`；需要启动服务时自行运行 `pnpm dev`，手动打开默认端口
9999。已有服务无需 AI 重启。没有执行安装、dev/build/preview、浏览器或 Blender GUI。

1. Blender 打开 `art/blender/buildings/wall_wood.blend`，检查尺寸、底部中心、两组
   可编辑网格、两面板条/立柱/横梁、倒角、木纹方向与拉伸、地基材质协调、悬空/共面闪烁。
2. 新游戏或旧档继续：检查建造菜单及 Hotbar 的墙缩略图。分别用四块空地基验收
   N/E/S/W 吸附，确认墙脚在地基顶面、厚度轴和四向旋转正确，没有额外视觉偏移。
3. 检查走近墙体时碰撞、墙后 Pickup 遮挡、暴雪阻挡、不同天气照明与连续建墙。
4. Esc 保存 → 刷新 → Continue；再次保存/继续，核对所有方向的位置/数量、库存不重复
   扣除、Snap 占用不丢失、无重复 Mesh/障碍。保留旧档，不需要清空存档或 Schema 迁移。
5. 测量 Chrome 1080p FPS 和实际冷加载；提供游戏及 Blender 截图。单测通过不等于美术通过。

## Known issues / technical debt / next

- User's final screenshots show a foundation being placed through an uncollected
  water bottle. Confirmed code cause: pickup proxies have `checkCollisions=false`,
  `collectStaticBuildingBounds` only collects collision obstacles, and the validator
  has no separate pickup occupancy input. Diagnosed, **not fixed** in this art Issue.
  A future fix should use explicit pickup placement bounds and release them after
  collection, not enable camera collision or silently delete/move resources.
- **Existing gameplay limitation, reproduced without GLB:** a 2m wall centered on a
  north edge overlaps an east/west wall's AABB by 9cm at the corner. The existing
  validator rejects the neighboring wall as `blocked`. Opposite edges and each
  empty foundation edge work. Four independent direction tests **do not certify
  four walls simultaneously enclosing one foundation**. This needs a separately
  authorized placement/corner-rule Issue; no visual shrink, bounds fudge or
  enclosure gameplay was introduced to hide it.
- Fixed cabin retains its old art/material; the Foundation + player Wall now share
  timber. This task deliberately does not make all cabin timber look identical.
- Wall GLB is 858,976 bytes, mostly its embedded original 1K texture; within 1 MB,
  not a few-KB primitive. Repeated-module draw-call/texture sharing optimization
  and deployment cache invalidation remain future work. Stable public filenames
  require host cache invalidation when deployed; no settings/service worker added.
- Browser depth/UV pixel quality, rain/snow rendering, actual save UI and FPS are
  unmeasured. No GUI operation was claimed. Foundation's screenshot approval is
  not blanket acceptance of new wall art.
- After user wall visual approval, recommended next art Issue is **Blender Campfire
  Remodeling v0.1**. Do not execute it now; cabin/axe/roof/door/windows/vegetation and
  new gameplay remain out of scope. Corner-rule repair is a separate optional bug Issue.

## Git handoff

Chinese commit: `使用Blender重制木制墙体`, current tracking `main` → `origin/main`.
Use `git log -1 --format='%h %s'` and `git status -sb` to verify actual delivery;
the final task response records the resulting hash and verified push outcome.
Rollback should be a reviewed `git revert` of the paired art/docs/tooling commit,
not a hard reset and not deletion of saves. No asset downloads or LFS required.
