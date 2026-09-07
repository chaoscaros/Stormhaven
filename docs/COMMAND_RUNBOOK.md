# Stormhaven Command Runbook

> Primary audience: AI agents and maintainers. This is the canonical reference for setup, startup, validation, build, and preview commands.

## Game Item Icon Art Pass v0.1 — user acceptance

This issue permits AI to run `pnpm exec tsc -b --pretty false`, `pnpm test`, `git diff --check` and Git delivery, but **not install/dev/build/preview or browser operations**. No new JS dependency was added. There is no `pnpm gate` or extra gate document/version in this checkout. Actual result: 43 files / 312 tests passed; browser acceptance is separate.

用户操作：

1. 在项目目录执行 `pnpm build`。开发服务如已运行，刷新页面查看；需要启动/重启时由用户执行 `pnpm dev`，默认端口仍为 9999。AI 不启动或打开浏览器。
2. 查看 Gameplay Hotbar：木地基/木墙/篝火为彩色物体，不是单色符号；橙色只作选择边框。数字键左上、物品数量右下，建筑无数量，空槽安静，无常驻长名称。
3. 按 1–8/滚轮切换：名称约 1.25 秒后淡出；快速切换不被旧计时器提前关闭，打开菜单/暂停后不残留，继续不会突然重播。
4. Tab：24 格保持独立背包；鼠标移入/键盘聚焦显示 Tooltip 和大图详情。拖入底部 Hotbar、槽位交换、点击绑定、每格 ×、拖到清空区均工作且不消耗库存。快捷栏不嵌进背包。
5. C：石斧图为石刃+木柄+绑带，输入仍是树枝 ×2 + 石头 ×2；材料、产物和数量正确，制作一次库存/快捷栏即时更新。
6. B：木地基/墙/篝火与各自成本均是物体图；选择/拖拽与进入放置不变。E 篝火：主体石圈木柴与燃料木材图正确，点燃/熄灭/加柴/关闭仍可用。
7. 用户可在浏览器 Network Request Blocking 中暂时阻断一张 `/assets/thumbnails/*.webp` 再刷新，确认对应位置退到安全 SVG 而菜单不报错/空白；验收后取消阻断刷新。正常状态不应再用 SVG 物品图。
8. 验证旧 Save v1：继续旧档、检查库存/快捷栏及世界，保存→刷新→继续仍正常；图像路径不会进入存档。不需要迁移。
9. 截图 Gameplay Hotbar、Tab Inventory、C/B 详情，记录视口/缩放。目标是生存游戏物品栏而非软件按钮栏；若截图仍不符合，记录为**视觉未验收**，只继续修本专项。

Offline authoring (optional for artists): `python3 scripts/generate-thumbnails.py` requires an **already available** Python 3 + NumPy + Pillow with WebP. Do not auto-install those libraries. It generates 12 committed WebPs/metadata and an ignored review sheet at `node_modules/.cache/stormhaven-thumbnail-review.png`; no browser or world model change, no install/dev/build hook. Regular checkout/build requires no authoring environment.

## General response policy

When a user asks how to install, start, build, test, preview, or troubleshoot this project:

1. **Answer the user in Chinese**, even though this runbook is written mainly in English.
2. Give the smallest command set that answers the question.
3. Clearly distinguish first-time setup from daily startup.
4. Never claim a command passed unless it was actually executed in the current verified context.
5. For the current project owner, do not start the server, compile, restart, or open a browser unless the user explicitly authorizes it. Provide commands for the user to run.
6. Use repository-relative instructions. Do not include a developer-specific absolute path in reusable documentation.

Save Foundation v0.1 explicitly authorizes the AI to run typecheck/test/diff and Git checks/commit/push. It does **not** authorize install/dev/build/preview or browser operation. Record this issue-specific exception separately from future task permissions.

3D Asset Foundation + First Blizzard Visual Pass v0.1 repeats the typecheck/test/diff/Git authorization. No install/dev/build/preview or browser authorization is implied. Runtime art is checked into `public/assets`; no asset download or authoring command is needed to play/build on another machine.

## Toolchain baseline

| Tool | Required version | Source of truth |
| --- | --- | --- |
| Node.js | `>=22.12.0` | `package.json#engines.node`, `.node-version` |
| pnpm | `>=11.24.0` | `package.json#packageManager` and `engines.pnpm` |
| Browser | Modern desktop browser with WebGL 2 and WebAssembly | Project requirements |

pnpm is the only supported package manager. Do not create or commit `package-lock.json` or `yarn.lock`.

## First-time setup

Run from the repository root:

```bash
node --version
corepack enable
pnpm --version
pnpm install
```

Expected result:

- Node.js satisfies the version in `package.json`.
- pnpm resolves to the version declared by `packageManager`.
- `pnpm install` creates or updates `pnpm-lock.yaml`.
- Dependencies are installed into pnpm's managed `node_modules` layout.
- `@phosphor-icons/core` is installed locally and its selected SVG files are bundled by Vite; the game does not fetch icons from a CDN at runtime.

If Corepack is unavailable, use the environment's approved pnpm installation method. A direct fallback is:

```bash
npm install --global pnpm@11.24.0
pnpm --version
pnpm install
```

Do not use the npm fallback to install project dependencies. It is only for installing the pnpm executable.

## Daily development startup

```bash
pnpm dev
```

Vite prints the actual local URL. This project configures `http://localhost:9999` as the default, but another port may be selected when 9999 is already occupied. Tell the user to open the exact URL printed in the terminal.

To expose the development server to other devices on the local network:

```bash
pnpm dev -- --host 0.0.0.0
```

Only use network exposure on a trusted network. This is a development server, not a production deployment method.

## Stop or restart development

Stop the active Vite process in its terminal:

```text
Ctrl+C
```

Restart by running:

```bash
pnpm dev
```

Do not tell the user to kill all Node processes. That can interrupt unrelated projects.

## Validation commands

Run checks independently so failures are easy to locate:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Responsibilities:

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | Strict TypeScript validation without emitting files |
| `pnpm test` | Run Vitest once and exit |
| `pnpm build` | Run TypeScript project build, then create Vite production assets in `dist/` |

Recommended pre-handoff order:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Browser rendering and player controls are separate acceptance checks. A successful build does not prove that WebGL, Havok, pointer lock, movement, or jumping work in the browser.

## Production preview

Build first, then serve the generated `dist/` directory through Vite Preview:

```bash
pnpm build
pnpm preview
```

`pnpm preview` is for local verification of production output. It is not a permanent production server.

## Browser acceptance checklist

After `pnpm dev` or `pnpm preview`, ask the user to verify:

1. 初始化期间只显示真实阶段文案的 Stormhaven Loading Overlay，不出现虚假百分比或故意延时。
2. 初始化完成后显示“第一场暴雪”标题页和“开始新游戏”；存在本地存档时“继续游戏”可点击，否则 Disabled；不会自动读档。
3. 在标题页等待数秒，初始时间必须保持 `14:00`；点击“开始新游戏”后才进入场景并请求 Pointer Lock；Continue 则先完整恢复存档。
4. 校准标杆默认隐藏；需要测试参考物时按 F6 显示，再移动鼠标确认第一人称视角改变。标杆仅显示，不参与碰撞/拾取/降水。
5. `W A S D` changes the distance and direction to those beacons.
6. Holding `Shift` increases movement speed.
7. Pressing `Space` jumps and the player lands on the ground.
8. Gameplay 中按 `Esc` 打开暂停菜单并释放 Pointer Lock；再次按 Esc 或点击“继续游戏”恢复。
9. The upper-right Debug HUD starts at `14:00`, shows `晴朗`, and forecasts `18:00 暴雪`.
10. 17:30 前 Scene 保持晴朗；17:30–18:00 天空、雾、灯光和雪连续增强；18:00 HUD Domain Weather 变为暴雪。
11. `F1`、`F2`、`F3`、`F4` 可依次预览晴朗、多云、降雪、暴雪，HUD 的“视觉”行显示“预览”。
12. Preview 时 HUD 的 Domain Weather、Forecast 和 Transition 没有被改写；`F5` 恢复跟随计划。
13. 降雪/暴雪粒子围绕玩家存在；快速移动后不会在出生点永久遗留固定发射源。
14. 暴雪比普通降雪更暗、雾更浓、雪更密、横向风更强，但仍能辨识近处标杆和地平线。
15. 切换后台 Tab 再返回、改变窗口尺寸后画面仍继续更新且无明显时间跳变。
16. 14:00 HUD 显示环境温度、体感温度、风力、体热、趋势和热状态；Clear 下体热基本稳定。
17. 17:30–18:00 体感温度随 Transition 连续下降，Thermal Trend 显示负值且流失逐渐加快。
18. 18:00 Blizzard 下站立约 1 分钟，体热数值应有肉眼可见但不过快的下降。
19. Thermal 达到低状态时不会扣除生命，也不会触发 Debuff、屏幕特效或其他未实现玩法。
20. 从出生点直行可经正面入口进入固定测试木屋；入口应有清楚的木色门框、顶框和低门槛，中央仍是开放门洞而不是透明门板；墙体和屋顶具有碰撞，木屋地板上仍可跳跃和落地，屋内不再出现常开测试炉。
21. HUD 在室外显示“室外”、0% 挡风和原始风力等于有效风力；进入木屋后显示“测试木屋”、90% 挡风和明显降低的有效风力。
22. 未放置或未点燃篝火时，木屋内任何位置的热源加成都应为 `+0.0℃`。
23. 暴雪中室外体热下降最快，木屋内无火时下降较慢；只有后续点燃玩家篝火后，火旁趋势才应转为回暖。
24. 暴雪中进入木屋：雪花不能穿过屋顶、墙体或地面；站在开放入口附近仍可看到并允许少量风雪从入口飘入，不能表现为一进 Shelter 就让所有降雪瞬间消失。
25. 出生点与木屋附近能看到 6 个少量 GLB 资源（加载失败时才为 Primitive）；实体木墙必须遮住墙后的资源，只有通过开放入口才能看到屋外物体；准星在约 2.75m 内对准后显示 `[E] 拾取 名称 ×N`，移开或走远即消失。
26. 每按一次 `E` 只触发一次拾取；完全拾取后 Mesh 消失，容量或重量只允许部分拾取时 Mesh 保留且 Prompt 显示余量。
27. 按 `Tab` 打开统一生存菜单的背包 Tab：Pointer Lock 主动释放、鼠标出现；顶部可切换“背包 / 制造 / 建造”，任意时刻只显示一个 Tab。背包应显示多列方形槽位，已占用和空槽合计 24 格。
28. 重复拾取木材确认 Stack 合并；接近容量上限时，未被接受的世界物品不得消失。
29. 手动保存后刷新并点击“继续游戏”，背包应准确恢复；点击“开始新游戏”才使用空背包。
30. 回归确认 WASD、Shift、Space、Pointer Lock、Weather、雪粒子、木屋碰撞和 Shelter HUD 均正常。
31. 拾取至少树枝 ×2、石头 ×2；按 `C` 直接打开统一生存菜单的制造 Tab，确认石斧配方显示所需数量、持有数量和产出。
32. 材料不足时状态明确列出缺失材料；拾取补足后重新打开面板，状态变为“可以制作”。
33. 用鼠标点击石斧配方和“制作当前物品”，确认只制作一次并显示“制作完成：石斧 ×1”；菜单内 E 拾取不会触发。
34. 按 `Tab` 确认树枝/石头减少且石斧增加；石斧不能装备、使用、挥舞或砍树，这是当前预期。
35. 制造 Tab 中按 C 保持/切回制造页；按 Tab、Esc 或点击“返回游戏”关闭整个生存菜单并恢复 Pointer Lock；重新进入不会一次点击制作多次。
36. 制作石斧后保存→刷新→继续，材料和石斧数量保持一致；不会再次执行制作事务。
37. 收集至少 16 个木材和 6 个石头；按 `B` 直接打开生存菜单的建造 Tab，确认可选择木制地基、木制墙体或篝火；Tab/C/B 只切换同一菜单，篝火 Interaction Menu 不与其叠加。
38. 选择木制地基后确认菜单关闭、Pointer Lock 恢复且出现半透明 Ghost；对准雪地时 Ghost 吸附 2m Grid，合法/非法颜色和状态文字明显不同；在固定木屋四周放置时，地基应能与木屋外沿贴合，不应出现约 1m 间隙或因网格错位被迫插入墙体。
39. 按 `R` 确认 Ghost 以 90° 步进旋转；左键成功放置后木材减少 4、正式地基出现，Ghost 保持以便连续建造。
40. 连续放置第二块地基；资源不足时下一次放置必须失败，但已建地基和已消耗的合法事务保持不变。
41. 重新按 `B` 选择木制墙体；墙体只能吸附到地基 North/East/South/West 边缘，未对准地基边缘时显示“需要连接到地基边缘”。
42. 左键放置墙体后木材减少 3；同一 Snap Point 不能重复占用。B 或 Esc 退出 Placement，恢复正常 Gameplay。
43. 走向正式墙体确认玩家不能穿过；站上地基确认仍可落地和跳跃。Ghost 本身不能阻挡玩家或干扰 E Pickup。
44. 使用 F4 预览暴雪，确认新建墙体/地基会按现有 AABB 规则阻挡降雪粒子；这不代表自建结构已成为 Shelter。
45. 保存→刷新→继续后玩家建筑原位恢复，材料不重复消耗，墙体连接点仍占用；可继续新建而不会 ID 冲突。
46. 按 `B` 选择篝火，对准雪地或固定木屋地板确认 Ghost 保留实际命中位置而不吸附 2m Grid；与玩家身体、固定墙体或已有建筑重叠时应显示非法且不扣材料。
47. 在合法位置放置篝火，确认一次扣除石头 ×4、木材 ×2，并出现石圈和交叉木柴；刷新前它应一直存在。
48. 准星在 2.75m 内对准篝火应显示 `[E] 使用 篝火`；隔着实体墙体不应看到 Prompt 或打开菜单。
49. 按 `E` 打开篝火菜单，确认 Pointer Lock 释放、鼠标出现，可点击加柴、点燃、熄灭和关闭；未加柴时点燃应明确失败。
50. 点击“添加 1 木材”，确认背包木材减少 1、燃料增加 180 秒；材料不足、燃料已满或剩余容量不足 180 秒时不应吞掉木材。
51. 点击点燃，确认火焰和暖色光出现；接近时 HUD 热源加成平滑增大，离开约 5m 后回到 `+0.0℃`，体热趋势随有效温度改变。
52. 等待片刻重新打开菜单，确认燃料按真实秒减少；游戏暂停/后台切换不应造成燃料大跳，燃料也不应按 240 倍游戏时间瞬间烧完。
53. 点击熄灭，确认火焰、光与 Heat 加成立即消失但燃料保留；再次点燃应从剩余燃料继续燃烧。
54. 让燃料耗尽，确认显示无燃料、燃料精确停在 0、火焰和 Heat 消失且不会出现负数；重新加柴后可以再次点燃。
55. 使用 F4 预览暴雪，在木屋内点燃篝火，确认“室外快速失温 → 无火木屋减缓 → 火旁回暖”的完整链路；雪仍由屋顶/墙体/建筑 AABB 阻挡，而不是因篝火或 Shelter 全局停掉。
56. 保存→刷新→继续后篝火、燃料和 Inventory 准确恢复，燃烧中的篝火立即有火光和热量；离线不扣燃料。
57. 回归确认 WASD、Shift、Space、E 拾取、Tab、C、B、Pointer Lock、Weather、Snow、Thermal、固定 Cabin Shelter 和动态 Campfire Heat 均正常。
58. 点燃篝火后在 Gameplay 按 Esc：暂停菜单出现，记录 HUD 时间、体热和燃料；等待数秒后三者应完全不变，继续游戏后恢复变化。
59. 暂停期间 Tab/C/B/E/WASD/Shift/Space 不应产生 Gameplay 行为；保存游戏可用，设置和返回标题 Disabled。保存处理中不能通过 Esc 或继续按钮解除暂停。
60. 分别验证 Esc 层级：BuildPlacement 只退出放置；Campfire Menu 只关闭交互；Player Menu 只关闭菜单；Gameplay 才暂停；Paused 才恢复。
61. 在背包、制造、建造 Tab 间切换并执行制作/建造，确认三个页面立即读取同一个最新 Inventory，不出现旧数量或叠层。
62. Browser console has no uncaught error.
63. Gameplay 默认只显示轻量玩家状态、中央准星、交互提示、底部 8 格 Hotbar 与极简快捷键提示；完整 Telemetry 不应默认展开。
64. 在白色雪地、深色木墙和低光照环境分别观察准星；默认白色带深描边、可交互为橙色、合法放置为绿色、非法放置为红色。
65. 按 `1`、`2`、`3` 分别直接进入木制地基、木制墙体和篝火放置；按 `4`–`8` 选择空槽时安全退出当前放置且不产生 Item Use。
66. 滚轮可在 8 格间循环，首尾正确回绕；当前槽位有明显橙色高亮。Player Menu、Campfire Menu 与 Pause 中数字键/滚轮不触发建造。
67. 按 Tab/C/B 检查背包为 Slot Grid + Tooltip + 详情区，制造、建造为图标卡片 + 详情区；拾取、制作或建造后，三页数量继续读取同一份最新 Inventory。
68. 按 `F6` 显示完整 Debug Telemetry，再按一次隐藏；F1–F5 天气视觉预览行为保持不变。
69. `[E] 拾取/使用` 提示具有深色背景和高对比边框，不与准星或 Hotbar 重叠；Campfire 菜单与 Player Menu 使用一致的按钮、边框和间距主题。
70. 按 Tab 打开背包，确认背包弹窗底部与屏幕底部 Hotbar 之间留有清晰间隔；弹窗内部不应再出现复制的快捷栏编辑区。
71. 鼠标移入不同背包物品格，不点击也应立即高亮当前格、显示包含名称/类别/当前格数量/单件重量的 Tooltip，并同步更新右侧详情；移出后 Tooltip 隐藏。再将物品格拖到屏幕底部 `1`–`8` 槽位，确认目标高亮，松开后显示物品图标和当前总数量；关闭菜单后不会自动触发 Item Use。
72. 将一个已占用 Hotbar 槽拖到另一个槽，确认两格内容交换；拖到空槽时原槽变空、内容移动到目标槽。
73. 点击槽位右上角 `×`，或把已占用槽拖到快捷栏右侧“拖到这里清空”，确认只清空该格。取消拖拽或将背包卡片拖到清空区不应误删已有槽位。
74. 选择背包物品后直接点击 Hotbar 槽，确认可作为拖拽之外的快速覆盖方式。
75. 按 B 打开建造页，将木制地基、木制墙体或篝火卡片拖到任意槽；也可选择建筑后点击槽位覆盖。关闭菜单后按对应数字键应进入该建筑的放置模式。
76. 在 Player Menu 内拖拽、点击绑定、交换或清空时，不应进入 BuildPlacement、锁定鼠标或产生 Gameplay 行为；菜单继续允许鼠标交互。
77. 保存→刷新→继续后快捷栏自定义顺序、空槽和选中槽保持不变；只有开始新游戏恢复初始布局。
78. 检查 Player Menu 页签、9 类物品、3 类建筑、HUD 温度/庇护/天气/负重，以及关闭/暂停/继续/警告/信息均显示统一 Registry 图标，不再出现 CSS 字符几何占位；树枝必须显示无叶片、带分叉的枯枝轮廓，不能显示关系节点、树叶、整棵树或工具。
79. 检查菜单卡片默认是 duotone、选中项切换为 fill；Hotbar 默认 bold、当前槽 fill；Tooltip 为 regular。Hover/Selected/Disabled/Warning 颜色由 UI 状态改变，同一图标不加载白/橙/绿多份资源。
80. 在浏览器 Network 面板中过滤 `phosphoricons.com` 和常见 CDN 域名，应没有图标运行时请求；断网刷新已构建页面时图标仍应由本地资源显示。

## Asset Visual Pass manual acceptance

No new dependency is required for this issue. Existing checkouts already have the official Babylon loaders package. The user runs:

```bash
pnpm build
```

Inspect that `dist/assets/models/` and `dist/assets/textures/terrain/` contain the files listed in `docs/ASSET_CREDITS.md`. If a development server is already running, refresh it yourself; otherwise run `pnpm dev`. To test actual production output, run `pnpm preview` after the build. AI must not start/restart services or open a browser.

1. 初始化实际加载期间依次出现“加载环境资源 / 加载物品模型 / 加载建筑模型”，没有虚假百分比；缓存命中时阶段可能很快，不故意延迟。
2. 开始游戏，近距离确认：木材有劈柴截面，石头为不规则岩石，树枝有弯曲分叉且不是树叶；水瓶有瓶肩/瓶颈/瓶盖，罐头有金属卷边/拉环/无品牌标签。
3. 默认没有校准标杆；F6 显示/隐藏仅切换参考物和 Debug，不产生碰撞空气墙或改变暴雪。
4. 木屋应可辨识木料、角柱、屋顶和开放入口，不再是大黑盒；从内外观察墙后物品不能透视。进入/离开、木屋地板跳跃、Shelter 显示与此前相同；门洞没有新增门或锁。
5. 雪地有不纯白的细节；走近/远眺检查 UV 比例、重复接缝、法线、闪烁与白屏。在晴朗与 F4 暴雪下分别观察，F5 恢复计划。
6. 拾取仍为原距离/原数量、部分拾取保持模型、全取后模型和交互目标同时消失。
7. 建木地基和木墙：四梁/木板/横梁可辨识；半透明 Box Ghost 仍是预期；2m Grid/贴边、90° R 旋转、Wall Snap/占用、碰撞/跳跃与扣材料正常，没有模型浮空或额外缝隙。
8. 建篝火：不规则石圈/木柴可辨识；E 菜单、加柴、点燃/熄灭、原火焰/点光源/热量正常；不新增 Fire Particle 或燃烧玩法。raw_meat 仅备好模型，没有新增肉块刷点，这是预期。
9. F4 暴雪检查固定屋顶/墙及新建地基/墙继续挡雪；开放入口允许少量雪飘入，不能进入 Shelter 就全局停雪。
10. 按下方 Save 清单，特别验证本次以前的 v1 存档 → 刷新 → Continue，建筑/资源/篝火使用新外观且 ID、库存、燃料、碰撞和障碍正确；反复继续不出现重复模型。
11. 在可丢弃的测试浏览器配置中，Network Request Blocking 阻止某个 GLB URL 后刷新（禁用缓存），应看到 console warning + 对应旧占位，但仍能开始和读档。解除阻止后刷新恢复；不要删除有价值的唯一存档。
12. Chrome 桌面 1920×1080，记录浏览器版本、硬件、DPR、晴天室外/屋内/F4 暴雪正常 Gameplay FPS，以及冷缓存 Network 总传输量。可用 Chrome DevTools Rendering → Frame Rendering Stats；不要把 NullEngine 测试时长当 FPS。目标冷首载 <50MB；目前仅测得新增美术 3.80MB，不含 JS/WASM。若明显掉帧，先记录场景模型/材质数量，不立即扩展 LOD/Streaming。

Acceptance record (fill with actual observations):

| Check | Current result |
| --- | --- |
| `pnpm typecheck` / tests / diff | AI passed, 41 files / 298 tests |
| Production build and copied public assets | Pending user |
| Babylon PBR appearance / depth / input / weather | Pending user |
| Browser old-save compatibility | Pending user; automated Primitive/GLB/404 restore passed |
| Chrome 1080p FPS, hardware, DPR | Not measured |
| Full cold-cache transfer including engine/WASM | Not measured |

## Save Foundation manual acceptance

No new dependencies were added for Save. The user runs from the repository root:

```bash
pnpm build
pnpm dev
```

If the server is already running, a page refresh is enough to begin acceptance; AI must not restart it or open a browser. Use the **same origin and browser profile** throughout.

1. 无存档时确认 Continue Disabled。开始新游戏，拾取两堆木材、树枝和石头，制作一把石斧。
2. 建地基、吸附木墙、建篝火，添加燃料并点燃；自定义 Hotbar 的物品/建筑顺序和空槽。
3. 移动并转向，在 17:30–18:00 天气过渡期间按 Esc（理想为 17:45）。记录位置/方向、库存格子、资源余量、建筑、燃料、时间、过渡百分比和体热。
4. 点击保存，等待“游戏已保存”。保存和等待期间时间/燃料不动；成功后不自动返回 Gameplay。
5. 刷新：仍先显示标题，不自动恢复。Continue 可用，新游戏覆盖说明可见。点击 Continue，观察真实恢复阶段。
6. 对照保存记录：所有来源状态一致；已耗尽资源不重生，剩余资源数量一致；库存材料不再扣一次；自定义 Hotbar 不被默认布局覆盖。
7. 恢复后 17:30 事件不重播、天气继续当前过渡；燃料不扣离线时间。燃烧篝火有火光、热量和 E 菜单；无火/耗尽状态不发热。
8. 走向木墙、站上地基、跳跃；确认碰撞与落地。F4 仅预览暴雪，验证恢复建筑仍挡雪；F5 回到存档恢复的天气计划。
9. 再建一块地基，确认正常扣一次材料并生成新 ID；修改背包/快捷栏后再次保存、刷新、继续，验证覆盖最新状态。
10. 如果 Continue 后浏览器不允许自动锁定鼠标，应看到暂停界面；手动点击“继续游戏”后 WASD/视角/跳跃恢复，不出现未处理 Promise 错误。
11. 在**可丢弃的测试浏览器配置**中验证 IndexedDB 被禁用/配额不足、损坏字段和未来版本：显示中文失败提示，不进入残缺世界、不静默删除旧档；不要为测试修改有价值的唯一存档。
12. 当前自动测试不等于真实浏览器存储验证；至少在实际目标浏览器记录 Save→Refresh→Continue 结果，其他 Chrome/Edge/Safari/Firefox 未测试时明确标为待验收。

### User asks: “存档怎么用 / 为什么换电脑没有？”

```text
游戏里按 Esc → 保存游戏，看到“游戏已保存”后再退出。下次打开同一地址，点击标题页的“继续游戏”。
目前只有一个本地手动存档，没有自动保存。存档在当前浏览器的网站数据里，不随 Git、电脑或浏览器账号自动同步；更换域名或端口也会使用不同空间。不要清理该网站的数据。
```

### Save errors

- `存档损坏或版本不兼容`: raw data rejected before restore. Future schemas require a compatible game version; do not downgrade or clear valuable data to troubleshoot.
- `无法访问本地存储`: check site storage permissions/free space and close other game tabs if a database upgrade is blocked. Opening New Game still works if initial storage access fails.
- `世界恢复失败，已还原初始世界`: safe to retry Continue or start New Game; on-disk save was not changed.
- `请刷新页面后重试`: rollback itself failed; UI stays locked to prevent partial-world gameplay. Refresh recreates the static world and offers Continue again.
- A different port/hostname or browser profile means a different origin storage namespace, not necessarily a missing/deleted save.

## CI or reproducible installation

Once `pnpm-lock.yaml` exists and has been committed, CI should use:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

`--frozen-lockfile` must fail when `package.json` and `pnpm-lock.yaml` disagree. Fix the dependency change and regenerate the lockfile intentionally; do not bypass the failure silently.

## Common problems

### `pnpm: command not found`

```bash
corepack enable
pnpm --version
```

If Corepack is missing, install the pnpm version declared in `package.json` using the environment's supported method.

### Node.js version is too old

Check:

```bash
node --version
```

Switch to the version declared in `.node-version` using the user's Node version manager, then rerun `pnpm install`. Do not prescribe a specific version manager unless the user asks.

### Port 9999 is already in use

Vite normally selects the next available port. Use the URL printed by Vite. To request a specific port:

```bash
pnpm dev -- --port 10000
```

### `No Physics Engine available.`

Confirm `src/world/createWorldScene.ts` still imports the Babylon physics engine component before enabling Havok:

```ts
import "@babylonjs/core/Physics/physicsEngineComponent";
```

Then ask the user to stop and restart Vite. Do not remove this import as “unused”; it registers required runtime side effects.

### Havok `.wasm` fails to load

Check the browser Network and Console panels. Confirm the generated Havok `.wasm` asset is served successfully and is not blocked by the hosting platform, proxy, CSP, or incorrect static-asset configuration.

### Build reports a large chunk warning

The Babylon bundle can currently trigger Vite's chunk-size warning. A warning alone is not a failed build. Record the warning, but defer code splitting until there is a measured loading or deployment requirement.

### Dependency state is inconsistent

Do not immediately delete lockfiles or dependency directories. First inspect:

```bash
pnpm --version
pnpm install --frozen-lockfile
```

If the lockfile is intentionally being created for the first time, run `pnpm install` without `--frozen-lockfile` and commit the generated `pnpm-lock.yaml`.

## Chinese response templates

### User asks: “怎么启动？”

```text
在项目根目录执行：

pnpm install
pnpm dev

然后打开终端里 Vite 输出的本地地址。项目默认地址是 http://localhost:9999；如果端口被占用，请以终端实际显示的地址为准。
```

### User asks: “怎么打包？”

```text
在项目根目录执行：

pnpm build

构建结果会生成在 dist/ 目录。需要本地检查生产版本时，再执行 pnpm preview。
```

### User asks: “怎么检查代码？”

```text
建议依次执行：

pnpm typecheck
pnpm test
pnpm build

类型检查、测试和生产构建需要分别通过；浏览器画面和操作还需要单独手动验收。
```

### User asks: “换电脑后怎么运行？”

```text
安装符合 package.json 要求的 Node.js 后，在仓库根目录执行：

corepack enable
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev

项目不依赖原开发电脑的绝对路径。请保留并提交 pnpm-lock.yaml，以保证不同电脑安装相同依赖版本。
```
