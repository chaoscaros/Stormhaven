# Blender Foundation Pilot v0.1 — 2026-09-07

## Delivery status

**Real Blender execution and technical delivery complete; user art acceptance OPEN.**
Only `foundation_wood` was authored/replaced. Wall, campfire, cabin, axe and P1
were not remodeled. No runtime TypeScript, gameplay JSON, Save schema, dependency,
registry ID/URL, collision proxy, placement Ghost or snap rules changed.

Blender detected at the standard macOS application executable (not on PATH):
`/Applications/Blender.app/Contents/MacOS/Blender`. Version **4.5.13 LTS**, build
`daeeeca98fb0` (2026-08-25), bpy API `(4, 5, 13)`, bundled Python **3.11.15**.
This matches the existing 4.5.x target. Blender was installed in the separately
authorized preceding task; this Pilot installed no software or dependencies.

| Deliverable / metric | Actual result |
| --- | --- |
| Editable source | `art/blender/buildings/foundation_wood.blend` — 1,267,369 bytes |
| Official Blender glTF export | `public/assets/models/buildings/wood-foundation.glb` — 862,424 bytes |
| Same-source Cycles thumbnail | `public/assets/thumbnails/foundation_wood.webp` — 6,684 bytes |
| Source / game XYZ | 2 × 2 × 0.2 m / 2 × 0.2 × 2 m |
| Geometry | 1,836 evaluated/exported triangles; 2 logical meshes |
| Construction | 10 independent deck planks, 6 mm joints, 2 rim beams, 5 supporting joists |
| Edge treatment | 2.5 mm, two-segment Bevel + Weighted Normal; live/editable in source |
| Material | One standard glTF PBR material; metallic 0, roughness 0.82 |
| Texture | One 1024² albedo, Cycles-baked original grain; packed in source and embedded in GLB |
| Source transforms | Identity on both objects; no parent; bottom-center origin; Metric scale 1 |
| Thumbnail | 256² RGBA WebP, transparent, orthographic 3/4, 78% geometry coverage, light neutral contact shadow |

Author: Stormhaven project, AI-assisted **Blender bpy mesh/UV/bevel authoring and
Cycles diffuse bake**, not hand-clicked GUI modeling. Geometry and baked texture
are project-original, no downloaded artwork and no CC0 claim. Recipe:
`scripts/blender/author_foundation_pilot.py`. It only accepts an empty Foundation
template and refuses to overwrite authored work. The saved `.blend` is the source
of truth: future artists edit it instead of rerunning a generator over their edits.
The unused procedural grain material is retained for editing; EXPORT uses only
the baked image and Principled material. Texture is packed, so its relative image
path need not exist as a separate file on another computer.

Exact source, GLB, WebP and rig hashes are committed in
`art/blender/buildings/foundation_wood.provenance.json`; the UI's `sources.json`
now references the same `.blend` hash. Other 11 GLBs, 11 WebPs and terrain maps
remain unchanged. World model/terrain payload is **4,601,072 bytes**, thumbnails
**75,346 bytes**, combined **4,676,418 bytes** (excluding metadata, JS and WASM).

## What actually ran

Commands below were run from the repository root. `blender` means the detected
executable above; `python3` for Pillow commands means an **already available**
Python environment with Pillow 12.3.0/WebP. System Python lacked Pillow; no install
was attempted. Pure unittest ran successfully with system Python.

```bash
blender --version
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/common/scene_setup.py -- --asset foundation_wood
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/author_foundation_pilot.py
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/validate.py -- --asset foundation_wood
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/export/export_glb.py -- --asset foundation_wood
blender --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/render/render_thumbnail.py -- --asset foundation_wood
python3 scripts/blender/render/convert_thumbnail.py --asset foundation_wood
python3 scripts/blender/check_artifacts.py --asset foundation_wood
STORMHAVEN_FOUNDATION_GLB=output/blender/foundation_wood.glb pnpm test
python3 -m unittest discover -s tests/blender -v
pnpm test
pnpm exec tsc -b --pretty false
git diff --check
```

The empty-template and one-shot recipe commands are **historical execution**, not
commands to rerun over the committed source. A short Blender background edit also
renamed mesh datablocks to semantic deck/frame names, then saved the real source;
validation/export/render were rerun against that final hash.

Final validation/export: no source errors/warnings; exact meter bounds within
float tolerance. Staged pair checks passed before copying only the Foundation
GLB/WebP to their existing public paths. Official Babylon import of the staged
binary passed before promotion; final checked-in assets were tested again.

- **45 Vitest files / 319 tests passed**, both staged GLB and promoted GLB runs.
- **15 Python tests passed** (12 existing pure contracts + 3 source/pair/embedded-PNG checks).
- **tsc passed**. No build was run.
- New `tests/foundationPilot.test.ts`: named two-mesh/one-material/PBR/UV contract;
  actual Babylon imports at 0/90/180/270°, negative world coordinate, bottom pivot,
  exact bounds, hidden pickable collision proxy, unchanged wall snap height,
  three placement/restore cycles without accumulating objects/obstacles.
- Existing tests still cover cache/dispose, siblings, failure fallback, cabin
  doorway/proxies, placement rules, UI image fallback and Save v1 repeat restore.
- Test-only `STORMHAVEN_FOUNDATION_GLB` redirects exactly one file read before
  promotion. There is no runtime staging or Blender dependency.
- NullEngine's texture creation does not decode pixels or perform GPU shading;
  tests prove model/PBR wiring and geometry, **not in-game texture appearance**.

Real execution exposed no exporter/API/axis issue for this Foundation. The only
pipeline correction was thumbnail contact shadow: the old isolated rig had no
catcher, and the initial catcher's approximate RGBA produced low-alpha colored
noise. Foundation alone now opts into an isolated catcher, a denoised separate
shadow pass and restrained neutral-alpha compositing in **Blender**. Exported
geometry/source stays untouched by the rig. Final WebP was visually inspected;
the PNG viewer can expose RGB stored under zero alpha, which is not visible in
the final WebP. A new roughness assertion initially failed on float32 precision
(0.81999999 vs 0.82); the assertion now uses tolerance, not a material workaround.

Not executed: pnpm install/dev/build/preview, server restart, browser operations,
Blender GUI, actual IndexedDB UI playthrough, Chrome FPS/network measurement.
No automatic test or offline thumbnail inspection is recorded as user art approval.

## 用户验收（中文操作答复）

1. 你在 Blender 中打开 `art/blender/buildings/foundation_wood.blend`，选择
   EXPORT 内 deck/frame；查看顶面板缝、斜侧倒角和底部横梁，确认并非实心薄盒。
   两个对象原点均在底部中心，位置/旋转为 0、缩放为 1；合集尺寸为 2 × 2 × 0.2 米。
2. 切到材质预览/渲染视图，确认木色、木纹、哑光感，以及是否需要更强的板材差异。
   检查 UV 和内嵌贴图；无需下载纹理或安装插件。
3. 你执行 `pnpm build`。如需开发服务器，再由你执行 `pnpm dev`，手动打开
   `http://localhost:9999`。若已有服务，先刷新即可，不要求重装依赖。
4. 必要时硬刷新以清除稳定 public URL 的旧缓存。B 菜单、底部 Hotbar 和提示中
   木制地基应使用同一个新缩略图；拖拽、选中、清空仍照常工作。
5. 放置地基，R 旋转，连续放相邻模块；确认无上下偏移、悬空、尺寸缝隙或异常透明。
   在地基上走动/跳跃，在边缘吸附旧木墙，检查视觉与代理一致、墙底贴合顶面。
6. 昼间与 F4 暴雪预览观察木纹、倒角、可读性与塑料感；F5 恢复天气计划。
7. Continue 一份已有 Save v1，确认旧地基出现新外观而位置/ID/库存不变；
   保存→刷新→继续，重复数次，确认不出现叠加模型/碰撞/降雪障碍。
   请勿清除 IndexedDB 或用新游戏覆盖需要保留的旧档。
8. 提供地基顶面、侧面、底部（Blender）及游戏放置/菜单截图，再决定是否通过美术验收。

## Remaining debt and stop

- User Blender GUI/game art acceptance and production build remain open.
- This exact 20 cm module is intentionally thin; no foundation gameplay dimensions
  were enlarged to make the thumbnail more dramatic. Base-color grain + constant
  roughness are the initial PBR baseline, with no normal map or heavily weathered detail.
- GLB is 862,424 bytes, below 1 MB but much larger than the old 65,256-byte placeholder;
  future texture compression/per-instance performance decisions require measured evidence.
- Thin-instance/LOD/material batching, cache invalidation policy and first-load/FPS
  profiling remain existing technical debt, not implementations in this Issue.
- Actual Foundation axis/bounds are checked. This symmetric module **does not prove
  future cabin doorway orientation**; wall/campfire/cabin/axe sources remain absent.
- Legacy all-assets generators must not overwrite the promoted Foundation.
- Next recommended Issue: **Blender Wall Remodeling v0.1**, only after this Pilot's
  user visual approval and a new explicit authorization. Stop here; no other P0,
  new gameplay, equipment, storage, wetness, enclosure, NPC or automation work.
