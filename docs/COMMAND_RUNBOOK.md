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

1. The Chinese Stormhaven start screen appears.
2. No startup failure panel appears.
3. Clicking `进入测试区域` locks the pointer.
4. Moving the mouse changes the first-person view relative to the four calibration beacons.
5. `W A S D` changes the distance and direction to those beacons.
6. Holding `Shift` increases movement speed.
7. Pressing `Space` jumps and the player lands on the ground.
8. Pressing `Esc` releases the pointer.
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
20. 从出生点直行可经正面入口进入固定测试木屋；墙体、屋顶和测试炉具有碰撞，木屋地板上仍可跳跃和落地。
21. HUD 在室外显示“室外”、0% 挡风和原始风力等于有效风力；进入木屋后显示“测试木屋”、90% 挡风和明显降低的有效风力。
22. 接近屋内橙色测试炉时热源加成平滑增大，离开半径后回到 `+0.0℃`；测试炉始终启用，不存在点火、燃料或交互。
23. 暴雪中室外体热下降最快、屋内远离炉子时下降较慢、炉旁趋势应转为回暖。
24. 进入测试木屋后已有雪花应立即清除，室内不再生成局部降雪粒子；从入口离开木屋后应恢复当前天气的降雪。
25. Browser console has no uncaught error.

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
