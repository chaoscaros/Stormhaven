# Stormhaven 技术设计

## 技术基线

- TypeScript，开启严格模式
- Vite，负责本地开发与生产构建
- Babylon.js，负责渲染和浏览器输入
- Babylon.js Havok，作为物理后端
- HTML 与 CSS，负责界面层
- JSON，承载未来的数据配置
- IndexedDB，承载未来的版本化存档
- Vitest，测试纯逻辑和基础配置
- pnpm，作为唯一包管理器

项目不使用大型 UI 框架。当前目标是现代 Chrome、Edge、Safari 和 Firefox 桌面浏览器。

## 运行时组成

```text
src/main.ts
  ├─ core/Game.ts                 Engine 与 Scene 生命周期
  ├─ core/simulation/             GameTime、Forecast、Weather 的帧协调
  ├─ core/time/                   确定性 GameClock 与格式化
  ├─ world/createWorldScene.ts    Havok、天空、地面、灯光及窄环境引用
  ├─ player/createFirstPersonCamera.ts
  ├─ weather/                     Weather Domain、Gameplay/Visual 并列映射
  ├─ survival/environment/        纯空间坐标与 Scenario 注册
  ├─ survival/shelter/            AABB Shelter 查询
  ├─ survival/heat/               通用 Heat Source 距离贡献
  ├─ survival/thermal/            Environment Composition 与 Thermal Model
  ├─ items/                       ItemDefinition 与 ItemCatalog
  ├─ inventory/                   纯 Slot/Stack/Weight Inventory
  ├─ interaction/                 Target/Result、事务服务与 Raycast Adapter
  ├─ crafting/                    Recipe Catalog、Requirement 与 Atomic Transaction
  ├─ building/                    Definition、Placement、Snap、Atomic Transaction 与 World Registry
  ├─ building/presentation/       单 Ghost、正式 Mesh、Camera Collision 与障碍注册
  ├─ world/pickups/               Pickup Registry、Placement 与 Babylon Presentation
  └─ ui/                           Game Shell State、DOM Menu Renderers 与 Pointer Lock 适配
```

`Game` 是小型编排器，不是业务 God Class。后续模块应该通过窄接口、事件或服务通信。确定性的游戏规则应尽可能独立于 Babylon 和 DOM。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `src/core` | Engine 生命周期、共享契约和配置 |
| `src/core/time` | 确定性游戏时间、Time Scale、暂停和格式化 |
| `src/core/simulation` | 小型 Runtime 协调层与 Scenario 工厂 |
| `src/world` | Scene/World 组成及未来空间分区 |
| `src/player` | 输入、Camera 和未来玩家控制器 |
| `src/ui` | HTML/CSS 展示及浏览器适配 |
| `src/survival/environment` | Babylon 无关的坐标与 Shelter/Heat Source Scenario Placement |
| `src/survival/shelter` | Data Driven Shelter Profile、AABB Volume 与挡风/温度查询 |
| `src/survival/heat` | 通用热源 Profile、平滑距离衰减、多源叠加和全局 Clamp |
| `src/survival/thermal` | Thermal Environment 组合、Effective Temperature、体热储备和输入适配 |
| `src/weather` | Data Driven 天气契约、Catalog、Transition、Forecast、Gameplay/Visual 映射和表现适配 |
| `src/items` | ItemDefinition Runtime Validation 与稳定 ID Catalog |
| `src/inventory` | 纯 ItemStack、固定 Slot、Stack、Weight 和 Partial Add；不含 Container |
| `src/interaction` | 通用 Target/Result、Pickup Transaction 和 Babylon Raycast 窄适配 |
| `src/world/pickups` | World Pickup Domain Registry、Scenario Placement 与 Mesh Presentation |
| `src/crafting` | Recipe Runtime Validation、Catalog、Requirement、Plan 与原子制作事务 |
| `src/building` | BuildDefinition/Catalog、Grid/Wall Snap、Placement Validation、原子事务与 WorldBuildingRegistry |
| `src/building/presentation` | Babylon Ghost、Placement Ray/Input、正式 Mesh、Camera Collision 与降水障碍接线 |
| `src/survival/campfire` | Fuel/Campfire 纯领域状态、事务、燃烧和 Building Gameplay Binding |
| `src/save` | 未来的版本化 IndexedDB 持久化 |
| `data` | 按领域划分的未来 JSON 定义 |
| `public/assets` | 未来的模型、贴图与音频 |
| `tests` | 纯逻辑测试与高价值集成测试 |

`src/save` 等其余功能目录在当前阶段仍只是预留边界。

## Game Shell + Unified Menu + Pause

`GameUiStateMachine` 是 DOM/Babylon 无关的唯一顶层 Shell State，`GameUiModeController` 只负责把它连接到 Pointer Lock：

```text
boot → main_menu → gameplay
                      ├─ player_menu ─┬─ inventory
                      │               ├─ crafting
                      │               └─ building
                      ├─ interaction_menu（campfire）
                      ├─ build_placement
                      └─ paused
```

Player Menu Tab 是 `player_menu` 的子路由，不是三套顶层 Overlay State。Tab 在 Gameplay 打开 Inventory，Player Menu 已打开时关闭整个菜单；C/B 打开或切换到对应 Tab。Interaction Menu 记录 Target Type/ID，与 Player Menu 互斥。所有 UI renderer 读取同一个 Inventory，事务完成或 Tab 激活时轻量刷新，不在 Render Loop 重建 DOM。

Esc 优先级为 BuildPlacement → Interaction Menu → Player Menu → Gameplay Pause → Resume。BuildPlacement 保留自身 Ghost 清理入口，其他 Esc 由 Shell 集中路由。Pointer Lock 主动释放前先切换 Shell Mode，因此 `pointerlockchange` 不会误判；Gameplay 中浏览器意外释放 Pointer Lock 会进入 Pause，并短暂抑制同一次 Esc 的重复处理。

Main Menu 出现前 Runtime 已完成异步 World/Havok 初始化，但 `GameSimulation` 从 Boot 起保持 Pause；点击开始才进入 Gameplay、恢复 Simulation 并请求 Pointer Lock。Paused/Main Menu/Boot 会调用 `GameSimulation.setPaused(true)`；只有 Paused 是运行中暂停。Pause 时 GameClock、Forecast/Weather、Thermal 和所有 Runtime System（包括 Campfire Fuel）均接收零推进量。Camera 在非 Gameplay/BuildPlacement Mode 下 detach，阻止 WASD、Jump 和 Look。

`setupFoundationUi` 暴露 `showLoading(stage) / setLoadingStage(stage) / hideLoading()` 窄契约，仅显示真实初始化阶段文本，不提供虚假百分比或延时。未来 Loading Pipeline v0.1 才负责 Config、Save、GLB、Texture、Audio、Scene、World Restore 的真实进度。

## Building Foundation

Building 与 Crafting 是共享 Inventory 的独立链路：

```text
data/building/buildings.json
  → BuildCatalog
  → PlacementValidator
  → BuildService / Inventory Draft
  → WorldBuildingRegistry
  → BuildingGameplayBinding + BuildingPresentation
```

`BuildDefinition` 使用稳定英文 snake_case ID，包含 category、cost、三轴 size、snapType、rotationStep、collision 和 tags。当前有 `foundation_wood`、`wall_wood` 与 `campfire_basic`（stone ×4 + wood ×2、1.1m × 0.5m × 1.1m）；均不创建可放入 Inventory 的建筑 Item。

`PlacementValidator` 是纯逻辑：Foundation 只接受 Ground，并在 2m Grid 上吸附。Grid 原点集中为 `(x=0, z=1)`，与固定测试木屋外沿对齐。Wall 必须使用 Foundation 注册的四向 `SnapPoint`。Utility 篝火直接保留命中地面的 x/z 与表面高度，可放在雪地或固定木屋地板上，但必须满足 5m 距离，且不得与玩家身体、固定场景或现有 World Building 的 AABB 重叠。Rotation 统一规范到 `0..359`。

`BuildService` 每次确认放置都会重新运行资源与 Placement 校验，不相信菜单缓存。事务为 `Plan → Clone Inventory → Consume Cost on Draft → Prepare Disabled Presentation Candidate → Commit Inventory + Registry → Activate Mesh`。Prepare 或 Activate 失败会释放候选并恢复 Inventory/Registry；失败不吞材料。成功后保持同一 Ghost，允许连续建造，直到资源不足或玩家按 B/Esc 退出。

`WorldBuildingRegistry` 只保存纯 `WorldBuilding`、Bounds 与 SnapPoint，不持有 Mesh。Ghost 不进入 Registry、不参与碰撞、不参与 Picking。正式篝火由 `CampfireBuildingBinding` 创建独立 Gameplay State 和 Interaction Target；其他玩家建筑仍没有 Interaction Target。所有状态仅存在当前运行会话，且不会自动注册为 Shelter。

输入统一由 Game Shell Mode 与 Player Menu Tab 路由；Building Tab 点击结构件后恢复 Pointer Lock 并进入 BuildPlacement。放置中左键确认、R 旋转、B/Esc 退出，世界 E Interaction 被屏蔽。

动态降水依赖保持窄接口：

```text
BuildingPresentation ──add/update/remove──→ PrecipitationObstacleRegistry
                                           ↑
SnowParticleController ───────read─────────┘
```

固定场景在启动时向 Registry 注册一次；玩家建筑激活时增量 add。雪粒子每帧读取已缓存的 Registry Snapshot，不扫描 Scene Mesh。Registry 已提供 remove/update API 供事务回滚和未来移动/拆除使用，但本 Issue 没有 Demolish Gameplay。

自建几何转化为动态 Shelter/房间属于未来 Building Enclosure Issue。当前 Thermal Shelter 仍只有固定测试木屋；Building 不导入 ShelterSystem，Weather 也不导入 BuildingSystem。

## Campfire Gameplay + Fuel

核心数据流保持单向并将规则与表现分开：

```text
Building → CampfireBuildingBinding → CampfireSystem → FuelCatalog
                                            └──────→ HeatSourceSystem → Thermal

Interaction → Campfire Menu → CampfireSystem → Inventory / Campfire State
Campfire State → BuildingPresentation（石圈/木柴/火焰/点光源）
```

`data/survival/fuels.json` 用稳定 Item ID 定义燃烧秒数；当前仅 wood，每份 180 秒。`data/survival/campfire.json` 定义 900 秒容量和 `campfire_basic` Heat Source Profile。`CampfireSystem` 拥有 `unlit / burning / out_of_fuel` 状态，并通过 Inventory Draft 完整规划加柴事务；未知物品、无木材、已满或容量不足以容纳完整一份燃料时不消耗 Inventory。

放置提交后 Binding 才注册 Campfire State 和默认禁用的 HeatSource；点燃仅在燃料大于零时成功，熄灭保留剩余燃料。燃烧到零时精确 Clamp 为零、切换 `out_of_fuel` 并禁用热源。移除或回滚建筑会同步移除 Interaction Target 和 HeatSource，不留下热量。Presentation 只订阅状态并在点燃状态变化时开关火焰和灯光，不执行燃料规则，也不创建每篝火独立 Render Loop。

燃料消耗使用 `GameSimulation` 与 Thermal 共用的暂停感知、最大 0.25 秒真实增量，不乘 `GameClock.timeScale=240`；因此一份木材表示 180 个真实游玩秒。暂停时传入零，30/60/120 FPS 下累计结果一致。

## Interaction、Item 与 Inventory Foundation

运行链固定为：`Camera → Babylon Raycast → Interaction Target ID → InteractionService/Target Provider → Inventory 或 Campfire UI`。Raycast 最大距离集中为 `2.75m`，先拾取场景最近的可拾取 Mesh，再判断它是否属于交互源，因此实体墙体会阻挡其后的资源和篝火。Mesh metadata/lookup 只保存 Target ID，不保存 ItemDefinition、Inventory 或 Service；不得为交互物启用隔墙覆盖渲染。

`data/items/items.json` 定义稳定 `id`、展示字段、`category`、`stackSize`、单件 `weight`、可空 `durability`/`icon` 和 `tags`。`ItemCatalog` 在启动时完成结构、重复 ID 和数值边界校验。`ItemStack` 与 Inventory Snapshot 不可变；Inventory 固定 24 Slot / 30kg，重量每次由 `Σ weight × quantity` 推导，不维护可漂移缓存。

Add 前先同时计算现有 Stack 空位、新 Slot 空位和剩余重量可接受的最大整数数量，然后只写入该数量。允许 Partial Add：Inventory 增加 `acceptedQuantity`，Registry 同步减少 Pickup；只有剩余为 0 时 Presentation 才清除 lookup 并 dispose Mesh。失败结果使用稳定 reason ID，Domain 不操作 DOM 或 Babylon。

## Crafting Foundation

依赖方向为 `RecipeCatalog → CraftingService ← Inventory ← ItemCatalog`。`data/crafting/recipes.json` 与 Item 数据分离，Recipe 只使用稳定 Item ID；启动时校验 Recipe ID、输入/输出、数量、引用、`craftTimeSeconds`、`requiredStation` 和 tags。当前统一使用特殊 Station ID `hand`，没有 Station System。

事务流程为 `Plan → Clone Inventory → Consume Inputs on Draft → Add Outputs on Draft → Validate Final Snapshot → Commit Snapshot`。真实 Inventory 在 Plan 阶段完全不变；材料、Slot、Weight、Station 或耗时语义任一失败都会丢弃草稿。输入消耗释放出的 Slot 和重量自然参与输出容量判断，不使用危险 rollback。

当前配方只有 `stick ×2 + stone ×2 → stone_axe ×1`，且 `craftTimeSeconds=0`。统一生存菜单的 Crafting Tab 读取 `CraftRequirementResult`，不直接查询/修改 Inventory。配方、制作均可点击，方向键/Enter 只作为辅助输入；所有 listener 均在 dispose 时移除。

Crafting 只定义 `Inventory Items → Inventory Items`。Building 已独立定义 `Inventory Materials / BuildDefinition → World Building Entity`，建筑不需要先成为 Inventory Item。石斧 Definition 的 durability 只是最大值元数据，未来 Tool Gameplay 引入 Item Instance State 时需另行设计 Runtime Durability。

Inventory、Crafting 和 Building 共用一个 Player Menu 容器：菜单打开时保留渲染与 HUD，但释放 Pointer Lock；菜单元素显式启用 pointer events；关闭或进入 BuildPlacement 时重新请求 Pointer Lock。Campfire 使用相同视觉/鼠标契约，但属于独立 Interaction Menu。

## Game Time 与 Runtime

`GameClock` 不依赖浏览器真实时间、`Date`、Babylon 或 DOM。它以 `deltaSeconds` 和可配置的 `timeScale` 推进内部 `totalGameMinutes`，并生成包含 `day/hour/minute/totalGameMinutes` 的不可变快照。

Time Scale 的单位是“每个真实秒对应的游戏秒”。Vertical Slice 开发配置为 `240`，因此从 14:00 到 18:00 约需 60 个真实秒。该值集中在 `SIMULATION_CONFIG`，不是 Weather 业务逻辑的一部分。

`GameSimulation` 是小型协调层：

1. 将 Babylon Engine 提供的真实 `deltaSeconds` 限制在 `maxDeltaSeconds` 内。
2. 推进 `GameClock`。
3. 从 `ForecastSystem` 消费跨过的 Schedule 时间点。
4. 以推进的游戏秒更新 `WeatherManager`。
5. 输出不包含 Scene 或 DOM 引用的纯数据 Snapshot 和 Event。

生产配置将单帧真实 Delta 限制为 `0.25s`，避免浏览器后台 Tab 恢复时游戏时间瞬间推进数小时。

## Weather Domain

天气定义位于 `data/weather/weather.json`。稳定 Weather ID 当前限定为：

- `clear`
- `cloudy`
- `snow`
- `blizzard`

每个定义必须包含：

| 字段 | 单位或范围 |
| --- | --- |
| `id` | 稳定英文 ID |
| `displayName` | 展示名称，不作为业务键 |
| `ambientTemperature` | 摄氏度（°C）的天气基础气温 |
| `temperatureModifier` | 摄氏度（°C）的附加 Gameplay 修正 |
| `windStrength` | 无单位、非负的游戏化风力指数；当前 Profile 为 `3..28` |
| `visibility` | 米，非负 |
| `precipitation` | `0..1` |
| `wetnessRate` | 非负速率，占位值 |
| `movementModifier` | `0..1` |
| `solarEfficiency` | `0..1` |

`WeatherCatalog` 负责轻量 Runtime Validation、拒绝重复 ID 和按稳定 ID 查询。它不负责 Fetch、JSON Parsing、DOM 或 Babylon。

`WeatherManager` 只维护 `currentWeather`、可选 `targetWeather` 和 `WeatherTransition`。Transition 时长以游戏秒表示，进度基于 Delta 计算，不依赖浏览器刷新率。Manager 只产生纯数据事件，不修改 Fog、Lighting、Particle、Audio 或 UI。

## Weather Gameplay State 与 Player Thermal Model

Gameplay 与 Visual 是 Weather Domain 的并列消费者，禁止从 Fog、粒子或其他视觉参数反推 Gameplay：

```text
Weather Domain
  ├─ WeatherGameplayMapper ─┐
  ├─ ShelterSystem ─────────┼→ ThermalEnvironmentBuilder → Thermal Input Adapter → ThermalModel
  └─ HeatSourceSystem ──────┘
  └─ WeatherVisualMapper   → WeatherPresentationController → Babylon
```

`WeatherGameplayMapper` 接受当前 Weather Definition、可选 Target Definition 和 Transition Progress，Clamp 进度并插值温度、风力、可见度、降水、Wetness Rate、移动修正和太阳能效率。`ThermalEnvironmentBuilder` 再组合天气、Shelter 与 Heat Source：挡风先将原始风力变为 `rawWind * (1 - windProtection)`，庇护温度和外部热源加成再进入 Effective Temperature。Wetness 等字段仍未接入 Thermal 计算。

`ShelterSystem` 使用 Inclusive AABB Volume 查询普通 `{x,y,z}` 坐标，Profile 提供 `0..1` 挡风比例和非负温度加成。`HeatSourceSystem` 使用球形半径和 smoothstep 距离衰减；启用热源贡献可相加，但由配置的全局温度上限 Clamp。热源不要求位于 Shelter 内，因此领域语义可支持室外热源。相机每帧只把普通坐标传入 `GameSimulation`，上述领域层不导入 Babylon。

固定测试木屋的空间注册位于 `data/world/first-blizzard-environment.json`。`src/world/createFirstBlizzardCabin.ts` 读取相同 Placement 创建 Primitive 表现与碰撞，但 Mesh 不参与 Shelter 判定。原常开测试炉和固定 HeatSource 已移除，正常运行时只有点燃的玩家篝火能动态提供热量。

`data/survival/thermal.json` 集中保存以下占位平衡参数：

- neutral/cold/freezing/severe 四个 Effective Temperature 阈值。
- 达到最大风寒惩罚的 Gameplay Wind Strength 与最大风寒摄氏度惩罚。
- mild/cold/severe 每真实秒 Thermal Loss Rate 和 Recovery Rate。
- `0..100` Thermal Reserve 的 min/max/initial，以及五档 Status 阈值。

Runtime Validation 检查 min/max、温度与 Status 阈值顺序、初始值范围、风力归一化分母、非负 Rate 和 Loss Rate 递增关系。

Effective Temperature 使用游戏化公式：

```text
normalizedWind = clamp(windStrength / windStrengthAtMaxPenalty, 0, 1)
windCurve = normalizedWind² × (3 - 2 × normalizedWind)
windChillPenalty = maxWindChillPenalty × windCurve
effectiveTemperature = ambientTemperature + temperatureModifier - windChillPenalty
```

这不是现实人体医学或气象公式。`windStrength` 继续沿用既有无单位指数，不引入 km/h 或 m/s。

`ThermalModel` 维护游戏化 Thermal Reserve，而不是 Core Body Temperature。它根据 Effective Temperature 在配置的温度节点之间连续插值 Loss Rate；温暖环境恢复，严寒环境更快流失，并 Clamp 到配置 min/max。Snapshot 输出 `currentValue`、Effective Temperature、Wind Chill、标准化风力、每秒变化率、`warming/stable/cooling` Trend 和五档稳定 Status ID。Critical 只是一种状态，不产生 Health Damage。

Thermal 使用 `GameSimulation` 已 Clamp 的真实 `deltaSeconds`，不会乘以 GameClock 的 `timeScale=240`；Pause 时不改变储备。Weather Transition 仍按游戏时间推进，因此视觉、Gameplay Weather 与 Thermal 输入保持同一 Transition Progress。当前每 Render Frame 更新一次；未来 NPC、Automation 和更多 Survival 系统增多时，可独立评估 Fixed Simulation Tick，不在本 Issue 重写主循环。

## Weather Presentation Layer

天气表现严格遵循单向依赖：

```text
ForecastSystem
  → WeatherManager
  → WeatherTransition
  → GameSimulationSnapshot
  → WeatherVisualMapper
  → WeatherPresentationController
  → Babylon Scene
```

`data/weather/weather-visuals.json` 为 `clear/cloudy/snow/blizzard` 提供稳定 ID 对应的视觉参数。`WeatherVisualProfileCatalog` 在启动时检查缺失/重复 ID、有限数值、颜色和 `0..1` 范围。Visual Profile 与 Domain Weather Definition 分开维护，视觉调色不会改变天气玩法数据。

`WeatherVisualMapper` 不导入 Babylon 或 DOM。它只接受当前 Weather ID、可选 Target ID 和 Transition Progress，先将进度 Clamp 到 `0..1`，再线性插值输出不可变 `WeatherVisualState`。端点进度直接返回准确端点值。

`WeatherPresentationController` 是唯一集中写入天气 Babylon 状态的协调器。`Game` 每帧在 Simulation 更新后调用一次 Controller，再渲染 Scene。Controller 负责：

- 更新程序化天空 Shader 的地平线色、天顶色、亮度和阴云度。
- 更新 Scene 的 EXP2 Fog Color/Density。
- 更新既有 HemisphericLight 和 DirectionalLight Intensity。
- 更新一个容量 2000、围绕相机移动的 ParticleSystem；雪花纹理由 32×32 DynamicTexture 程序化生成。
  - 从共享 `PrecipitationObstacleRegistry` 读取固定场景与动态建筑 AABB；CPU 粒子每帧更新后用前后位置线段进行 Slab 相交检测，撞到屋顶、墙体、地面或玩家建筑即回收。
- 处理 F1–F4 视觉预览和 F5 恢复 Schedule。Preview 只覆盖 Mapper 输入，不写入 ForecastSystem、WeatherManager 或 WeatherTransition。
- 在 `dispose()` 中移除键盘监听并释放粒子与纹理资源。

暴雪配置比普通降雪拥有更高 Emit Rate、Particle Speed、Fog Density、横向 Wind Visual Strength 和更低的天空/灯光亮度。表现层有意保留可辨识地平线，不实现完全白屏。

## Forecast 与 First Blizzard Schedule

`data/weather/first-blizzard-schedule.json` 与 Weather Definition 分离，包含：

- Scenario ID
- 初始 Weather ID
- 稳定 Entry ID
- Target Weather ID
- Transition Start Time
- Effective Start Time
- Transition Duration（游戏分钟）

当前确定性 Schedule：

```text
Day 1 14:00  初始 Clear，可查询 18:00 Blizzard 预报
Day 1 17:30  开始 Clear → Blizzard Transition
Day 1 18:00  Blizzard 成为 currentWeather
```

`ForecastSystem` 会记录已消费 Action，并以 `(previousTime, currentTime)` 范围查询到期事件。即使单次 Update 从 17:59 跨到 18:01，也不会遗漏 Blizzard。

## Debug HUD 边界

右上角 Debug HUD 展示 Simulation Snapshot（时间、天气、预报、Transition、环境/体感温度、原始→有效风力、庇护、挡风、热源加成、体热、趋势和热状态）以及 Presentation Snapshot（当前视觉天气与 Preview 标识）。DOM 更新保留在 `src/ui/setupFoundationUi.ts` 中，并跳过未变化文本，避免每帧无意义写入。

F1–F4 只用于快速视觉验收，F5 恢复正常 Schedule 驱动。HUD 的 Domain Weather 与 Visual Weather 分行展示，可直接确认预览没有污染 Domain。

## 渲染和物理基础

Scene 使用程序化内向天空球、500m 方形雪地、指数距离雾、半球环境光和方向光。验证启动不依赖外部美术资源。

天空使用内联 ShaderMaterial，不依赖外部贴图或 Babylon Materials 扩展包。`createWorldScene` 返回 `WorldSceneRuntime`，其中只暴露表现层所需的 Sky Material 和两个 Light 引用，避免 Controller 通过名称查找场景节点。

Havok 从 WebAssembly 包异步加载，并在返回 Scene 前注册为 Babylon 物理插件。地面包含静态 PhysicsAggregate。当前第一人称控制器使用 Babylon Camera Collision 加自有垂直速度；`createFirstPersonCamera.ts` 必须显式导入 `@babylonjs/core/Collisions/collisionCoordinator`，该导入负责注册运行时碰撞 Side Effect，不得作为“未使用代码”删除。

玩家配置以米/秒描述行走和奔跑速度，`player/cameraSpeed.ts` 集中转换为 Babylon TargetCamera Speed。Pointer Lock 成功后 UI 会显式聚焦 Canvas，确保键盘输入目标稳定。雪地中的四个校准标杆没有玩法含义，只用于手动确认移动、视角、跳跃和奔跑。

`PlayerVerticalMotion` 独立计算跳跃速度和重力位移。FreeCamera 内部已经会把碰撞椭球中心下移 `ellipsoid.y`，因此 `ellipsoidOffset` 必须保持为零；再次设置负向 Offset 会让碰撞体嵌入地面并阻止跳跃。地面探测只保留小幅容差，不承担完整 Character Controller 功能。

以后可以使用专用 Havok Character Controller 替换当前 Camera Controller，而不影响 World 或 UI 模块。

## 性能约束

- 避免为大量对象分别执行每帧更新。
- 森林重复模型优先使用 Thin Instances。
- 频繁创建销毁的对象使用 Object Pool。
- 完整 Chunk Streaming 实现前先保持清晰的空间所有权边界。
- 实际资源接入后再增加 LOD 和压缩管线。
- 游戏模拟逻辑不要直接堆进 Render Loop。
- 天气粒子固定使用一个局部 ParticleSystem，不为雪花创建独立 Mesh。
- 视觉过渡只更新既有 Uniform、Fog、Light 和 Particle 参数，不在每帧创建资源。
- 优化必须基于实际 Profile 结果。

## 数据和存档方向

Item、Recipe 与 Weather 定义已使用 JSON 和稳定 ID；Loot 仍是未来方向。核心逻辑不得使用展示名称作为业务键。

未来存档使用 IndexedDB 并携带 Schema Version。规划中的存档外层预留 player、world、time、weather、inventory、buildings 字段，但本阶段不实现这些接口或行为。

## 测试策略

不对 Babylon 渲染做大量低价值单元测试。Item、Inventory、Pickup、Recipe Validation、Requirement、Craft Plan 与 Atomic Transaction 已由纯测试覆盖；Wetness 和存档仅在未来获得授权时测试。

当前共 34 个测试文件、227 个测试。Game Shell 新增覆盖 Boot/Main/Gameplay、Player Menu Tabs、Interaction/Pause 互斥、Esc 优先级、BuildPlacement Esc，以及 Pause 同时冻结/恢复 GameTime、Thermal 和 Campfire Fuel。类型检查、单元测试、生产构建和浏览器验收必须分别记录；本阶段只由 AI 执行前两项，生产构建和浏览器验收由用户执行。

## Weather Presentation 已知边界

- 降水阻挡已支持固定场景与动态建筑的增量 AABB 注册；复杂旋转/凹形 Mesh 仍不是精确三角形碰撞。
- Building 只有 Foundation/Wall/Campfire、Ground 与一级 Foundation Edge Snap；没有二楼、斜坡、Support Graph、Roof、Door、Window、拆除、维修、升级、伤害或存档。
- 已有游戏化体感温度、风寒、Shelter、Heat Source 和 Thermal Reserve；没有湿度、伤害、移动惩罚或其他 Survival Consequence。
- 没有音频、屏幕结霜、镜头抖动、积雪、脚印、闪电伤害或树木破坏。
- 没有 GPU/移动端 Profile；容量和 Emit Rate 是桌面 Vertical Slice 的保守初值，需以用户浏览器实际表现校准。
- Thermal 已接入 Campfire/Fuel 动态热源，但尚未接入 Wetness、Clothing、Health、Hypothermia Debuff 或存档。

## 跨机器开发约定

- 不在代码或配置中写入开发者本机绝对路径。
- 不提交 `node_modules`、`dist` 或个人 IDE 配置。
- 以 `package.json` 的 `packageManager` 和 `engines` 字段作为环境基线。
- 新环境先运行 `pnpm install`，再运行质量检查。
- 交接前更新 `docs/AI_HANDOFF.md`，记录验证命令和未完成事项。
