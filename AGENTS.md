# Stormhaven 开发与 AI 协作规范

本文件对仓库内所有开发者和 AI 助手生效。

## 开始工作前

必须按顺序阅读：

1. `README.md`
2. `docs/AI_HANDOFF.md`
3. `docs/COMMAND_RUNBOOK.md`
4. `docs/GPT_PLANNING_BRIEF.md`（进行规划、拆分 Issue 或评估路线图时）
5. `docs/GAME_DESIGN.md`
6. `docs/TECH_DESIGN.md`
7. 当前任务涉及目录中的源码和测试

不要只看用户当前一句话就跳过现有设计和交接状态。

## 产品原则

Stormhaven 是浏览器优先的第一人称 3D 单机 PvE 生存建造游戏。体验核心是“危险寒冷的室外”与“安全温暖、不断升级的基地”之间的强烈对比。

不要引入 PvP、MMO、联网服务器或原生客户端假设。

## 当前阶段

当前已完成**基础工程**、**Game Time + Data Driven Weather Core v0.1**、**Weather Presentation Layer v0.1**、**Player Thermal Model v0.1**、**Shelter + Heat Source v0.1**、**Interaction + Item + Inventory Foundation v0.1**、**Crafting Foundation v0.1** 和 **Building Foundation v0.1**。Tab/C/B 菜单共用单一 UI Mode；玩家可用收集的木材放置木制地基，并将木墙吸附到地基边缘。建造事务、动态相机碰撞和动态降水障碍已经接入，但自建结构不提供 Shelter 效果。

本 Issue 已达到停止条件。在新的 Issue 明确授权之前，不得继续扩展 Building 或 Crafting，也不得实现 Campfire Gameplay、Heat Source Placement、Fuel、Shelter Enclosure、Door/Window Gameplay、Building Upgrade/Damage、Demolish/Refund、Repair、Storage/Container、Save/IndexedDB、Item Use/Equipment、Tree Chopping、Mining 或其他范围禁止项。石斧仍只是 Inventory 成品，自建结构也不会自动成为 Shelter。

## 包管理和命令

- 唯一包管理器：pnpm
- 不提交 npm 的 `package-lock.json`
- 必须提交由 `pnpm install` 生成的 `pnpm-lock.yaml`
- 使用 `pnpm dev`、`pnpm typecheck`、`pnpm test`、`pnpm build`
- 不在脚本中写死开发者本机路径

当前用户要求：涉及启动、编译、重启或浏览器操作时，先告诉用户需要执行的命令，由用户亲自操作；除非用户之后明确授权，否则 AI 不要自行运行这些操作。

完成一轮开发或修复后，应使用中文 Commit Message 提交，并在检查无误后推送到当前跟踪的 Git 远端，方便定位问题、修改和回退版本。若推送失败，必须明确报告本地提交和远端之间的差异。

用户询问安装、启动、测试、构建、预览或故障处理时，必须使用中文回答。准确命令和标准中文回复参考 `docs/COMMAND_RUNBOOK.md`。

## 工程规则

- TypeScript 保持严格模式，避免使用 `any`。
- 优先使用小型 Service、纯函数、Composition 和稳定 Interface。
- 可确定的游戏规则必须尽量独立于 Babylon 和 DOM。
- DOM 访问只允许出现在 `src/ui` 或窄范围浏览器适配层。
- `Game` 只负责生命周期和模块编排，不得发展为 God Class。
- 未来的数据定义使用稳定 ID，不得将展示名称作为业务键。
- 大量世界对象不得各自执行每帧更新。
- 为 Thin Instances、Object Pool、LOD、Chunk Streaming 保留扩展空间，但不要提前实现。

## 质量检查

交付前需要完成：

```bash
pnpm typecheck
pnpm test
pnpm build
```

未实际运行的命令不得写成“已通过”。代码检查、浏览器渲染和输入验收必须分别记录。

## AI 交接要求

每次产生实质改动后，更新 `docs/AI_HANDOFF.md`：

- 更新“当前状态”和“变更记录”。
- 写明实际运行过的验证命令及结果。
- 写明没有验证的内容和原因。
- 写明未完成事项、已知风险和推荐下一步。
- 使用仓库相对路径，不记录仅在某台电脑有效的绝对路径。

产品范围或体验变化时同步更新 `docs/GAME_DESIGN.md`；架构、模块职责、依赖或运行方式变化时同步更新 `docs/TECH_DESIGN.md`。
