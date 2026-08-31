# Stormhaven AI 交接记录

> 本文档是跨 AI、跨会话、跨电脑继续开发时的首要状态来源。开始工作前必须先阅读，完成实质改动后必须更新。

## 当前状态

- 当前里程碑：Vertical Slice v0.1「第一场暴雪」的 HUD + UX Overhaul v0.1
- 当前版本：`0.1.0`
- 包管理器：pnpm
- Git 状态：`main` 跟踪 `origin/main`；完成开发或修复后使用中文提交信息，并推送远端，方便问题定位与版本回退
- 功能状态：Gameplay 已收敛为高对比状态准星、Interaction Prompt、8 格 Hotbar、简化 Player Status；F6 切换完整 Debug Telemetry。Player Menu 的 Inventory 按真实 24 Slot 显示多列方格与空槽，悬停/聚焦立即显示 Tooltip 并更新详情；Hotbar 不嵌入弹窗而保持为独立底部 HUD，Inventory/Building 卡片可拖入槽位，槽位可交换、点击覆盖并逐格清空；Inventory/Crafting/Building 仍实时共享 Inventory，Pause 与 Esc 契约不变
- 明确未实现：Save/IndexedDB、Load/Continue、Hotbar 持久化/多套布局、Equipment/Item Use、Save Slot、Autosave、Settings、完整 Loading Pipeline、Shelter Enclosure、Storage/Container、Tool Gameplay、Wetness

## 已完成内容

- Vite + TypeScript 严格模式工程
- Babylon.js 9 与 Havok Physics 依赖
- 500m × 500m 雪地基础 Scene
- 程序化天空、雾、半球光和方向光
- 静态地面 PhysicsAggregate
- 第一人称鼠标视角
- WASD 移动、Shift 奔跑、Space 跳跃
- 显式 Babylon Collision Coordinator 注册
- 米/秒到 Babylon Camera Speed 的集中换算
- Pointer Lock 后 Canvas 聚焦与四个控制校准标杆
- 正式标题界面、真实初始化 Loading Overlay、HUD 和错误提示
- 单一 Boot/Main/Gameplay/Player/Interaction/BuildPlacement/Paused Shell State
- Player Menu 的 Inventory/Crafting/Building Tab、快捷键路由与实时 Inventory 联动
- Esc 层级、Pointer Lock 主动/意外释放同步和 Pause Menu
- Boot/Main/Pause 的 Simulation Pause；非 Gameplay/Placement 的 Camera Input Detach
- Gameplay HUD Overhaul、高对比状态 Crosshair 与清晰 Interaction Prompt
- 8 格 Hotbar 纯逻辑模型、1–8/滚轮选择、默认三项 Build Shortcut、拖入/交换/点击覆盖/清空与 Placement 联动
- 简化 Player Status HUD 与默认折叠、F6 切换的 Debug Telemetry
- Inventory 真实 24 Slot Grid、数量角标、Hover/Focus Tooltip 与即时详情；Crafting/Building 图标卡片、详情分区与 Campfire 统一视觉主题
- 基础配置单元测试
- 中文 README、游戏设计、技术设计和协作规范
- 后续模块目录占位
- 纯逻辑 GameClock、Pause、Time Scale 和时间格式化
- Data Driven WeatherDefinition 与 Runtime Validation
- WeatherCatalog、WeatherManager 和 WeatherTransition
- ForecastSystem 与 First Blizzard JSON Schedule
- Day 1 14:00 → 17:30 Transition → 18:00 Blizzard 确定性流程
- 单帧 Delta Clamp，避免后台 Tab 恢复后时间大幅跳跃
- 时间、天气、预报和 Transition Progress Debug HUD
- Data Driven Weather Visual Profile 与 Runtime Validation
- 与 Babylon 解耦的 WeatherVisualMapper、Clamp 和连续插值
- 程序化天空 Shader、Fog、HemisphericLight、DirectionalLight 连续过渡
- 一个容量 2000、围绕相机移动的程序化雪 ParticleSystem
- F1–F4 Presentation Preview、F5 恢复 Schedule 驱动
- HUD 分开展示 Domain Weather 与 Visual Weather/Preview 状态
- Weather Gameplay State 与 Transition 全参数连续插值
- Data Driven Thermal Config 与轻量 Runtime Validation
- Effective Temperature、smoothstep Wind Chill 和 Weather → Thermal Input Adapter
- 确定性的 0..100 Thermal Reserve、Trend 与五档稳定 Status ID
- 环境、体感、风力、体热、趋势和热状态 Debug HUD
- First Blizzard Schedule → Weather Gameplay → Thermal Domain Integration Test
- Data Driven Shelter Profile、Inclusive AABB Volume 与纯坐标 ShelterSystem
- Data Driven Heat Source Profile、smoothstep 距离衰减、多源叠加与全局上限
- Weather + Shelter + Heat Source → ThermalEnvironmentBuilder → ThermalModel 组合链路
- 相机每帧只向 Simulation 传递普通 `{x,y,z}` 坐标，不泄漏 Babylon 类型
- 共用 Scenario Placement 的固定 Primitive 测试木屋、入口与碰撞；不再包含常开测试炉
- HUD 展示庇护、挡风、原始→有效风力及热源加成
- 暴雪中室外失温、无火庇护减缓、玩家篝火旁回暖及 FPS 一致性 Integration Test
- 局部降水粒子路径与静态碰撞 Mesh AABB 的 Slab 检测，碰撞后回收粒子
- JSON 驱动的 9 个 ItemDefinition 和 6 个 First Blizzard Pickup Placement
- 纯 `ItemCatalog`、`ItemStack`、Slot/Stack/Weight Inventory 与 Partial Add
- Camera Forward Ray → Target ID → InteractionService → Inventory/Registry → Presentation
- `E` 防 Key Repeat 单次拾取、`Tab` 只读背包、Prompt 和结果反馈
- Pickup 完全消费才 dispose Mesh；容量/重量不足时保留全部或剩余数量
- JSON 驱动 Stone Axe Recipe、RecipeCatalog 与完整 Runtime Validation
- Craft Requirement、Missing Inputs、Max Craftable Count 与稳定 Failure Reason
- Clone Draft → Consume → Add Output → Validate Final Snapshot → Atomic Commit
- Tab 背包与 C 键制作菜单进入统一菜单态：释放 Pointer Lock、显示鼠标、支持点击关闭/选择配方/制作；打开时屏蔽 E Interaction
- JSON 驱动的 `foundation_wood` / `wall_wood` / `campfire_basic` BuildDefinition 与完整 Runtime Validation
- 单一 Gameplay/Inventory/Crafting/Building/BuildPlacement/Campfire Mode；Tab/C/B/E 篝火菜单互斥
- B 键鼠标 Building Menu、Camera Forward Ground Ray 与单一半透明 Ghost
- 与固定木屋外沿对齐的 2m Foundation Grid、90° Rotation、Foundation 四边 Wall Snap 与 5m Build Distance
- 固定场景/World Building AABB Overlap、稳定失败 Reason 与实时资源重校验
- Inventory Draft 消耗、Presentation Candidate、Inventory/Registry Commit 与失败回滚
- 当前会话 WorldBuildingRegistry、SnapPoint 占用和连续建造
- 正式 Mesh 动态 Camera Collision；Ghost 无碰撞、不可 Pick、不会注册 World Entity
- PrecipitationObstacleRegistry 静态初始化及动态 add/remove/update；Snow 读取共享 Snapshot
- Data Driven wood Fuel（180 秒/件）与 Campfire Config（900 秒容量、稳定 Heat Profile ID）
- Campfire Building Binding：成功建造同步创建 State、Interaction Target 和默认禁用的 HeatSource，失败完整回滚
- CampfireSystem 的原子加柴、点燃、熄灭、重燃、燃料耗尽与动态 HeatSource 生命周期
- E 篝火鼠标菜单、稳定反馈、石圈/木柴/火焰/点光源状态表现
- 燃料和 Thermal 共用 Clamp 后真实 Delta；Pause 为零且不受 `timeScale=240` 影响
- 36 个测试文件、240 个单元与集成测试

## 关键架构入口

| 文件 | 作用 |
| --- | --- |
| `src/main.ts` | 浏览器入口，初始化 UI 和 Game |
| `src/core/Game.ts` | Engine/Scene 生命周期编排 |
| `src/core/config.ts` | 世界和玩家共享配置 |
| `src/core/time/GameClock.ts` | 确定性游戏时钟、Pause 和 Time Scale |
| `src/core/simulation/GameSimulation.ts` | 时间、Forecast 和 Weather 的小型协调层 |
| `src/core/simulation/createFirstBlizzardSimulation.ts` | 从 JSON 创建 First Blizzard Scenario |
| `src/world/createWorldScene.ts` | Havok、天空、地面、雾和灯光 |
| `src/player/createFirstPersonCamera.ts` | 第一人称移动、奔跑和跳跃 |
| `src/player/cameraSpeed.ts` | 米/秒配置到 Babylon Camera Speed 的换算 |
| `src/player/PlayerVerticalMotion.ts` | 与 Babylon 解耦的跳跃和重力计算 |
| `src/world/createControlReferenceMarkers.ts` | 无玩法含义的控制校准标杆 |
| `src/ui/setupFoundationUi.ts` | 指针锁定、Gameplay/Menu 状态切换、Inventory Slot Grid/Tooltip 和基础 DOM 状态 |
| `src/ui/GameUiModeController.ts` | 纯 Game Shell State、Player Tab 路由与 Pointer Lock 契约 |
| `src/ui/hotbar/HotbarModel.ts` | 8 格 Hotbar 纯状态、覆盖/清空/交换、数字键映射、滚轮回绕与 Mode Gate |
| `src/ui/hotbar/HotbarDragData.ts` | Inventory/Building/Hotbar 共用的内部拖拽 Payload 写入与校验 |
| `src/ui/hotbar/setupHotbarUi.ts` | 独立底部 Hotbar 的 Gameplay 选择、Player Menu 拖拽编辑与 BuildPlacement 窄绑定 |
| `src/items/ItemCatalog.ts` | Item JSON 校验、重复 ID 检查与稳定查询 |
| `src/inventory/Inventory.ts` | Babylon/DOM 无关的 Slot、Stack、Weight 与 Partial Add |
| `src/crafting/RecipeCatalog.ts` | Recipe JSON 校验、重复/未知 Item 检查与稳定 ID 查询 |
| `src/crafting/CraftingService.ts` | Requirement、Plan、最大数量与原子 Craft Transaction |
| `src/crafting/CraftingTypes.ts` | Requirement、Plan、Result 和稳定 Failure Reason 契约 |
| `src/ui/setupCraftingDebugUi.ts` | 鼠标优先的 C 键制作菜单、键盘补充操作及 Listener 生命周期 |
| `src/building/BuildDefinition.ts` | Build JSON Runtime Validation 与稳定字段契约 |
| `src/building/BuildCatalog.ts` | 已验证 BuildDefinition 的稳定 ID 查询 |
| `src/building/PlacementValidator.ts` | Grid/Wall Support/距离/AABB 的纯放置校验 |
| `src/building/BuildService.ts` | Inventory Draft、Presentation Candidate 与 Registry 原子事务 |
| `src/building/WorldBuildingRegistry.ts` | 会话内 World Entity、Bounds、SnapPoint 与占用状态 |
| `src/building/presentation/BuildingPlacementController.ts` | Camera Ray、单 Ghost、左键/R/B/Esc 的 Babylon 适配 |
| `src/building/presentation/BuildingPresentation.ts` | 正式 Mesh、Camera Collision 与动态降水障碍注册 |
| `src/building/BuildingGameplayBinding.ts` | 建筑提交后 Gameplay 生命周期与回滚边界 |
| `src/ui/setupBuildingDebugUi.ts` | B 键鼠标 Building Menu、材料状态和放置反馈 |
| `data/building/buildings.json` | 木制地基、木制墙体与篝火定义 |
| `src/survival/campfire/CampfireSystem.ts` | 状态、原子加柴、燃烧、交互目标和动态热源 |
| `src/survival/campfire/CampfireBuildingBinding.ts` | World Building 与 Campfire Gameplay 生命周期接线 |
| `src/survival/campfire/FuelCatalog.ts` | Fuel JSON 校验与稳定 Item ID 查询 |
| `src/ui/setupCampfireUi.ts` | E 篝火菜单、Pointer Lock 和鼠标操作 |
| `data/survival/fuels.json` | Fuel Item 与每份燃烧秒数 |
| `data/survival/campfire.json` | 燃料容量与 Heat Source Profile 配置 |
| `data/crafting/recipes.json` | 即时手工石斧配方 |
| `src/interaction/InteractionService.ts` | Inventory Add 与 Pickup Remaining 的纯事务服务 |
| `src/interaction/InteractionRaycastController.ts` | Babylon Ray Picking、E 输入与监听器生命周期 |
| `src/world/pickups/WorldPickupRegistry.ts` | Pickup 剩余数量与消费状态，不持有 Mesh |
| `src/world/pickups/WorldPickupPresentation.ts` | Primitive Mesh、Target ID 映射与 dispose |
| `data/items/items.json` | 9 个稳定 ID 的物品定义 |
| `data/world/first-blizzard-pickups.json` | 6 个 Scenario Pickup Placement |
| `src/weather/WeatherCatalog.ts` | 天气定义验证、重复检查和稳定 ID 查询 |
| `src/weather/WeatherManager.ts` | 当前天气与 Transition Domain 状态 |
| `src/weather/ForecastSystem.ts` | Schedule 查询和跨时间点 Action 消费 |
| `src/weather/gameplay/WeatherGameplayMapper.ts` | 当前/目标天气 Gameplay 参数纯插值 |
| `src/weather/gameplay/WeatherGameplayState.ts` | Thermal 等玩法系统消费的只读天气状态 |
| `src/weather/presentation/WeatherVisualState.ts` | 与 Babylon 解耦的视觉状态契约 |
| `src/weather/presentation/WeatherVisualProfileCatalog.ts` | 视觉配置校验、缺失/重复检查和稳定 ID 查询 |
| `src/weather/presentation/WeatherVisualMapper.ts` | 纯插值、进度 Clamp 和端点映射 |
| `src/weather/presentation/WeatherPresentationController.ts` | 每帧集中写入天空、雾、灯光和雪粒子 |
| `src/weather/presentation/SnowParticleController.ts` | 相机局部单 ParticleSystem 及程序化纹理 |
| `src/weather/presentation/PrecipitationObstacleRegistry.ts` | 固定/动态 AABB 的增量 add/remove/update 与缓存 Snapshot |
| `src/survival/thermal/ThermalConfig.ts` | Thermal JSON Runtime Validation 与配置契约 |
| `src/survival/thermal/EffectiveTemperature.ts` | 环境温度、修正和风寒的纯计算 |
| `src/survival/thermal/ThermalModel.ts` | 确定性 Thermal Reserve 更新 |
| `src/survival/thermal/ThermalState.ts` | Thermal Snapshot、Trend 和 Status ID |
| `src/survival/thermal/createThermalInputs.ts` | Gameplay Weather → Thermal 窄适配点 |
| `src/survival/environment/SurvivalEnvironmentScenario.ts` | Shelter/Heat Source 空间 Placement 配置解析 |
| `src/survival/shelter/ShelterSystem.ts` | Inclusive AABB 庇护检测与效果查询 |
| `src/survival/heat/HeatSourceSystem.ts` | 热源距离衰减、叠加和上限 |
| `src/survival/thermal/ThermalEnvironment.ts` | Weather、Shelter 与 Heat Source 组合 |
| `src/world/createFirstBlizzardCabin.ts` | 固定测试木屋 Primitive 表现与可建造地板支持面 |
| `data/weather/weather.json` | 四种天气的 Data Driven 定义 |
| `data/weather/weather-visuals.json` | 四种天气的独立视觉 Profile |
| `data/weather/first-blizzard-schedule.json` | 17:30 → 18:00 暴雪计划 |
| `data/survival/thermal.json` | Thermal 平衡、风寒、Rate 和 Status 阈值 |
| `data/survival/shelters.json` | Shelter Profile 配置 |
| `data/survival/heat-sources.json` | Heat Source Profile 与全局上限配置 |
| `data/world/first-blizzard-environment.json` | 第一场暴雪固定木屋 Volume；固定 HeatSource 为空 |
| `tests/` | 配置、GameTime、Forecast、Weather、视觉/玩法映射、Thermal、Camera 和垂直运动测试 |
| `docs/COMMAND_RUNBOOK.md` | 安装、启动、检查、构建和故障处理的标准命令 |
| `docs/GPT_PLANNING_BRIEF.md` | 交给 GPT 制定开发路线图的完整项目现状 Brief |

## 新环境接手步骤

```bash
corepack enable
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

如果环境不允许执行 `corepack enable`，请按该环境的标准方式安装 `package.json` 中声明的 pnpm 版本。

## 当前验证状态

2026-08-29 的基础开发过程中，以下 npm 命令曾在切换 pnpm 之前通过：

- `npm run typecheck`
- `npm test`：1 个测试文件、2 个测试通过
- `npm run build`

随后浏览器检查发现 Babylon 模块化导入没有自动注册 Physics Scene Component，导致 `No Physics Engine available.`。已在 `src/world/createWorldScene.ts` 中加入显式物理组件注册，页面可进入启动界面。

之后用户要求所有启动、生产编译、重启和浏览器操作都由用户亲自执行。

2026-08-29 完成 Game Time + Data Driven Weather Core v0.1 后，实际执行并通过：

- `pnpm test`：5 个测试文件、17 个测试通过
- `pnpm exec tsc -b --pretty false`：通过，无输出错误

2026-08-29 修复第一人称控制链后，实际执行并通过：

- `pnpm test`：6 个测试文件、19 个测试通过
- `pnpm exec tsc -b --pretty false`：通过，无输出错误

2026-08-29 继续修复跳跃碰撞体后，实际执行并通过：

- `pnpm test`：7 个测试文件、22 个测试通过
- `pnpm exec tsc -b --pretty false`：通过，无输出错误

2026-08-29 完成 Weather Presentation Layer v0.1 后，实际执行并通过：

- `pnpm test`：8 个测试文件、31 个测试通过
- `pnpm exec tsc -b --pretty false`：通过，无输出错误

2026-08-29 完成 Player Thermal Model v0.1 后，实际执行并通过：

- `pnpm test`：13 个测试文件、55 个测试通过
- `pnpm exec tsc -b --pretty false`：通过，无输出错误

2026-08-29 完成 Shelter + Heat Source v0.1 后，实际执行并通过：

- `pnpm test`：17 个测试文件、68 个测试通过
- `pnpm exec tsc -b --pretty false`：通过，无输出错误

2026-08-29 完成室内降水粒子遮罩修复后，实际执行并通过：

- `pnpm test`：18 个测试文件、70 个测试通过
- `pnpm exec tsc -b --pretty false`：通过，无输出错误

2026-08-29 将错误的 Shelter 二值停发改为障碍碰撞后，实际执行并通过：

- `pnpm test`：18 个测试文件、72 个测试通过
- `pnpm exec tsc -b --pretty false`：通过，无输出错误

2026-08-29 完成 Interaction + Item + Inventory Foundation v0.1 后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：21 个测试文件、105 个测试通过

2026-08-29 将背包快捷键调整为 Tab 后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：21 个测试文件、106 个测试通过
- `git diff --check`：通过

2026-08-29 完成 Crafting Foundation v0.1 后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：23 个测试文件、145 个测试通过

2026-08-29 修复背包与制作栏鼠标交互后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：23 个测试文件、145 个测试通过
- `git diff --check`：通过

2026-08-31 完成 Building Foundation v0.1 后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：29 个测试文件、188 个测试通过
- `git diff --check`：通过

2026-08-31 修复测试木屋开放入口辨识后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：29 个测试文件、188 个测试通过
- `git diff --check`：通过

2026-08-31 修复墙体遮挡与木屋地基对齐后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：29 个测试文件、189 个测试通过
- `git diff --check`：通过

2026-08-31 完成 Campfire Gameplay + Fuel v0.1 后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：32 个测试文件、220 个测试通过
- `git diff --check`：通过

2026-08-31 完成 Game Shell + Unified Menu + Pause v0.1 后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：34 个测试文件、227 个测试通过
- `git diff --check`：通过

2026-08-31 完成 HUD + UX Overhaul v0.1 后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：36 个测试文件、236 个测试通过
- `git diff --check`：通过

2026-08-31 修复快捷栏绑定与清空后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：36 个测试文件、238 个测试通过
- `git diff --check`：通过

2026-08-31 完成独立快捷栏拖拽交互后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：36 个测试文件、240 个测试通过
- `git diff --check`：通过

2026-08-31 完成背包 Slot Grid 与悬停 Tooltip 后，实际执行并通过：

- `pnpm exec tsc -b --pretty false`：通过，无输出错误
- `pnpm test`：36 个测试文件、240 个测试通过
- `git diff --check`：通过
- CSS 大括号检查：314/314

仍未执行：

- 本阶段没有执行 `pnpm dev`、`pnpm build`、`pnpm preview` 或任何浏览器操作。
- Pickup 墙体遮挡、Prompt 距离、E 单次拾取、Partial Add Mesh 保留和现有输入/天气回归均需用户手动验收。
- 统一生存菜单的 Tab/C/B 路由、鼠标切页、实时库存联动、关闭后恢复 Pointer Lock 和 E 屏蔽均需用户手动验收。
- Building Tab 到 BuildPlacement 的 Pointer Lock、Ghost 跟随、木屋边缘 Grid 对齐、Wall Snap、R 旋转、连续建造与失败反馈均需用户手动验收。
- 正式 Foundation/Wall 的实际 Camera Collision、站立/跳跃，以及暴雪粒子被动态建筑 AABB 阻挡均需用户手动验收。
- 固定测试木屋入口新增门框后的辨识度、开放通行和无误碰撞仍需用户手动验收。
- Shelter/Heat HUD、木屋入口与碰撞、室内跳跃，以及暴雪中室外/无火屋内/玩家篝火旁差异仍需用户手动验收。
- 篝火 Ground/Floor Ghost、玩家/墙体/建筑阻挡、E 可见性与墙体遮挡、菜单 Pointer Lock、加柴/点燃/熄灭/耗尽、火焰/点光源和动态热量仍需用户手动验收。
- Thermal HUD、14:00 基本稳定、17:30 渐冷和 18:00 Blizzard 明显流失仍需用户手动验收。
- 天空、雾、灯光、雪粒子、F1–F5 预览和 14:00 → 18:00 实时视觉流程仍需用户手动验收。
- 基础 Scene、WASD、奔跑、跳跃和指针锁定仍需用户完成最终验收记录。
- 标题页期间时间冻结、开始后的 Pointer Lock、统一 Tab 切换、共享库存即时联动、Esc 各层优先级、Pause Input 屏蔽与 Pause/Resume 全链仍需用户浏览器验收。
- Loading Overlay 只在真实异步初始化期间显示，速度较快时可能一闪而过；实际可见性需用户确认。
- 新 HUD 的雪地/深墙/夜间准星对比、Inventory 24 格布局/空槽/悬停 Tooltip/即时详情、Hotbar 数字键/滚轮/Build Shortcut、独立底部布局、Inventory/Building 拖入、槽位交换、点击覆盖与逐格清空、F6 遥测切换、菜单卡片布局和 Campfire 主题一致性需用户浏览器验收。

仓库当前已有真实 `pnpm-lock.yaml`，没有 `package-lock.json`。

不得把以上未验证项目写成已通过。

## 已知事项

- 当前生产构建中的 Babylon 主 Chunk 约 1 MB，Vite 会给出 Chunk Size Warning，但构建能够完成。真实资源接入后再设计按需加载和分包。
- 第一人称控制当前使用 Babylon Camera Collision 加自有垂直速度，不是完整 Havok Character Controller。
- 已修复缺少 Collision Coordinator Side Effect 和 Camera Speed 错误除以 60 的问题，但修复后的实际键鼠操作仍需用户浏览器验收。
- Weather Presentation 已接入天空、Fog、Lighting、局部 Snow Particle 与视觉风向；没有 Audio、Screen Frost、Camera Shake、Snow Accumulation、Footprints、Lightning Damage 或 Tree Destruction。
- 降水碰撞已改为共享 PrecipitationObstacleRegistry：固定场景启动注册，动态建筑激活时增量 add，并提供 remove/update；仍使用保守 AABB 而非精确三角形。
- 第一版使用 AABB 而非精确三角形碰撞；对于旋转或复杂凹形 Mesh 会比视觉轮廓更保守。
- Weather Domain 的温度与风力已与 Shelter/Heat Source 共同驱动 Effective Temperature 和 Thermal Reserve；Wetness、移动、伤害及其他 Gameplay 仍未接入。
- F1–F4 只覆盖 Presentation 输入，F5 恢复 Schedule；它们不修改 Domain、Forecast 或 Transition。
- 固定木屋不是 Building System；原常开测试炉已移除，正常运行时热量只来自点燃的玩家篝火。
- Inventory 当前只在内存中存在，刷新即丢失；面板按真实 Slot 只读展示，物品格可拖到 Hotbar，但不支持背包格内移动/合并/拆分、丢弃、装备、使用、容器或持久化。
- Crafting 当前只有一个即时 `hand` 石斧配方；没有耗时制作、Queue、Workbench、Station Radius、音效或动画。
- 当前输入契约由单一 Game Shell State 管理；Player Menu 内只有一个 active Tab，Campfire 为独立 Interaction Menu。
- Building 当前只有木制地基、墙体和篝火、Ground、2m Foundation Grid 与一级 Foundation Edge Snap；没有 Roof、Door、Window、二楼或 Support Graph。
- 玩家建筑只进入 WorldBuildingRegistry、Camera Collision 和降水障碍，不进入 ShelterSystem；自建房间没有挡风/温度加成。
- WorldBuildingRegistry 只存在内存，刷新页面后玩家建筑消失；没有 Save、Demolish、Repair、Upgrade 或 Building Damage。
- Stone Axe durability 仅是 Definition 最大值；ItemStack 没有实例耐久，石斧不能装备、使用、砍树或挖矿。
- Raycast 先拾取场景最近 Mesh 再解析 Target，墙体可阻挡 Pickup/Campfire；当前没有通用 NPC/门交互或复杂 Interaction Framework。
- Thermal Reserve 是 `0..100` 的游戏化资源，不是摄氏度核心体温，也不是医学模拟。
- Wind Strength 继续使用既有无单位 Gameplay Index（当前 `3..28`），只在 Thermal Config 中归一化，不代表 km/h 或 m/s。
- Thermal 与 Campfire Fuel 目前按 Render Loop 提供的 Clamp 后真实 Delta 更新；Pause 时均为零，未来系统增多时可评估 Fixed Simulation Tick。
- Campfire 当前只有 wood 单一 Fuel、即时点火和基础 Primitive 表现；没有点火物、烹饪、灰烬、烟雾伤害、音效或存档。
- Pause Menu 的保存、设置和返回标题明确 Disabled；没有伪造行为。完整 Session Reset、Save/Load 与 Loading Pipeline 尚未实现。
- Hotbar 初始布局默认放置三个 Build Shortcut；当前会话支持从 Inventory/Building 卡片拖入、槽位交换、点击覆盖及逐格清空，但不支持保存、多套栏位或 Item Use，刷新页面会恢复默认布局。
- F3 保留为降雪视觉预览；为避免输入冲突，Debug Telemetry 使用 F6，而不是 F3。

## 推荐下一步

本 Issue 已达到停止条件。不要在当前任务继续开发。

推荐下一独立 Issue：**Save Foundation v0.1**，为 Inventory、World Building 与 Campfire State 设计版本化 IndexedDB 快照和迁移边界；是否执行必须由用户另行授权。不得顺带进入 Shelter Enclosure、Storage、工具玩法、Wetness 或建筑扩展。

## 变更记录

### 2026-08-31 — 背包 Slot Grid 与悬停 Tooltip

- 将 Inventory 左侧纵向文字卡片列表改为真实 24 Slot 多列方格；每个 Snapshot Slot 都有固定位置，空槽继续显示，物品数量使用角标。
- 物品格在 `pointerenter` 或键盘 `focus` 时立即更新右侧详情并显示 Tooltip，内容包含名称、类别、当前 Stack 数量与单件重量；不再要求点击查看。
- `pointerleave/blur`、切换 Tab、关闭菜单或开始拖拽时隐藏 Tooltip，避免残留覆盖其他界面。
- 物品格继续支持拖到独立底部 Hotbar；选择状态精确到单个 Slot，重复 Item Stack 不会同时高亮。
- `pnpm exec tsc -b --pretty false`、`pnpm test`（36 个测试文件、240 个测试）与 `git diff --check` 已通过；CSS 大括号 314/314；未执行 dev/build/preview 或浏览器操作。

### 2026-08-31 — 独立快捷栏拖拽交互

- 移除 Inventory/Building 详情内部复制的快捷栏编辑区；Player Menu 打开时只保留一套独立于弹窗、固定在屏幕底部的 Hotbar，并为弹窗预留明确间隔。
- Inventory 物品卡片与 Building 建筑卡片支持原生拖拽至任意槽位；受校验的内部 Drag Payload 不接受未知来源或空 ID。
- Hotbar 槽位之间支持交换，拖到空槽等同移动；每格 `×` 和快捷栏右侧清空区提供明确、可控的单格清空。
- 保留选择卡片后点击槽位快速覆盖；所有编辑只在 Player Menu 生效，不触发 BuildPlacement 或 Item Use。
- HotbarModel 新增不可变交换事务，内部 Drag Payload 增加合法/非法数据测试；最终 36 个测试文件、240 个测试通过。
- `pnpm exec tsc -b --pretty false`、`pnpm test` 与 `git diff --check` 已通过；未执行 dev/build/preview 或浏览器操作。

### 2026-08-31 — 快捷栏绑定与清空修复

- 将 HotbarModel 从固定快照扩展为运行时可覆盖、可清空且可订阅的 8 格状态；所有更新仍生成不可变 Slot Snapshot。
- Inventory 与 Building 详情共用 Hotbar Editor：选择物品或建筑后点击 1–8 即可覆盖目标槽，每格 `×` 可独立清空。
- Gameplay Hotbar 与菜单编辑器共享同一 Model；菜单关闭后立即显示新配置，Inventory 事务后同步刷新物品数量。
- 菜单内绑定不激活建造或 Item Use；当前仍不支持拖拽、交换、持久化、多套快捷栏或物品使用。
- 新增运行时绑定、清空、订阅与无效槽位安全测试；最终 36 个测试文件、238 个测试通过。
- `pnpm exec tsc -b --pretty false`、`pnpm test` 与 `git diff --check` 已通过；未执行 dev/build/preview 或浏览器操作。

### 2026-08-31 — HUD + UX Overhaul v0.1

- 将 Gameplay 常驻界面收敛为高对比状态准星、可读 Interaction Prompt、8 格 Hotbar、简化 Player Status 与极简快捷键提示。
- 新增 DOM/Babylon 无关的 HotbarModel：固定 8 格、`empty/item/build` Entry、1–8 选择、滚轮回绕与越界安全处理。
- 默认 1–3 绑定木制地基、木制墙体和篝火；Build Shortcut 复用现有 BuildPlacement，切换空槽或 Esc 可退出，不在菜单或暂停中误触发。
- Player Menu 的 Inventory/Crafting/Building 改为 CSS 几何图标卡片、列表与详情区；三个页面继续读取同一 Inventory，Campfire 保持独立 Interaction Menu。
- 右上角默认只展示时间、天气、庇护、体感和趋势；完整 Debug Telemetry 默认隐藏并由 F6 切换，F1–F5 天气预览保持不变。
- 新增 Hotbar 与共享 Inventory 联动测试；最终 36 个测试文件、236 个测试通过。
- `pnpm exec tsc -b --pretty false`、`pnpm test` 与 `git diff --check` 已通过；未执行 dev/build/preview 或浏览器操作。
- 严格停止；未实现 Save/Load、Equipment、Item Use、Hotbar 拖拽绑定、Settings 或完整 Loading Pipeline。

### 2026-08-31 — Game Shell + Unified Menu + Pause v0.1

- 将旧 Pointer Lock 启动器升级为第一场暴雪标题页；Runtime 初始化完成前显示真实阶段 Loading Overlay，开始前 Simulation 保持暂停。
- 将 GameUiModeController 重构为单一纯状态机：Boot、Main Menu、Gameplay、Player Menu、Interaction Menu、Build Placement、Paused；Player Menu 内部使用 Inventory/Crafting/Building Tab。
- Tab 打开背包或关闭整个 Player Menu，C/B 直接打开或切换对应 Tab；三个 Tab 始终读取同一 Inventory，事务后及 Tab 激活时刷新。
- Campfire 保持独立 Interaction Menu；统一视觉、鼠标与关闭契约，不与 Player Menu 叠加。
- 实现 Esc 优先级和 Pointer Lock 意外释放 Pause；Pause Menu 的保存、设置、返回标题均明确 Disabled。
- Boot/Main/Pause 复用 `GameSimulation.setPaused`，冻结 GameTime、Forecast/Weather、Thermal 和 Campfire Fuel；Camera 在非 Gameplay/BuildPlacement 时 detach。
- 新增纯 Shell State 和 Pause Integration 测试；最终 34 个测试文件、227 个测试通过。
- `pnpm exec tsc -b --pretty false`、`pnpm test` 与 `git diff --check` 已通过；未执行 dev/build/preview 或浏览器操作。
- 严格停止；未实现 IndexedDB、Save/Load/Continue、Settings 或完整 Loading Pipeline。

### 2026-08-31 — Campfire Gameplay + Fuel v0.1

- 新增 Data Driven Fuel/Campfire 配置、Runtime Validation 和纯 Campfire State；wood 每份 180 秒，容量 900 秒。
- Building 增加可落在雪地或木屋地板的 Utility 篝火；玩家身体、固定墙体和现有建筑 AABB 会阻止放置，失败不扣材料。
- 通过 BuildingGameplayBinding 将 World Building、Campfire State、Interaction Target、动态 HeatSource 和 Presentation 纳入同一提交/回滚生命周期。
- 新增原子加柴、点燃、熄灭、重燃和耗尽逻辑；燃料使用 Clamp 后真实 Delta，不受 240 倍游戏时钟影响，暂停不消耗。
- E Interaction 扩展到篝火，最近场景 Mesh 会遮挡墙后目标；新增释放 Pointer Lock 的鼠标篝火菜单。
- 新增低模石圈、交叉木柴、火焰与点光源；移除固定测试炉和固定 HeatSource，Thermal 只消费点燃玩家篝火的动态热量。
- 场景资源调整到足够验收地基/墙体、篝火建造与三份燃料，不引入采集玩法。
- 新增 Fuel、Campfire、Simulation Runtime 与 Thermal 集成覆盖；最终 32 个测试文件、220 个测试通过。
- `pnpm exec tsc -b --pretty false`、`pnpm test` 与 `git diff --check` 已通过。
- 未执行 `pnpm dev`、`pnpm build`、`pnpm preview` 或浏览器操作；完整手动流程见 `docs/COMMAND_RUNBOOK.md`。
- 严格停止；未进入 Shelter Enclosure、Storage、Save、Wetness、Tool Gameplay 或其他建筑扩展。

### 2026-08-31 — 墙体遮挡与木屋地基布局修复

- 移除 World Pickup 的覆盖 Rendering Group，使木材、石头、罐头和水瓶等资源重新参与场景深度测试，实体木墙可正常遮挡墙后资源。
- 将 2m Foundation Grid 原点集中配置为 `(x=0, z=1)`，与固定测试木屋外沿对齐；木屋四周相邻地基可边界贴合，不再因原点错位产生约 1m 间隙或插入墙体后被判占用。
- `snapCoordinateToGrid` 新增可选原点参数并补充场景对齐回归测试；最终为 29 个测试文件、189 个测试。
- `pnpm exec tsc -b --pretty false`、`pnpm test` 与 `git diff --check` 已通过。
- 未执行 `pnpm dev`、`pnpm build`、`pnpm preview` 或浏览器操作；墙体实际遮挡与木屋四周贴边效果等待用户刷新后手动验收。

### 2026-08-31 — 测试木屋开放入口辨识修复

- 根据浏览器截图确认中央白/蓝区域实际是开放入口外的雪地与天空，不是透明材质；原入口因黑色墙面缺乏门框而产生透明墙错觉。
- 为固定测试木屋增加高对比木色左右门框、顶框和低门槛，明确表达开放门洞及墙体厚度。
- 门框仅为不可拾取、无碰撞的静态占位表现，入口仍可通行；没有实现 Door Gameplay、开关、锁具或 Interaction。
- `pnpm exec tsc -b --pretty false`、`pnpm test`（29 个测试文件、188 个测试）与 `git diff --check` 已通过。
- 未执行 `pnpm dev`、`pnpm build`、`pnpm preview` 或浏览器操作；修改后画面等待用户刷新手动验收。

### 2026-08-31 — Building Foundation v0.1

- 新增 Data Driven `foundation_wood` / `wall_wood`、BuildCatalog 和 Item Cost 引用/数值/枚举 Runtime Validation。
- 新增纯 Grid/Rotation/Bounds/Snap 逻辑、Foundation 四边 SnapPoint、5m 距离、Ground/Support 与静态/动态 AABB Placement Validation。
- 新增 BuildService 原子事务：Inventory Draft 消耗、禁用的 Presentation Candidate、Inventory/World Registry Commit、激活失败回滚。
- 新增当前会话 WorldBuildingRegistry；成功后保持同一 Ghost 连续建造，资源耗尽只阻止下一次事务。
- 新增单一 GameUiMode，Tab/C/B 菜单互斥；B 菜单支持鼠标选择，BuildPlacement 支持 Camera Ray、Ghost、左键、R、B/Esc。
- 新增 Babylon 木制 Primitive 正式 Mesh、动态 Camera Collision，并让玩家地基参与跳跃 Ground Probe。
- 将启动时一次性降水 AABB 数组重构为 PrecipitationObstacleRegistry；固定场景初始注册，动态建筑增量 add，API 支持 remove/update。
- 场景木材总量调整为 13，足够手动验收两个地基和一面墙；未增加 Harvesting。
- 新增 6 个测试文件；最终 29 个测试文件、188 个测试通过，TypeScript 严格检查与 `git diff --check` 通过。
- 未执行 `pnpm dev`、`pnpm build`、`pnpm preview` 或浏览器操作；Ghost、Pointer Lock、相机碰撞和动态降雪阻挡等待用户验收。
- 严格停止；未实现 Campfire/Fuel、Shelter Enclosure、Roof/Door/Window、Storage、Demolish/Repair/Upgrade/Damage 或 Save。

### 2026-08-29 — 背包与制作栏鼠标交互修正

- 将 Tab 背包与 C 制作栏改为统一菜单态：打开菜单时释放 Pointer Lock 并显示鼠标，关闭菜单后重新请求第一人称 Pointer Lock。
- 背包和制作栏互斥显示；新增可点击关闭按钮、配方列表和制作按钮，方向键与 Enter 仅作为补充操作。
- 菜单打开时隐藏准星、交互提示和拾取反馈，并继续屏蔽场景 E Interaction，避免菜单点击和游戏控制冲突。
- 在游戏设计与技术设计中记录未来 Building 菜单必须使用同一鼠标交互契约；本次未实现 Building。
- `pnpm exec tsc -b --pretty false`、`pnpm test`（23 个测试文件、145 个测试）和 `git diff --check` 已通过。
- 未执行 `pnpm dev`、`pnpm build`、`pnpm preview` 或浏览器操作；鼠标与 Pointer Lock 切换等待用户手动验收。

### 2026-08-29 — Crafting Foundation v0.1

- 新增 Data Driven RecipeDefinition、RecipeCatalog、稳定 `hand` Station ID 与 Stone Axe 即时配方。
- 新增 Craft Requirement、缺失材料明细、最大可制作数量、CraftingPlan 和稳定 Result Reason。
- Inventory 增加独立 Clone 与完整校验后 Snapshot Commit；所有制作先在草稿模拟，失败不修改真实 Inventory。
- 新增石斧 ItemDefinition（stackSize 1、durability 最大值元数据），但未实现装备、使用或耐久 Runtime。
- 新增 C 键工业遥测风格 Debug Panel、方向键选择、Enter 制作、结果反馈和 E Interaction 屏蔽。
- 新增 Recipe/Crafting 与 Inventory Draft/Commit 测试；最终 23 个测试文件、145 个测试通过，TypeScript 严格检查通过。
- 未执行 `pnpm dev`、`pnpm build`、`pnpm preview` 或浏览器操作；等待用户按 Runbook 手动验收后停止。

### 2026-08-29 — 背包快捷键调整为 Tab

- 将集中配置中的背包按键从 `KeyI` 调整为 `Tab`，保留 Pointer Lock 和 Key Repeat 防护。
- 同步启动界面、HUD 提示、README、验收手册和 AI 交接文档。
- 未启动浏览器，也未执行 `pnpm dev`、`pnpm build` 或 `pnpm preview`；实际检查结果见“当前验证状态”。

### 2026-08-29 — Interaction + Item + Inventory Foundation v0.1

- 新增 8 个 JSON ItemDefinition、ItemCatalog Runtime Validation，以及 6 个场景 Pickup Placement。
- 新增 24 Slot/30kg Inventory，支持 Stack、Move/Merge/Split、Weight 与容量限制下的 Partial Add。
- 新增通用 Interaction Target/Result、2.75m Camera Raycast、E 单次输入和原子 Pickup Transaction。
- 新增 Primitive Pickup Presentation、只读 Inventory Panel（最初为 I 键，现已调整为 Tab）、Prompt 和拾取反馈；完整消费后才删除 Mesh。
- 新增 3 个测试文件；最终 21 个文件、105 个测试全部通过，TypeScript 严格检查通过。
- 未启动浏览器或运行 dev/build/preview；等待用户按 Runbook 手动验收后停止。

### 2026-08-29 — 降水粒子障碍碰撞修正

- 撤销“进入 Shelter 就停止全部降水”的错误方向；天气粒子在室内外继续统一发射。
- 为 CPU ParticleSystem 包装默认更新流程，记录粒子前后位置并进行线段与静态碰撞 AABB 的 Slab 检测。
- 雪花撞到屋顶、墙、地面、炉子或控制标杆后立即回收；未碰到障碍的粒子仍可从开放入口随风进入。
- 碰撞采用运动线段而不是单点检测，避免薄屋顶被单帧高速粒子穿透。
- 新增 4 个纯逻辑碰撞测试；总计 72/72 通过，TypeScript 严格检查通过。
- 未执行浏览器操作，屋顶阻挡与入口飘雪效果仍需用户刷新页面后手动验收。

### 2026-08-29 — 室内降水粒子遮罩修复

> 此实现方向已被后续“降水粒子障碍碰撞修正”取代，不再按 Shelter State 整体停发。

- Weather Presentation 读取现有 `ShelterState.isSheltered`，在庇护所内将局部降雪强度和发射率归零。
- 进入 Shelter 时立即 Reset 已生成的局部粒子，避免存活期内的雪花继续穿过屋顶。
- 遮罩只影响 Presentation，不修改 Weather Domain、Forecast、天气过渡或 Thermal 输入。
- 新增纯逻辑遮罩测试；总计 70/70 通过，TypeScript 严格检查通过。
- 未执行浏览器操作，进入/离开木屋的实际粒子切换仍需用户刷新页面后手动验收。

### 2026-08-29 — 测试木屋地板闪烁修复

- 修复测试木屋地板顶面与雪地顶面同处 `y=0` 引发的 Z-fighting 横纹和闪烁。
- 将木屋地板表面抬高至雪地之上，并同步测试炉 Placement 高度，使占位 Mesh 继续落在地板表面。
- 未执行浏览器操作，实际画面仍需用户刷新开发页面后手动验收。
- 新增 Git 交付约定：后续完成开发或修复后使用中文提交信息，并推送当前跟踪的远端。

### 2026-08-29 — Shelter + Heat Source v0.1

- 新增 Data Driven Shelter 与 Heat Source Profile，以及第一场暴雪空间 Placement 配置。
- 新增与 Babylon 解耦的纯坐标、Inclusive AABB Shelter 查询和通用热源距离贡献。
- 热源使用 smoothstep 距离衰减，支持启用状态、多源相加与全局温度上限。
- 新增 Thermal Environment Builder：庇护先削减有效风力，再叠加庇护温度与外部热源加成。
- `GameSimulation` 接收相机的普通 `{x,y,z}`，输出 Shelter、Heat 与 Thermal Environment Snapshot。
- 新增共用 Scenario 坐标的固定 Primitive 木屋、可通行入口、碰撞地板/墙/屋顶及常开测试炉。
- Debug HUD 新增庇护、挡风、原始→有效风力和热源加成。
- 新增 Shelter、Heat Source、Thermal Environment 与集成测试；总计 68/68 通过，TypeScript 严格检查通过。
- 未执行 `pnpm dev`、`pnpm build`、`pnpm preview` 或浏览器操作；渲染、碰撞与体验等待用户手动验收。
- 严格停止；未实现 Weather Visual 扩展、Indoor Snow Mask、Interaction、Inventory、Building、Campfire Gameplay、Fuel、Wetness、Clothing、Damage 或 Save。

### 2026-08-29 — GitHub 首次交付

- 将现有非空项目目录关联到 `git@github.com:chaoscaros/Stormhaven.git`。
- 保留本地完整项目，以合并提交接入远端仅含 README 的初始化历史。
- `main` 已设置跟踪 `origin/main` 并完成首次推送。

### 2026-08-29 — Player Thermal Model v0.1

- 保留 Weather Definition 现有数值与单位语义，明确 Wind Strength 为无单位 Gameplay Index。
- 新增 Weather Gameplay Mapper，在 Transition 中连续插值温度、风力和其他 Gameplay 参数。
- 新增 Data Driven Thermal Config、阈值/Rate/范围 Runtime Validation。
- 新增 Effective Temperature 与 smoothstep Wind Chill 纯计算。
- 新增确定性 `0..100` Thermal Reserve、Trend、五档稳定 Status ID 和 min/max Clamp。
- `GameSimulation` 使用已 Clamp 的真实 Delta 驱动 Thermal；Weather Transition 继续按游戏时间推进。
- Debug HUD 新增环境温度、体感温度、风力、体热、趋势和热状态。
- 新增 Thermal Unit Test 与 First Blizzard Domain Integration Test；总计 55/55 通过，TypeScript 严格检查通过。
- 未执行 `pnpm dev`、`pnpm build` 或浏览器操作；真实 HUD 与体验等待用户验收。
- 严格停止在 Thermal Domain；未实现 Wetness、Shelter、Campfire、Clothing、Health Damage 或 Indoor Snow Mask。

### 2026-08-29 — 基础工程与 pnpm/中文交接规范

- 创建基础 Babylon/Havok 工程与第一人称控制。
- 建立完整预留目录、文档和基础测试。
- 将项目界面与文档调整为中文主导。
- 将唯一包管理器改为 pnpm 11.24.0，移除 npm 锁文件。
- 新增跨电脑 AI 交接规则和当前验证边界。
- 新增 AI 优先的命令手册，并规定面向用户的命令解答必须使用中文。
- 将 Vite 开发服务默认端口设为 `9999`，并同步命令文档。
- 新增 GPT 开发规划 Brief，汇总产品目标、技术约束、真实实现状态和计划输出要求。

### 2026-08-29 — Game Time + Data Driven Weather Core v0.1

- 新增纯逻辑 GameClock、GameTime Snapshot、Pause、Time Scale 和格式化。
- 新增 WeatherDefinition JSON、WeatherCatalog Runtime Validation 和稳定 ID 查询。
- 新增 WeatherManager、WeatherTransition 和纯数据 Domain Event。
- 新增 ForecastSystem 与独立 First Blizzard Schedule JSON。
- 接入 Day 1 14:00、17:30 开始 Transition、18:00 Blizzard 的确定性流程。
- 新增可配置 `maxDeltaSeconds` Clamp，避免后台 Tab 恢复导致时间异常跳跃。
- 在现有 HUD 中新增时间、天气、预报和 Transition Progress 遥测面板。
- 新增 GameTime、Forecast、Weather 单元测试；`pnpm test` 17/17 通过，TypeScript 检查通过。
- 严格停止在 Weather Domain；没有进入 Weather Visual Effects 或 Thermal Model。

### 2026-08-29 — 第一人称控制修复

- 显式注册 Babylon `DefaultCollisionCoordinator`，避免首次移动/跳跃时 Render Loop 因缺少 Side Effect 中断。
- 将 Player 米/秒配置集中换算为 Babylon TargetCamera Speed，移除错误的 `/ 60` 速度计算。
- Pointer Lock 成功后显式聚焦 Canvas，稳定键盘输入。
- 增加四个无玩法含义的雪地校准标杆，便于观察移动、转向、跳跃和奔跑。
- 新增 Camera Speed 测试；`pnpm test` 19/19 通过，TypeScript 检查通过。
- 未执行 `pnpm dev`、`pnpm build` 或浏览器操作，等待用户手动验收。

### 2026-08-29 — 跳跃碰撞体修复

- 移除重复的负向 `ellipsoidOffset`；Babylon FreeCamera 已经自动将碰撞体中心放在视点下方。
- 将出生高度调整到接近配置眼高，并将地面探测容差从 `0.58m` 收紧至 `0.12m`，避免提前判定落地。
- 将跳跃、重力和落地速度重置抽离为纯 `PlayerVerticalMotion`。
- 新增跳跃、空中重复跳跃和落地停止测试；`pnpm test` 22/22 通过，TypeScript 检查通过。
- 未执行浏览器操作，修复后的 Space 跳跃仍需用户手动验收。

### 2026-08-29 — Weather Presentation Layer v0.1

- 新增 `weather-visuals.json`，独立配置 Clear、Cloudy、Snow、Blizzard 的天空、雾、灯光、雪和视觉风参数。
- 新增 Profile Runtime Validation、纯 `WeatherVisualMapper` 与不可变 `WeatherVisualState`。
- 将基础天空升级为内联 ShaderMaterial，支持地平线/天顶颜色、亮度和阴云度连续变化。
- 集中更新既有 Scene Fog、HemisphericLight 和 DirectionalLight。
- 新增单个容量 2000 的相机局部 Snow ParticleSystem 与程序化 DynamicTexture。
- 新增 F1–F4 视觉预览、F5 恢复计划驱动；Preview 不修改 Weather Domain。
- HUD 新增“视觉”行，明确区分 Domain Weather 和 Presentation Weather。
- 新增 9 个视觉配置/映射测试；总计 31/31 通过，TypeScript 严格检查通过。
- 未执行 `pnpm dev`、`pnpm build` 或浏览器操作；渲染与性能等待用户手动验收。
- 严格停止在 Weather Presentation；未进入 Player Thermal Model 或任何禁止系统。
