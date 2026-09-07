# Stormhaven

Stormhaven 是一款浏览器优先的第一人称 3D 单机 PvE 生存建造游戏。长期体验核心不是战斗，而是让玩家把寒冷、恶劣、危险的外部世界，逐步转变为安全、温暖、先进的家园。

当前仓库已完成 Vertical Slice v0.1「第一场暴雪」的基础玩法链、HUD/UI 图标与 **Save Foundation v0.1**。支持 Esc 暂停后手动保存，刷新后从标题页继续上次进度。存档恢复背包、资源余量、建筑、篝火燃料/燃烧状态、快捷栏、玩家位置/视角、时间、天气过渡和体热；实际浏览器读写及画面验收仍待用户完成。

最新 **3D Asset Foundation + First Blizzard Visual Pass v0.1** 已接入核心自有 GLB 模型、缓存/实例/失败回退，以及 1K PBR 雪地与真实加载阶段。原 Gameplay/Save v1 不变。资源来自项目本身，详见 [资源清单与预算](docs/ASSET_CREDITS.md)；生产构建、浏览器视觉和 FPS 仍由用户验收。

## 当前完成内容

- TypeScript 严格模式
- Vite 开发与生产构建
- Babylon.js 渲染
- Babylon.js Havok 物理引擎初始化
- 500m × 500m 雪地测试区域
- 程序化天空、雪地、雾和灯光
- 第一人称鼠标视角、WASD 移动、Shift 奔跑、Space 跳跃
- Babylon Collision Coordinator 与米/秒 Camera Speed 换算
- 默认隐藏、随 F6 Debug 显示的无碰撞控制校准标杆
- 正式第一版标题界面、真实初始化 Loading Overlay Contract 与 HUD
- 单一 Game Shell State：Boot、Main Menu、Gameplay、Player Menu、Interaction Menu、Build Placement、Paused
- Tab/C/B 统一生存菜单及背包/制造/建造 Tab；三个页面共享同一 Inventory
- Esc 状态优先级与 Pause Menu；暂停时冻结 GameTime、Weather、Thermal、Campfire Fuel 并卸载玩家输入
- 高对比 Crosshair：默认、可交互、建造合法与建造非法四种状态
- 8 格独立 Hotbar：初始前三格直达木地基、木墙和篝火；打开 Player Menu 时仍固定在屏幕底部，支持物品/建筑拖入、槽位交换、点击覆盖和独立清空
- 简化玩家状态 HUD；完整 Debug Telemetry 默认隐藏并由 F6 切换
- Inventory 使用真实 24 Slot 多列方格、数量角标、悬停 Tooltip 与即时详情；Crafting/Building 保持图标卡片和详情区
- UI 通过 `src/ui/icons` 的稳定游戏语义 ID 请求随包构建的 SVG；默认映射 Phosphor，缺少准确语义时允许由 Registry 映射项目内置专用图标（当前仅 `stick`），Domain 数据不保存图标文件路径，颜色由 `currentColor` 和状态 CSS 控制
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
- 局部降水粒子与固定/动态碰撞障碍的路径检测：屋顶、墙体、地面和玩家建筑会拦截雪花，开放入口仍允许风雪进入
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
- SaveGame Schema v1、单槽 IndexedDB 原子写入、运行时校验、迁移边界和失败回滚
- Pause Save / Main Menu Continue、真实恢复阶段与 Hotbar 布局持久化；不模拟离线燃料消耗

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

默认打开 `http://localhost:9999`。如果该端口被占用，请以 Vite 终端实际输出的地址为准。等待初始化完成后点击「开始新游戏」，或在有本地存档时点击「继续游戏」。浏览器拒绝异步 Pointer Lock 时会保持暂停，再点击「继续游戏」即可请求锁定鼠标。

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
| 鼠标悬停 | 背包物品格立即显示 Tooltip 并更新右侧详情，无需点击 |
| 鼠标点击 | 选择配方、制作、操作篝火、关闭菜单；Player Menu 中点击 Hotbar 可快速绑定当前物品/建筑 |
| 建造放置中左键 | 确认放置并消耗材料 |
| `R` | 建造放置中按配置步长旋转 Ghost |
| `↑` / `↓` / `Enter` | Crafting 菜单的辅助键盘操作 |
| `Esc` | 关闭当前菜单/放置；Gameplay 中暂停；暂停时继续 |
| `F1` / `F2` / `F3` / `F4` | 仅预览晴朗 / 多云 / 降雪 / 暴雪视觉 |
| `F5` | 退出视觉预览，恢复跟随天气计划 |
| `1`–`8` | 选择 Hotbar 槽位；建造槽会直接进入对应放置模式 |
| 鼠标滚轮 | 循环选择 Hotbar 槽位 |
| `F6` | 显示或隐藏完整 Debug Telemetry |

打开背包或建造页后，Hotbar 不嵌入弹窗，而是继续作为屏幕底部独立 HUD 显示。可将物品卡片或建筑卡片拖入任意槽位，槽位之间拖动会交换内容；选择卡片后点击槽位也可快速覆盖。每格 `×` 或右侧“拖到这里清空”区域用于清空。手动保存包含快捷栏布局；选择「继续游戏」会恢复，选择「开始新游戏」使用默认布局。

## 保存与继续

游玩后按 Esc，点击「保存游戏」，看到「游戏已保存」再刷新或关闭页面。重新进入后选择「继续游戏」；页面不会自动读档。开始新游戏不立即删除旧档，但下次手动保存会覆盖唯一的 `slot_1`，标题页会明确提示。

存档仅存在当前浏览器、当前网站来源（协议/主机/端口）的 IndexedDB 中，不随 Git 同步，不跨电脑，不自动保存。不要清理网站数据；切换 localhost/127.0.0.1 或端口会进入不同存档空间。离线期间不会扣除燃料或推进游戏时间。格式与故障边界见 [存档契约](docs/SAVE_FORMAT.md)。

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
- [存档契约](docs/SAVE_FORMAT.md)：Schema v1、恢复顺序、失败语义和迁移边界

## 架构概览

`src/core/Game.ts` 只负责 Babylon Engine、Scene、Simulation 与表现控制器的生命周期编排。`GameSimulation` 协调纯逻辑 `GameClock`、`ForecastSystem`、`WeatherManager`、`ShelterSystem`、`HeatSourceSystem` 与 `ThermalModel`；相机位置只以普通 `{x,y,z}` 数据进入模拟，不把 Babylon 类型泄漏到领域层。场景、玩家控制、界面分别放在 `world`、`player`、`ui` 模块中。

Thermal 只输出体热状态，不扣除生命。Crafting 运行链为 Recipe JSON → `RecipeCatalog` → `CraftingService` → Inventory Draft → Final Snapshot Commit。Building 运行于 Building JSON → `BuildCatalog` → Placement Validation → Inventory Draft → `WorldBuildingRegistry` → Gameplay Binding/Babylon Presentation。篝火 Binding 将已提交建筑注册到 `CampfireSystem`，燃烧状态再动态启停 `HeatSourceSystem`。UI 图标运行链为稳定 `GameIconId` → `iconRegistry` → 构建期 Phosphor/Stormhaven SVG；UI 不直接增删物品，领域系统不依赖 Babylon、DOM 或图标库。

## 当前阶段限制

3D Asset Foundation + First Blizzard Visual Pass v0.1 的实现与自动检查已完成，生产构建、浏览器视觉/输入/存档和 FPS 验收由用户操作。先按 [命令手册](docs/COMMAND_RUNBOOK.md) 的 Asset Visual Pass 与 Save 清单验收，再决定新 Issue；不要顺带继续植被、新玩法、Autosave、Settings、Shelter Enclosure、Storage、Equipment、Wetness 或工具玩法。
