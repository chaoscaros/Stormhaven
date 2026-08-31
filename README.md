# Stormhaven

Stormhaven 是一款浏览器优先的第一人称 3D 单机 PvE 生存建造游戏。长期体验核心不是战斗，而是让玩家把寒冷、恶劣、危险的外部世界，逐步转变为安全、温暖、先进的家园。

当前仓库已完成 Vertical Slice v0.1「第一场暴雪」的基础玩法链，并完成 **HUD + UX Overhaul v0.1**。正常游玩界面现在使用高对比状态准星、8 格建造快捷栏、简化状态摘要与可切换调试遥测；统一生存菜单以图标卡片和详情区展示背包、制造与建造。存档与读取尚未实现。

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
- 正式第一版标题界面、真实初始化 Loading Overlay Contract 与 HUD
- 单一 Game Shell State：Boot、Main Menu、Gameplay、Player Menu、Interaction Menu、Build Placement、Paused
- Tab/C/B 统一生存菜单及背包/制造/建造 Tab；三个页面共享同一 Inventory
- Esc 状态优先级与 Pause Menu；暂停时冻结 GameTime、Weather、Thermal、Campfire Fuel 并卸载玩家输入
- 高对比 Crosshair：默认、可交互、建造合法与建造非法四种状态
- 8 格 Hotbar：数字键与滚轮选择，前三格直达木地基、木墙和篝火放置
- 简化玩家状态 HUD；完整 Debug Telemetry 默认隐藏并由 F6 切换
- Inventory/Crafting/Building 图标卡片、详情区及统一寒地工业主题
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
- 与领域坐标共用配置的固定测试木屋和带实体木色门框的开放入口；原常开测试炉已移除
- 庇护状态、挡风比例、原始/有效风力和热源加成 Debug HUD
- 局部降水粒子与固定/动态碰撞障碍的路径检测：屋顶、墙体、地面、标杆和玩家建筑会拦截雪花，开放入口仍允许风雪进入
- 屏幕中央 2.75m Interaction Raycast、`E` 单次拾取与可见 Prompt
- JSON 驱动的 9 类 Item Definition 与 6 个场景 World Pickup；资源受场景墙体正常遮挡，不使用隔墙覆盖渲染
- 24 Slot / 30kg Inventory、Stack 合并及容量/重量限制下的 Partial Add
- `Tab` 键只读 Inventory 菜单；打开时释放 Pointer Lock，可用鼠标查看和关闭
- Data Driven Recipe、Runtime Validation、需求预览与最大可制作数量
- 草稿 Inventory 模拟输入消耗和输出加入，完整成功后原子提交
- 生存菜单制造 Tab 支持鼠标选择配方和制作，方向键/Enter 保留为补充
- 石斧真实配方：树枝 ×2 + 石头 ×2 → 石斧 ×1
- JSON 驱动的木制地基/墙体/篝火、BuildCatalog 与 Runtime Validation
- `B` 键鼠标建造菜单、半透明 Ghost、与固定木屋外沿对齐的 2m Grid Snap、Foundation Edge Wall Snap 与 `R` 旋转
- 5m 放置距离、静态/动态 AABB 重叠校验和 Inventory 草稿原子资源事务
- 当前会话内 WorldBuildingRegistry、动态 Camera Collision 与增量降水障碍注册
- JSON 驱动 Fuel Definition 与 Campfire Config；木材每份提供 180 秒燃料，容量上限 900 秒
- 放置篝火时原子扣除石头 ×4、木材 ×2，并同步创建 World Building、Campfire State、Interaction Target 与禁用的动态 HeatSource
- `E` 篝火交互菜单；鼠标点击添加木材、点燃、熄灭和关闭，燃料不足、已满及状态冲突均有稳定失败反馈
- 篝火燃烧使用暂停感知且最多 0.25 秒的真实模拟增量，不受 240 倍 GameClock 影响；熄灭或燃料耗尽立即停止供热
- 低模石圈、交叉木柴、火焰与点光源表现；视觉仅消费 Campfire State，不持有燃料或热量规则
- GameTime、Forecast、Weather、Thermal、Item、Inventory、Pickup/Campfire Transaction、Camera Speed 和配置的 Vitest 单元测试
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

默认打开 `http://localhost:9999`。如果该端口被占用，请以 Vite 终端实际输出的地址为准。等待初始化完成后点击「开始游戏」锁定鼠标。

| 输入 | 操作 |
| --- | --- |
| `W A S D` | 移动 |
| 鼠标 | 控制视角 |
| `Space` | 跳跃 |
| `Shift` | 奔跑 |
| `E` | 拾取准星对准的物资；使用准星对准的篝火 |
| `Tab` | 打开背包 Tab；生存菜单已打开时关闭整个菜单 |
| `C` | 直接打开或切换到生存菜单的制造 Tab |
| `B` | 直接打开或切换到建造 Tab；放置中退出建造模式 |
| 鼠标点击 | 选择配方、制作、操作篝火、关闭菜单 |
| 建造放置中左键 | 确认放置并消耗材料 |
| `R` | 建造放置中按配置步长旋转 Ghost |
| `↑` / `↓` / `Enter` | Crafting 菜单的辅助键盘操作 |
| `Esc` | 关闭当前菜单/放置；Gameplay 中暂停；暂停时继续 |
| `F1` / `F2` / `F3` / `F4` | 仅预览晴朗 / 多云 / 降雪 / 暴雪视觉 |
| `F5` | 退出视觉预览，恢复跟随天气计划 |
| `1`–`8` | 选择 Hotbar 槽位；建造槽会直接进入对应放置模式 |
| 鼠标滚轮 | 循环选择 Hotbar 槽位 |
| `F6` | 显示或隐藏完整 Debug Telemetry |

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

Thermal 只输出体热状态，不扣除生命。Crafting 运行链为 Recipe JSON → `RecipeCatalog` → `CraftingService` → Inventory Draft → Final Snapshot Commit。Building 运行于 Building JSON → `BuildCatalog` → Placement Validation → Inventory Draft → `WorldBuildingRegistry` → Gameplay Binding/Babylon Presentation。篝火 Binding 将已提交建筑注册到 `CampfireSystem`，燃烧状态再动态启停 `HeatSourceSystem`。UI 不直接增删物品，领域系统不依赖 Babylon 或 DOM。

## 当前阶段限制

本 Issue 已完成并停止。未经新 Issue 明确授权，不要扩展 HUD/Hotbar、Game Shell、Campfire/Fuel 或 Building/Crafting，也不要实现 Save/Load/Continue、快捷栏拖拽、Settings、完整 Loading Pipeline、Shelter Enclosure、Storage、Wetness 或工具使用。下一步建议见 [AI 交接记录](docs/AI_HANDOFF.md)。
