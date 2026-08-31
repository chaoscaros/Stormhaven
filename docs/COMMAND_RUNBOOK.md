# Stormhaven Command Runbook

> Primary audience: AI agents and maintainers. This is the canonical reference for setup, startup, validation, build, and preview commands.

## Response policy

When a user asks how to install, start, build, test, preview, or troubleshoot this project:

1. **Answer the user in Chinese**, even though this runbook is written mainly in English.
2. Give the smallest command set that answers the question.
3. Clearly distinguish first-time setup from daily startup.
4. Never claim a command passed unless it was actually executed in the current verified context.
5. For the current project owner, do not start the server, compile, restart, or open a browser unless the user explicitly authorizes it. Provide commands for the user to run.
6. Use repository-relative instructions. Do not include a developer-specific absolute path in reusable documentation.

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
2. 初始化完成后显示“第一场暴雪”标题页和“开始游戏”；没有启动失败面板，也没有假的继续游戏/读取存档按钮。
3. 在标题页等待数秒，时间必须保持 `14:00`；点击“开始游戏”后才进入场景并请求 Pointer Lock。
4. 开始后移动鼠标会相对四个校准标杆改变第一人称视角。
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
25. 出生点与木屋附近能看到 6 个少量 Primitive 资源；实体木墙必须遮住墙后的资源，只有通过开放入口才能看到屋外物体；准星在约 2.75m 内对准后显示 `[E] 拾取 名称 ×N`，移开或走远即消失。
26. 每按一次 `E` 只触发一次拾取；完全拾取后 Mesh 消失，容量或重量只允许部分拾取时 Mesh 保留且 Prompt 显示余量。
27. 按 `Tab` 打开统一生存菜单的背包 Tab：Pointer Lock 主动释放、鼠标出现；顶部可切换“背包 / 制造 / 建造”，任意时刻只显示一个 Tab。
28. 重复拾取木材确认 Stack 合并；接近容量上限时，未被接受的世界物品不得消失。
29. 刷新页面后背包恢复为空，这是当前未实现 Save 的预期行为。
30. 回归确认 WASD、Shift、Space、Pointer Lock、Weather、雪粒子、木屋碰撞和 Shelter HUD 均正常。
31. 拾取至少树枝 ×2、石头 ×2；按 `C` 直接打开统一生存菜单的制造 Tab，确认石斧配方显示所需数量、持有数量和产出。
32. 材料不足时状态明确列出缺失材料；拾取补足后重新打开面板，状态变为“可以制作”。
33. 用鼠标点击石斧配方和“制作当前物品”，确认只制作一次并显示“制作完成：石斧 ×1”；菜单内 E 拾取不会触发。
34. 按 `Tab` 确认树枝/石头减少且石斧增加；石斧不能装备、使用、挥舞或砍树，这是当前预期。
35. 制造 Tab 中按 C 保持/切回制造页；按 Tab、Esc 或点击“返回游戏”关闭整个生存菜单并恢复 Pointer Lock；重新进入不会一次点击制作多次。
36. 刷新页面后 Inventory 与 Crafting State 清空，这是当前未实现 Save 的预期行为。
37. 收集至少 16 个木材和 6 个石头；按 `B` 直接打开生存菜单的建造 Tab，确认可选择木制地基、木制墙体或篝火；Tab/C/B 只切换同一菜单，篝火 Interaction Menu 不与其叠加。
38. 选择木制地基后确认菜单关闭、Pointer Lock 恢复且出现半透明 Ghost；对准雪地时 Ghost 吸附 2m Grid，合法/非法颜色和状态文字明显不同；在固定木屋四周放置时，地基应能与木屋外沿贴合，不应出现约 1m 间隙或因网格错位被迫插入墙体。
39. 按 `R` 确认 Ghost 以 90° 步进旋转；左键成功放置后木材减少 4、正式地基出现，Ghost 保持以便连续建造。
40. 连续放置第二块地基；资源不足时下一次放置必须失败，但已建地基和已消耗的合法事务保持不变。
41. 重新按 `B` 选择木制墙体；墙体只能吸附到地基 North/East/South/West 边缘，未对准地基边缘时显示“需要连接到地基边缘”。
42. 左键放置墙体后木材减少 3；同一 Snap Point 不能重复占用。B 或 Esc 退出 Placement，恢复正常 Gameplay。
43. 走向正式墙体确认玩家不能穿过；站上地基确认仍可落地和跳跃。Ghost 本身不能阻挡玩家或干扰 E Pickup。
44. 使用 F4 预览暴雪，确认新建墙体/地基会按现有 AABB 规则阻挡降雪粒子；这不代表自建结构已成为 Shelter。
45. 刷新页面后所有玩家建筑消失，这是当前 WorldBuildingRegistry 未接入 Save 的预期行为。
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
56. 刷新页面后篝火、燃料与 Inventory 一并清空，这是当前未实现 Save 的预期行为。
57. 回归确认 WASD、Shift、Space、E 拾取、Tab、C、B、Pointer Lock、Weather、Snow、Thermal、固定 Cabin Shelter 和动态 Campfire Heat 均正常。
58. 点燃篝火后在 Gameplay 按 Esc：暂停菜单出现，记录 HUD 时间、体热和燃料；等待数秒后三者应完全不变，继续游戏后恢复变化。
59. 暂停期间 Tab/C/B/E/WASD/Shift/Space 不应产生 Gameplay 行为；保存游戏、设置和返回标题均明确 Disabled。
60. 分别验证 Esc 层级：BuildPlacement 只退出放置；Campfire Menu 只关闭交互；Player Menu 只关闭菜单；Gameplay 才暂停；Paused 才恢复。
61. 在背包、制造、建造 Tab 间切换并执行制作/建造，确认三个页面立即读取同一个最新 Inventory，不出现旧数量或叠层。
62. Browser console has no uncaught error.
63. Gameplay 默认只显示轻量玩家状态、中央准星、交互提示、底部 8 格 Hotbar 与极简快捷键提示；完整 Telemetry 不应默认展开。
64. 在白色雪地、深色木墙和低光照环境分别观察准星；默认白色带深描边、可交互为橙色、合法放置为绿色、非法放置为红色。
65. 按 `1`、`2`、`3` 分别直接进入木制地基、木制墙体和篝火放置；按 `4`–`8` 选择空槽时安全退出当前放置且不产生 Item Use。
66. 滚轮可在 8 格间循环，首尾正确回绕；当前槽位有明显橙色高亮。Player Menu、Campfire Menu 与 Pause 中数字键/滚轮不触发建造。
67. 按 Tab/C/B 检查背包、制造、建造均为图标卡片 + 详情区；拾取、制作或建造后，三页数量继续读取同一份最新 Inventory。
68. 按 `F6` 显示完整 Debug Telemetry，再按一次隐藏；F1–F5 天气视觉预览行为保持不变。
69. `[E] 拾取/使用` 提示具有深色背景和高对比边框，不与准星或 Hotbar 重叠；Campfire 菜单与 Player Menu 使用一致的按钮、边框和间距主题。

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
