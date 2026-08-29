# Stormhaven

Stormhaven 是一款浏览器优先的第一人称 3D 单机 PvE 生存建造游戏。长期体验核心不是战斗，而是让玩家把寒冷、恶劣、危险的外部世界，逐步转变为安全、温暖、先进的家园。

当前仓库已完成 Vertical Slice v0.1「第一场暴雪」的**基础工程、时间/天气 Domain、Weather Presentation Layer v0.1 与 Player Thermal Model v0.1**。Wetness、Shelter、Campfire、Health Damage、Inventory、Crafting、存档和建筑玩法均未实现。

## 当前完成内容

- TypeScript 严格模式
- Vite 开发与生产构建
- Babylon.js 渲染
- Babylon.js Havok 物理引擎初始化
- 500m × 500m 雪地测试区域
- 程序化天空、雪地、雾和灯光
- 第一人称鼠标视角、WASD 移动、Shift 奔跑、Space 跳跃
- Babylon Collision Coordinator 与米/秒 Camera Speed 换算
- 用于手动确认控制效果的雪地校准标杆
- 基础启动界面与 HUD
- 确定性的 GameClock、暂停和 Time Scale
- Data Driven WeatherDefinition、WeatherCatalog 和 WeatherManager
- 基于游戏时间的 WeatherTransition 与 ForecastSystem
- Day 1 14:00 → 17:30 开始过渡 → 18:00 Blizzard 的 JSON Schedule
- 时间、天气、预报和过渡进度 Debug HUD
- Data Driven Weather Visual Profile、Runtime Validation 与纯插值 Mapper
- 天空明暗/阴云、指数雾、半球光、方向光的连续天气过渡
- 相机局部单粒子系统降雪与暴雪风向表现
- F1–F4 视觉预览、F5 恢复计划驱动及视觉天气 HUD
- Weather Gameplay State 与 Transition 参数连续插值
- Data Driven Thermal Config、Effective Temperature 和游戏化 Wind Chill
- 确定性的 0..100 Thermal Reserve、Trend 与五档稳定 Status ID
- 环境温度、体感、风力、体热、趋势和热状态 Debug HUD
- GameTime、Forecast、Weather、Thermal、Camera Speed 和配置的 Vitest 单元测试
- 为后续系统预留的模块目录

## 环境要求

- Node.js 22.12 或更高版本
- pnpm 11.24 或更高版本
- 支持 WebAssembly 和 WebGL 2 的现代桌面浏览器

项目不依赖任何本机绝对路径，可以在其他电脑或 CI 环境中重新安装和构建。

## 安装与启动

```bash
pnpm install
pnpm dev
```

默认打开 `http://localhost:9999`。如果该端口被占用，请以 Vite 终端实际输出的地址为准。点击「进入测试区域」后锁定鼠标。

| 输入 | 操作 |
| --- | --- |
| `W A S D` | 移动 |
| 鼠标 | 控制视角 |
| `Space` | 跳跃 |
| `Shift` | 奔跑 |
| `Esc` | 释放鼠标 |
| `F1` / `F2` / `F3` / `F4` | 仅预览晴朗 / 多云 / 降雪 / 暴雪视觉 |
| `F5` | 退出视觉预览，恢复跟随天气计划 |

## 质量检查

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 文档入口

- [游戏设计](docs/GAME_DESIGN.md)：产品定位、核心体验和阶段边界
- [技术设计](docs/TECH_DESIGN.md)：架构、模块职责和技术约束
- [命令手册](docs/COMMAND_RUNBOOK.md)：安装、启动、测试、构建、预览及常见故障处理
- [GPT 规划 Brief](docs/GPT_PLANNING_BRIEF.md)：提供给 GPT 制定后续开发路线图的完整项目上下文
- [AI 交接记录](docs/AI_HANDOFF.md)：当前状态、验证情况、已知问题和下一步建议
- [开发规范](AGENTS.md)：所有开发者和 AI 必须遵守的工作规则

## 架构概览

`src/core/Game.ts` 只负责 Babylon Engine、Scene、Simulation 与表现控制器的生命周期编排。`GameSimulation` 协调纯逻辑 `GameClock`、`ForecastSystem`、`WeatherManager` 与 `ThermalModel`；Weather Domain 分别通过 Gameplay Mapper 进入 Thermal、通过 Visual Mapper 进入 Babylon。场景、玩家控制、界面分别放在 `world`、`player`、`ui` 模块中。

Thermal 只输出体热状态，不扣除生命，也不检测室内、火源、衣物或湿度。Inventory、Crafting、Building 等目录仍只有占位文件。

## 当前阶段限制

在新的 Issue 明确授权之前，不要继续扩展 Thermal、Weather Visual Effects，也不要实现 Wetness、Shelter、Campfire、Health Damage、Inventory、Crafting、存档或建筑系统。下一步建议见 [AI 交接记录](docs/AI_HANDOFF.md)。
