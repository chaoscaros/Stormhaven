# Stormhaven 游戏设计

## 项目愿景

Stormhaven 是一款浏览器运行的第一人称 3D 单机 PvE 生存建造游戏。

游戏最重要的情绪变化是：外面的世界寒冷、危险、不可预测，而玩家亲手建设的基地越来越安全、温暖和先进。

战斗不是体验中心。准备、探索、返回、恢复，以及家园肉眼可见的成长，构成主要游戏节奏。

## 核心设计支柱

1. **室外危险，室内安心**：庇护所和热源必须带来强烈的机制与感官差异。
2. **准备产生故事**：天气预报给玩家足够信息，使其能够进行有意义但不一定完美的计划。
3. **家园逐步成为系统**：手工生存逐渐升级为储存、能源、水、食物和自动化网络。
4. **规则清晰可理解**：Data Driven 系统应该让玩家理解因果，而不是受到隐藏规则惩罚。
5. **单机 PvE 优先**：不让 PvP、MMO 或联网服务器需求影响核心设计。

## Vertical Slice v0.1：「第一场暴雪」

最终 v0.1 目标是一张约 500m × 500m 的雪地区域，包含森林、湖泊、公路、废弃加油站、简单木屋和少量搜刮地点。玩法验证期间允许使用基础几何体作为占位模型。

完整流程计划在 14:00 开始，初始天气晴朗或多云。天气预报告知玩家 18:00 将出现暴雪。玩家需要搜集必需品、改善庇护所、准备热源，并在天气变得致命之前返回基地。在点燃的篝火旁熬过暴雪后，显示 `DAY 1 SURVIVED`。

## 长期开发优先级

1. 恶劣天气
2. 基地建设与升级
3. 自动化
4. 车辆
5. 打猎和钓鱼
6. NPC 招募和工作
7. 可选 PvE 入侵防守

低优先级功能不得延误天气和基地安全感这两个体验核心。

## 当前已完成阶段边界

当前已完成现代桌面浏览器技术基础至 HUD + UX Overhaul v0.1：

- 工程工具和模块边界
- Babylon.js 场景及 Havok 启动
- 程序化天空、地面和灯光
- 第一人称移动与视角控制
- Day 1 14:00 开始的确定性 GameTime
- 14:00 可见的 18:00 Blizzard 预报
- 17:30 开始、18:00 完成的 WeatherTransition
- 时间、天气、预报和过渡进度 Debug HUD
- Clear/Cloudy/Snow/Blizzard 的 Data Driven 视觉配置和预览
- 17:30–18:00 连续变化的天空、雾、灯光与局部雪粒子
- 天气温度与风力连续驱动的体感温度和 0..100 体热储备
- Blizzard 比 Clear 明显更快的体热流失，但尚不产生生命伤害
- 固定测试木屋用 AABB 提供 90% 挡风与小幅温度加成
- 玩家放置并点燃的篝火用平滑距离衰减提供外部热量；多个热源可相加但有全局上限
- 暴雪中室外失温、无火木屋内减缓失温、点燃篝火旁回暖的纯领域链路
- 降水粒子被屋顶、墙体和地面拦截，但仍可从开放入口随风飘入
- 玩家可在 2.75m 内对准场景资源并按 E 拾取；Prompt 会显示物品名和数量，实体墙体会正常遮挡墙后的资源
- 9 类物品由 JSON 定义，第一场暴雪场景放置 6 个少量测试资源
- 24 Slot / 30kg 背包支持 Stack 和容量/重量限制下的 Partial Add
- 背包、制造与建造已整合为统一生存菜单 Tab，菜单态释放第一人称鼠标；Inventory 仍只读，不包含拖放或物品使用
- 玩家可徒手将树枝 ×2 与石头 ×2 即时制作成石斧 ×1
- 制作面板明确展示所需/持有数量、缺失材料、产出和失败原因
- 石斧只证明“收集材料 → 制作成品”链路，不可装备、挥舞、砍树或消耗耐久
- 玩家可按 B 打开鼠标建造菜单，直接用 Inventory 材料选择木制地基、墙体或篝火
- 木制地基使用与固定测试木屋外沿对齐的 2m 世界 Grid，能贴合木屋边缘而不重叠或留缝；木墙只能吸附到地基 North/East/South/West 边缘
- Placement Mode 使用单一半透明 Ghost，合法/非法状态不同；左键放置、R 旋转、B/Esc 退出
- 成功建造会原子扣除材料并生成当前运行会话内的 World Building；刷新页面后消失
- 正式建筑参与玩家碰撞和降水 AABB 阻挡，但自建建筑尚不提供 Shelter/挡风/保温
- 篝火花费石头 ×4、木材 ×2，放置成功后生成独立 Campfire State 和可交互目标；与玩家身体、固定墙体或现有建筑重叠时拒绝放置且不扣材料
- 对准篝火按 E 打开鼠标菜单；每份木材提供 180 个真实燃烧秒，容量 900 秒，可点燃、熄灭和重新点燃
- 只有 `burning` 篝火提供热量；`unlit`、`out_of_fuel`、熄灭、移除或燃料耗尽均不提供热量
- 低模石圈、木柴、火焰和暖色点光源表达状态；规则状态不由视觉对象持有
- 标题界面完成真实 Runtime 初始化后才允许开始；开始前游戏时间、天气、体热和燃料不推进
- Tab/C/B 进入同一个生存菜单，通过背包、制造和建造 Tab 查看同一份实时 Inventory
- E 篝火仍是世界对象 Interaction Menu，不混入玩家全局菜单
- Esc 优先退出建造放置、篝火菜单或生存菜单；Gameplay 中才打开暂停菜单
- Pause 释放鼠标并冻结 GameTime、Weather Schedule、Thermal 与 Campfire Fuel；继续后恢复
- Loading Overlay 只展示真实初始化阶段，不伪造百分比
- 正常 Gameplay 只常驻高对比状态准星、交互提示、8 格 Hotbar、简化状态摘要和极简快捷键提示
- Hotbar 前三格固定为木制地基、木制墙体和篝火；1–8 与滚轮选择，建造槽直接进入放置，菜单和暂停时不会触发
- Debug Telemetry 保留完整开发数据但默认隐藏，以 F6 切换；F1–F5 天气预览契约不变
- Player Menu 的背包、制造与建造改为图标卡片 + 详情区，仍共享同一实时 Inventory
- 可重复执行的类型检查、测试和生产构建

当前 Shelter 仍仅是固定 Scenario Volume；HeatSource 已由燃烧中的玩家篝火动态注册，固定木屋不再提供常开测试炉。Crafting 只处理 Inventory Item → Inventory Item，Building/Campfire 分别处理 Inventory Materials → World Entity 和 Inventory Wood → Fuel State；明确不包含工作站、队列、耗时制作、工具使用、装备、耐久 Runtime、容器或存档。Thermal Reserve 是游戏化资源，不是医学核心体温。

Tab Inventory、C Crafting 与 B Building 是统一 Player Survival Menu 的三个子 Tab；E Campfire 是独立 Interaction Menu。它们和 Pause/BuildPlacement 由单一 Shell State 互斥管理。菜单态释放 Pointer Lock，选择建筑后进入锁定鼠标的 BuildPlacement。

Game Shell + Unified Menu + Pause v0.1 只完成“标题 → 开始会话 → Gameplay → 统一生存菜单/对象交互 → 真正暂停/恢复”。保存、读取、继续游戏、存档槽、自动保存、设置和正式 Asset Loading Pipeline 均未实现；自建结构转化为 Shelter Zone 仍留给独立 Issue。

## 非目标

- 联机、PvP、MMO 基础设施
- 原生客户端、Electron、Unity 或 Unreal Engine
- 最终美术资源
- 复制参考游戏的受版权保护内容
- 复杂建筑编辑器
- 提前开发 NPC、车辆、野生动物或入侵系统
