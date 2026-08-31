# Stormhaven 项目现状与开发规划 Brief

> 使用方式：可以将本文档完整提供给 GPT，让它基于当前真实状态制定后续开发计划。当前需求是**规划，不是直接生成或修改代码**。

## 1. 项目概述

项目名称：**Stormhaven**

项目类型：第一人称 3D 单机 PvE 生存建造游戏

目标平台：现代桌面浏览器

目标浏览器：

- Chrome
- Edge
- Safari
- Firefox

最终目标是通过普通网站地址直接进入游戏，不制作 Electron 或原生客户端。

Stormhaven 最重要的体验不是战斗，而是：

> 外面的世界恶劣、寒冷、危险，而玩家亲手建设的基地越来越安全、温暖、先进。

核心体验参考方向包括恶劣天气下的孤独与求生、基地逐步升级带来的安全感，以及干净、可读的 3D 视觉语言。只能参考体验方向，不得复制任何现有游戏的代码、美术、名称、地图或受版权保护内容。

## 2. 核心循环

```text
查看天气预报
  ↓
发现恶劣天气即将到来
  ↓
规划物资与外出路线
  ↓
离开基地探索
  ↓
收集木材、食物、燃料、金属等资源
  ↓
打猎、钓鱼或搜刮
  ↓
天气逐渐恶化
  ↓
返回基地
  ↓
生火、取暖、整理物资
  ↓
制作设备并扩建庇护所
  ↓
升级能源、水和食物系统
  ↓
逐步实现自动化
```

## 3. 技术栈与硬性约束

必须使用：

- TypeScript，开启严格模式
- Vite
- Babylon.js
- Babylon.js Havok Physics
- HTML、CSS、TypeScript 构建 UI
- IndexedDB 作为第一阶段存档方案
- JSON Data Driven 配置
- pnpm
- Git

资源格式优先级：

- 3D 模型：glTF / GLB
- 图片：WebP / AVIF
- 后续考虑：KTX2、Draco、LOD

不要为了简单 UI 引入 React、Vue 或其他大型前端框架。

当前环境基线：

- Node.js `>=22.12.0`
- pnpm `>=11.24.0`
- Vite 开发服务默认端口：`9999`

## 4. 架构原则

- SOLID
- Composition over inheritance
- Data Driven
- Loose Coupling
- Single Responsibility
- 当前阶段优先可运行、可测试、可扩展、容易理解
- 不创建巨大 `GameManager` 或几千行 God Class
- 核心游戏逻辑尽量独立于 Babylon 和 DOM
- DOM 访问集中在 `src/ui` 或窄范围浏览器适配层
- 模块优先通过 Interface、Event 和 Service 通信
- 业务逻辑不得依赖物品或天气的展示名称字符串，应使用稳定 ID
- 重要系统需要简短 JSDoc 或设计说明
- 函数、变量、类型使用英文；用户界面和面向用户的解答使用中文

## 5. 浏览器性能原则

从项目早期就要保持以下边界：

- 不允许每棵树或大量世界物体分别运行独立的每帧更新
- 重复森林模型优先考虑 Thin Instances
- 频繁创建和销毁的对象使用 Object Pool
- 世界结构需要允许未来加入 Chunk Streaming
- 远距离模型使用 LOD
- 不把全部系统逻辑塞进 Babylon Render Loop
- 优化应基于实际 Profile，不提前实现完整 Chunk Streaming

## 6. Vertical Slice v0.1：「第一场暴雪」

第一阶段最终目标是一张约 500m × 500m 的地图，包括：

- 雪地
- 森林
- 一个湖
- 一条公路
- 一个废弃加油站
- 一个简单木屋
- 少量可搜刮地点

允许使用 Cube、Cylinder 和其他 Primitive 作为占位资源，先验证玩法，不追求最终美术。

完整可玩流程：

1. 玩家于 14:00 出生，天气晴朗或多云。
2. 收到提示：18:00 将出现暴雪。
3. 玩家收集木材、食物和水，制作简单工具。
4. 玩家修建或扩建庇护所并准备火源。
5. 18:00 后风力、降雪增加，能见度和温度下降。
6. 户外玩家快速失温。
7. 玩家进入庇护所并点燃 Campfire。
8. 风寒影响大幅下降，体温逐渐恢复，画面和声音产生明显安全感。
9. 成功熬过暴雪后显示 `DAY 1 SURVIVED`。

## 7. 功能优先级

后续开发必须严格按照以下产品优先级推进：

1. 恶劣天气
2. 基地建设与升级
3. 自动化
4. 车辆
5. 打猎和钓鱼
6. NPC 招募和工作系统
7. PvE 入侵防守

不得因为想开发 NPC、车辆、动物或敌人而延误天气和基地核心体验。

游戏始终以 PvE、单人为核心，不设计 PvP。

## 8. 规划中的主要系统

### 8.1 玩家系统

- 第一人称移动
- WASD
- 鼠标视角
- 跳跃
- 奔跑
- 以后可增加蹲下
- Interaction Raycast
- 拾取物品

玩家状态：

- Health
- Hunger
- Thirst
- Temperature
- Fatigue
- Wetness

v0.1 最重要的是 Temperature 和 Wetness。

### 8.2 天气系统

第一版天气：

- Clear
- Cloudy
- Snow
- Blizzard

`WeatherPreset` 至少包含：

- `id`
- `displayName`
- `ambientTemperature`
- `temperatureModifier`
- `windStrength`
- `visibility`
- `precipitation`
- `wetnessRate`
- `movementModifier`
- `solarEfficiency`

需要规划：

- `WeatherManager`
- `WeatherPreset`
- `WeatherTransition`
- `ForecastSystem`

天气必须是 Data Driven，不能把各种天气参数硬编码到 Manager 中。天气必须影响环境和玩家，不得只作为视觉特效。

### 8.3 体温系统

玩家热量变化需要综合：

```text
Ambient Temperature
+ Weather
+ Wind Chill
+ Wetness
+ Clothing Insulation
+ Shelter Bonus
+ Heat Source Bonus
```

室外暴雪与室内生火必须产生明显的安全感差异。

### 8.4 建筑系统

v0.1 组件：

- Foundation
- Wall
- Door
- Window
- Roof
- Campfire
- Storage Box

基础流程：按 `B` 打开建筑模式，选择组件，显示半透明 Ghost，展示位置是否合法，点击确认并消耗材料。

需要基础 Snap System，但不要制作复杂建筑编辑器。

### 8.5 物品与 Inventory

`ItemDefinition` 至少包含：

- `id`
- `displayName`
- `description`
- `category`
- `stackSize`
- `weight`
- `durability`
- `icon`
- `tags`

初始物品：

- Wood
- Stone
- Stick
- Cloth
- ScrapMetal
- WaterBottle
- CannedFood
- RawMeat

Inventory 需要规划：

- `ItemStack`
- `Inventory`
- `Container`
- AddItem
- RemoveItem
- MoveItem
- Stack Merge
- Stack Split
- Weight Calculation
- Capacity
- Storage Container

Inventory 核心逻辑不得直接依赖 UI。

### 8.6 Crafting

Recipe 必须 Data Driven，至少包含：

- `id`
- `inputs`
- `outputs`
- `craftTime`
- `requiredStation`

初始配方：

- Campfire
- StorageBox
- StoneAxe
- BasicWall
- Foundation

### 8.7 存档

第一阶段使用 IndexedDB。

未来 `SaveGame` 至少预留：

- `version`
- `player`
- `world`
- `time`
- `weather`
- `inventory`
- `buildings`

必须考虑 `SaveVersion` 和未来 Schema Migration。

### 8.8 后期系统

现在只规划边界，不应优先实现：

- Automation
- Vehicle
- Hunting
- Fishing
- NPC
- Raid

## 9. 当前仓库真实状态

基础工程至 HUD + UX Overhaul v0.1 已经建立，目前包含：

- Vite + TypeScript 严格模式
- Babylon.js 9 与 Havok Physics 依赖
- 500m × 500m 雪地基础 Scene
- 程序化天空、雾、雪地、半球光和方向光
- 静态地面 PhysicsAggregate
- 第一人称鼠标视角
- WASD 移动
- Shift 奔跑
- Space 跳跃
- 显式 Babylon Collision Coordinator 注册
- 米/秒 Camera Speed 换算、Pointer Lock 后 Canvas 聚焦
- 四个无玩法含义的雪地控制校准标杆
- 正式标题界面、真实初始化 Loading Overlay Contract 与开始前 Simulation Pause
- 基础 HUD、天气 Debug HUD 和错误提示
- 纯 GameClock、Pause、Time Scale 和后台 Delta Clamp
- Data Driven WeatherDefinition、WeatherCatalog 和 Runtime Validation
- WeatherManager、WeatherTransition 与纯数据事件
- ForecastSystem 和独立 First Blizzard Schedule JSON
- Day 1 14:00 → 17:30 Transition → 18:00 Blizzard 确定性流程
- 独立 Weather Visual Profile JSON、Runtime Validation 和纯插值 Mapper
- 程序化 Sky Shader、Fog、Lighting 与相机局部 Snow ParticleSystem
- F1–F4 视觉预览、F5 恢复计划驱动和 Visual Weather HUD
- Weather Gameplay State 与 Transition 参数连续插值
- Data Driven Thermal Config、Effective Temperature、Wind Chill 和 0..100 Thermal Reserve
- Thermal Trend、五档 Status 与 Debug Thermal HUD
- Data Driven Shelter Profile、Inclusive AABB 检测、挡风与小幅温度加成
- 通用 Heat Source Profile、smoothstep 距离衰减、多源叠加与全局上限
- Weather + Shelter + Heat Source → Thermal Environment 的纯领域组合
- 固定测试木屋、入口和碰撞；原常开测试炉已移除
- 庇护、挡风、原始→有效风力和热源加成 Debug HUD
- 局部降水粒子与静态碰撞 Mesh AABB 的线段碰撞及回收
- 9 个 JSON ItemDefinition 与 Runtime Validation/Catalog
- 6 个 JSON Scenario World Pickup、Primitive Mesh 与 Registry
- 2.75m Camera Forward Interaction Raycast、Target/Result 和 E 单次拾取
- 24 Slot/30kg 纯 Inventory、Stack、Weight 和 Partial Add Transaction
- 单一 Game Shell State：Boot/Main/Gameplay/Player/Interaction/BuildPlacement/Paused
- Tab/C/B 统一 Player Survival Menu，通过 Inventory/Crafting/Building Tab 共享实时库存
- E Campfire 独立 Interaction Menu、Esc 层级、Pause Menu 与 Pointer Lock 同步
- Pause 冻结 GameTime/Weather/Thermal/Campfire Fuel，并卸载玩家移动输入
- 高对比状态 Crosshair、可读 Interaction Prompt 与 BuildPlacement 合法/非法状态色
- 8 格独立底部 Hotbar；1–8/滚轮选择，初始前三格直接进入木地基、木墙与篝火放置；Player Menu 内物品/建筑卡片可拖入槽位，槽位可交换、点击覆盖并逐格清空
- 简化 Player Status HUD；完整 Debug Telemetry 默认隐藏并由 F6 切换
- Inventory 真实 24 Slot 多列方格、数量角标、Hover/Focus Tooltip 与即时详情；Crafting/Building 图标卡片、详情区与统一寒地工业主题
- RecipeDefinition/Catalog、Stone Axe 配方与 `hand` Station 契约
- Requirement/Missing Inputs/Max Count、草稿 Inventory 与原子 Craft Commit
- 统一生存菜单的 Crafting Tab，可点击配方/制作；方向键/Enter 为辅助输入
- BuildDefinition/Catalog、木制地基/墙体/篝火 JSON 与 Runtime Validation
- 生存菜单 Building Tab、Gameplay/PlayerMenu/BuildPlacement 单一输入状态
- Camera Forward Ground Ray、单一 Ghost、2m Grid、Foundation Edge Wall Snap、R 旋转与 5m 距离限制
- AABB 静态/动态重叠校验、Inventory Draft 原子资源消费与 Presentation 失败回滚
- 当前会话 WorldBuildingRegistry、动态 Babylon Camera Collision 和动态降水障碍 add/remove/update
- FuelCatalog、wood 180 秒/件、Campfire 900 秒容量与稳定状态机
- 篝火原子建造/加柴、点燃/熄灭/耗尽、E 鼠标菜单和动态 HeatSource → Thermal 链路
- 真实秒且暂停感知的燃料消耗、基础石圈/木柴/火焰/点光源表现
- 36 个测试文件、240 个单元/集成测试
- README、技术设计、游戏设计、命令手册和 AI 交接文档
- 后续系统的目录占位

明确尚未实现：

- Weather Audio 和进一步 Weather Visual Effects；当前降水/建筑碰撞使用 AABB 而非精确复杂 Mesh
- Wetness、Clothing、Health Damage，以及更复杂的 Campfire 燃料/点火/烹饪玩法
- Item Use/Consumption、Equipment、Durability Gameplay、Drop
- Container/Storage UI、Loot Table、Harvesting
- Timed Crafting、Craft Queue、Workbench/Station System
- Tool Gameplay、Stone Axe Equip/Use、Durability Runtime
- Building 扩展：Roof、Door、Window、二楼/Support Graph、Upgrade、Damage、Repair、Demolish
- 自建建筑 Shelter Enclosure/Room Detection
- IndexedDB Save
- Hotbar 多套快捷栏、快捷栏持久化与 Item Use；当前会话已支持拖入、交换、点击覆盖与逐格清空
- Load/Continue、Save Slot、Autosave、Settings 与完整 Loading Pipeline
- 完整地图内容
- 音效和最终美术

功能目录中的 `.gitkeep` 只是占位，不代表系统已开发。

## 10. 当前代码入口

```text
src/main.ts
  ├─ src/core/Game.ts
  ├─ src/core/config.ts
  ├─ src/core/time/
  ├─ src/core/simulation/GameSimulation.ts
  ├─ src/weather/
  ├─ data/weather/
  ├─ src/survival/environment/
  ├─ src/survival/shelter/
  ├─ src/survival/heat/
  ├─ src/survival/thermal/
  ├─ src/items/
  ├─ src/inventory/
  ├─ src/interaction/
  ├─ src/crafting/
  ├─ src/world/pickups/
  ├─ data/items/
  ├─ data/crafting/
  ├─ data/survival/
  ├─ data/world/
  ├─ src/world/createWorldScene.ts
  ├─ src/player/createFirstPersonCamera.ts
  └─ src/ui/setupFoundationUi.ts
```

关键文档：

- `README.md`
- `AGENTS.md`
- `docs/AI_HANDOFF.md`
- `docs/COMMAND_RUNBOOK.md`
- `docs/GAME_DESIGN.md`
- `docs/TECH_DESIGN.md`

## 11. 当前验证边界

在项目切换到 pnpm 之前，以下 npm 命令曾通过：

- TypeScript 检查
- 1 个测试文件、2 个测试
- Production Build

浏览器检查曾发现 Babylon Physics Scene Component 未注册，之后已经增加显式运行时导入。

2026-08-29 完成 Player Thermal Model v0.1 后实际执行并通过：

- `pnpm test`：13 个测试文件、55 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。

2026-08-29 完成 Shelter + Heat Source v0.1 后实际执行并通过：

- `pnpm test`：17 个测试文件、68 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。

2026-08-29 完成室内降水粒子遮罩修复后实际执行并通过：

- `pnpm test`：18 个测试文件、70 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。

2026-08-29 将 Shelter 整体停发修正为障碍碰撞后实际执行并通过：

- `pnpm test`：18 个测试文件、72 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。

2026-08-29 完成 Interaction + Item + Inventory Foundation v0.1 后实际执行并通过：

- `pnpm test`：21 个测试文件、105 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。

2026-08-29 将背包快捷键调整为 Tab 后实际执行并通过：

- `pnpm test`：21 个测试文件、106 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。

2026-08-29 完成 Crafting Foundation v0.1 后实际执行并通过：

- `pnpm test`：23 个测试文件、145 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。

2026-08-31 完成 Building Foundation v0.1 后实际执行并通过：

- `pnpm test`：29 个测试文件、188 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。
- `git diff --check`：通过。

2026-08-31 完成 Campfire Gameplay + Fuel v0.1 后实际执行并通过：

- `pnpm test`：32 个测试文件、220 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。
- `git diff --check`：通过。

2026-08-31 完成 Game Shell + Unified Menu + Pause v0.1 后实际执行并通过：

- `pnpm test`：34 个测试文件、227 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。
- `git diff --check`：通过。

2026-08-31 完成 HUD + UX Overhaul v0.1 后实际执行并通过：

- `pnpm test`：36 个测试文件、236 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。
- `git diff --check`：通过。

2026-08-31 修复快捷栏绑定与清空后实际执行并通过：

- `pnpm test`：36 个测试文件、238 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。
- `git diff --check`：通过。

2026-08-31 完成独立快捷栏拖拽交互后实际执行并通过：

- `pnpm test`：36 个测试文件、240 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。
- `git diff --check`：通过。

2026-08-31 完成背包 Slot Grid 与悬停 Tooltip 后实际执行并通过：

- `pnpm test`：36 个测试文件、240 个测试通过。
- `pnpm exec tsc -b --pretty false`：通过。
- `git diff --check`：通过。
- CSS 大括号检查：314/314。

由于项目所有者要求启动、生产编译、重启和浏览器操作由用户亲自执行，因此：

- 本阶段未执行 `pnpm dev`、`pnpm build`、`pnpm preview` 或浏览器验收。
- 标题页冻结、开始游戏、Pointer Lock、统一 Tab/实时库存、Esc 层级、Pause 全链，以及 Inventory 24 格布局/悬停 Tooltip/即时详情、独立 Hotbar 的拖入/交换/覆盖/清空、F6 遥测和原有 Weather/Shelter/Building/Campfire 流程仍需要浏览器手动验收。
- 已修复 Collision Coordinator 缺失和 Camera Speed 错误换算；第一人称移动、奔跑和跳跃仍需要最终手动验收。

仓库已有真实 `pnpm-lock.yaml`，没有 `package-lock.json`。

规划时不得把这些未验证内容视为已验收完成。

当前推荐下一独立 Issue 是 **Save Foundation v0.1**：版本化 IndexedDB Snapshot、Schema Version 与 Inventory/World Building/Campfire/Player Position/Game Time/Weather/Thermal 的序列化边界。该建议只是后续规划入口，本次 HUD Issue 未实现任何存档代码，也不得将 Shelter Enclosure、Storage、Equipment 或 Hotbar 多套布局混入其中。

## 12. 协作与交付约束

- 用户询问必须使用中文回答。
- 文档可以使用最适合 AI 快速理解的语言。
- 安装、启动、编译、重启和浏览器操作默认由用户执行，AI 只提供命令，除非用户明确授权。
- 每次实质改动后更新 `docs/AI_HANDOFF.md`。
- 不依赖原开发电脑的绝对路径。
- 必须提交 `pnpm-lock.yaml`，不得提交 npm 锁文件。
- 不得声称运行过实际没有运行的命令。
- 静态检查、浏览器渲染和交互验收必须分别记录。

## 13. 请 GPT 输出的开发计划

请先审阅上述项目目标、当前实现和验证边界，然后只制定计划，不直接生成代码。

计划至少需要包含：

1. 从当前基础工程到可玩的「第一场暴雪」Vertical Slice 的里程碑拆分。
2. 每个里程碑下可独立开发和验收的 Issue 列表。
3. Issue 之间的依赖顺序和可以并行的工作。
4. 每个 Issue 的目标、范围、非目标和验收标准。
5. 建议新增或调整的模块、Interface、Event、Service 和 JSON 配置。
6. 每个纯逻辑系统需要覆盖的单元测试。
7. Babylon 渲染、Havok、IndexedDB 和浏览器兼容性验证方案。
8. 性能预算、资产加载策略和需要推迟到后期的优化。
9. 存档 Schema Version 和 Migration 的引入时机。
10. 每个阶段需要更新的项目文档。
11. 风险、技术债和回滚方案。
12. 明确指出哪些内容不能在当前 Issue 中顺带实现，防止范围膨胀。

开发计划需要遵守以下要求：

- 第一优先级是天气和基地安全感，不提前开发 NPC、车辆或敌人。
- 先完成纯逻辑和 Data Driven 契约，再连接渲染和 UI。
- 每个 Issue 尽量保持单一职责并可独立验收。
- 不要设计过度复杂的框架或一次性 God Manager。
- 不要因为长期规划而提前实现完整 Chunk Streaming、Automation 或 Raid。
- 明确区分必须完成、建议完成和以后再做。
- 如果存在会显著改变架构的歧义，最多先提出 5 个关键澄清问题。

建议输出格式：

```text
一、当前状态评估
二、关键架构决策
三、里程碑路线图
四、Issue 拆分表
五、依赖关系与并行建议
六、测试与验收策略
七、性能与浏览器兼容策略
八、风险与范围控制
九、推荐立即开始的第一个 Issue
```
