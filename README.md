# Stormhaven

Stormhaven 是一款浏览器优先的第一人称 3D 单机 PvE 生存建造游戏。长期体验核心不是战斗，而是让玩家把寒冷、恶劣、危险的外部世界，逐步转变为安全、温暖、先进的家园。

当前仓库已完成 Vertical Slice v0.1「第一场暴雪」的**基础工程、时间/天气、Weather Presentation、Player Thermal、Shelter + Heat Source，以及 Interaction + Item + Inventory Foundation v0.1**。玩家可拾取场景物资并在只读 Debug Inventory 中确认结果；Crafting、物品使用、容器、存档和建筑玩法尚未实现。

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
- Data Driven Shelter Profile、AABB 室内检测与挡风/温度加成
- 通用 Heat Source Profile、smoothstep 距离衰减、多热源叠加和全局上限
- 与领域坐标共用配置的固定测试木屋、入口和常开测试炉占位表现
- 庇护状态、挡风比例、原始/有效风力和热源加成 Debug HUD
- 局部降水粒子与静态碰撞障碍的路径检测：屋顶、墙体、地面和标杆会拦截雪花，开放入口仍允许风雪进入
- 屏幕中央 2.75m Interaction Raycast、`E` 单次拾取与可见 Prompt
- JSON 驱动的 8 类 Item Definition 与 6 个场景 World Pickup
- 24 Slot / 30kg Inventory、Stack 合并及容量/重量限制下的 Partial Add
- `I` 键只读 Debug Inventory、拾取反馈与 Pickup Mesh 生命周期同步
- GameTime、Forecast、Weather、Thermal、Item、Inventory、Pickup Transaction、Camera Speed 和配置的 Vitest 单元测试
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
| `E` | 拾取准星对准的物资 |
| `I` | 打开或关闭只读 Debug Inventory |
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

`src/core/Game.ts` 只负责 Babylon Engine、Scene、Simulation 与表现控制器的生命周期编排。`GameSimulation` 协调纯逻辑 `GameClock`、`ForecastSystem`、`WeatherManager`、`ShelterSystem`、`HeatSourceSystem` 与 `ThermalModel`；相机位置只以普通 `{x,y,z}` 数据进入模拟，不把 Babylon 类型泄漏到领域层。场景、玩家控制、界面分别放在 `world`、`player`、`ui` 模块中。

Thermal 只输出体热状态，不扣除生命。Interaction 的运行链为 Camera Raycast → Target ID → `InteractionService` → `Inventory`/`WorldPickupRegistry` → Babylon/UI Presentation。Inventory 不依赖 Babylon 或 DOM，World Pickup Domain 不保存 Mesh。

## 当前阶段限制

本 Issue 已完成并停止。未经新 Issue 明确授权，不要继续扩展 Interaction、Item 或 Inventory；不要顺带实现 Crafting、Building、Campfire、Fuel、物品使用/消耗、装备、耐久玩法、丢弃、容器 UI、存档、Loot Table 或采集。下一步建议见 [AI 交接记录](docs/AI_HANDOFF.md)。
