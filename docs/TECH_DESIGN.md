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
  └─ ui/setupFoundationUi.ts      仅 DOM 的基础界面适配
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
| `src/inventory` | 未来的物品堆、Inventory 和 Container |
| `src/crafting` | 未来的配方校验和制作状态 |
| `src/building` | 未来的 Ghost、放置校验和 Snap |
| `src/save` | 未来的版本化 IndexedDB 持久化 |
| `data` | 按领域划分的未来 JSON 定义 |
| `public/assets` | 未来的模型、贴图与音频 |
| `tests` | 纯逻辑测试与高价值集成测试 |

其余功能目录在当前阶段只是预留边界。

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

固定测试木屋和测试炉的空间注册位于 `data/world/first-blizzard-environment.json`。`src/world/createFirstBlizzardCabin.ts` 读取相同 Placement 创建 Primitive 表现与碰撞，但 Mesh 不参与 Shelter/Heat 判定，避免渲染与规则双重事实来源。测试炉当前始终启用，没有 Interaction、Fuel、Item 或 Campfire 状态机。

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
- 读取 Simulation Snapshot 的 `ShelterState`；在 Shelter 内对局部降水应用二值遮罩并立即清除已有粒子，不修改天气 Domain。
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

未来的 Item、Recipe、Loot 和 Weather 定义存放在 JSON 中，并使用稳定 ID。核心逻辑不得使用展示名称作为业务键。

未来存档使用 IndexedDB 并携带 Schema Version。规划中的存档外层预留 player、world、time、weather、inventory、buildings 字段，但本阶段不实现这些接口或行为。

## 测试策略

不对 Babylon 渲染做大量低价值单元测试。Inventory、ItemStack、Recipe、Wetness、WeatherTransition 和存档序列化等确定性逻辑，在对应系统获得开发授权时必须建立单元测试。

当前单元测试还覆盖 Weather Gameplay 插值、Thermal Config Validation、Effective Temperature、Wind Chill 端点、温暖恢复、分级流失、FPS 一致性、Delta 校验、min/max Clamp、Status 边界、Shelter 内外/边界、0%/100% 挡风、Heat Source 中心/边缘/禁用/单调衰减/叠加上限、室内降水遮罩，以及暴雪中室外→庇护→炉旁的纯 Domain Integration。类型检查和生产构建仍是质量门禁，浏览器渲染、碰撞和 HUD 需要独立验收。

## Weather Presentation 已知边界

- 当前室内降水遮罩是基于 Shelter State 的整体二值开关，不处理门口飘雪、屋檐局部遮挡或开口方向。
- 已有游戏化体感温度、风寒、Shelter、Heat Source 和 Thermal Reserve；没有湿度、伤害、移动惩罚或其他 Survival Consequence。
- 没有音频、屏幕结霜、镜头抖动、积雪、脚印、闪电伤害或树木破坏。
- 没有 GPU/移动端 Profile；容量和 Emit Rate 是桌面 Vertical Slice 的保守初值，需以用户浏览器实际表现校准。
- Thermal 尚未接入 Wetness、Campfire/Fuel Gameplay、Clothing、Health、Hypothermia Debuff 或存档。

## 跨机器开发约定

- 不在代码或配置中写入开发者本机绝对路径。
- 不提交 `node_modules`、`dist` 或个人 IDE 配置。
- 以 `package.json` 的 `packageManager` 和 `engines` 字段作为环境基线。
- 新环境先运行 `pnpm install`，再运行质量检查。
- 交接前更新 `docs/AI_HANDOFF.md`，记录验证命令和未完成事项。
