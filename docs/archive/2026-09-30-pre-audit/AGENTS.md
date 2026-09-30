# AGENTS.md

本仓库由人类策划与开发 AI 协作维护。任何编码 Agent 修改代码前先读本文件。

## 每次任务开始必读

按顺序完整读取，再动手：

1. 本文件（规则与命令）
2. `docs/GDD.md`（稳定设计合同：角色、大丑牌、计分顺序、演出顺序、视觉方向）
3. `TODO.md`（只放下一步要做什么，按批次排好优先级）
4. `docs/development-handoff.md`（当前工作包、已完成事项、验证证据、唯一下一步）

换模型、换 session、接新需求都从这里恢复上下文，不要凭记忆或聊天记录猜。

## 文档归属（单一事实来源）

| 内容 | 权威位置 | 更新时机 |
| --- | --- | --- |
| 玩家可见的玩法与运行方式 | `README.md` | 玩家可见行为变化时 |
| 稳定设计合同（计分公式、演出顺序、角色/大丑牌效果、视觉方向） | `docs/GDD.md` | 稳定合同变化时 |
| 阶段级完成状态 | `ROADMAP.md` | 批次完成时从 TODO 回写 |
| 下一步行动清单 | `TODO.md` | 每次交接时刷新，只留未完成项 |
| 当前工作包 + 唯一下一步 + 验证证据 | `docs/development-handoff.md` | 每个工作包开始/结束/换 session 时 |
| 临时素材、截图证据 | `docs/shots/<日期>-<主题>/` | 作为评审证据时才提交 |

规则：

- 稳定文档（GDD / ROADMAP / AGENTS）只在稳定合同真的变化时更新，不记录临时进度。
- 跨 session 的临时上下文只写进 handoff 或 `docs/shots/` 证据目录，写完即弃，不新开散落的笔记文件。
- `shots/`（仓库根）是冒烟脚本的截图暂存，已 gitignore，不算证据目录；要留存评审的证据才拷进 `docs/shots/`。
- 不在仓库根目录新建一次性 Markdown；新文档先问自己属于上表哪一格，放不进去就不写。
- 发现文档与真实实现冲突，先按真实实现修正文档，再改代码。
- 代码与用户最新明确决定高于文档。

## 不可破坏的原则

- 游戏规则与表现层分离。动画结束与否不能改变核心计分结果。
- 核心随机行为统一使用 `SeededRng`，业务逻辑禁止直接调用 `Math.random()`。
- 触发效果走 `TriggerEngine`，演出顺序走 `EffectQueue`。
- 不为了单个需求大规模重构无关模块。
- 新增复杂牌型、计分、随机、触发规则时必须补测试。
- 第一优先级是可玩的 Vertical Slice，其次才是内容数量。
- H5 必须兼顾触摸操作；不要只按桌面鼠标设计。
- 不把版权受限的第三方游戏素材、音乐、角色或卡面直接放进仓库。

## 资源与路径

- 角色立绘等资源放 `public/assets/`，代码内通过 `import.meta.env.BASE_URL` 拼接地址（兼容子目录部署），禁止写死根路径 `/assets/...`。
- 立绘裁切对焦用 `CharacterDefinition.portraitFocusX / portraitFocusY`，几何计算在 `src/game/portraitCrop.ts`，选角页与 HUD 共用。

## 修改后的最低检查

```bash
npm run verify        # typecheck + 单元测试 + 构建
npm run verify:smoke  # 真实浏览器双端冒烟：选角 -> 开局 -> HUD（playwright）
```

若当前环境无法运行，必须明确写出“未运行”，不能把静态检查描述为已通过。

改动演出、场景流转、立绘渲染后，另跑 `npm run shot` 生成双端截图人工目审（落盘 `shots/`，已 gitignore）。

## 发布

- 发布走门禁：`npm run release:checked -- "type: message"`（先 stage 评审过的文件）。
  它会依次跑单元测试、构建、双端冒烟，全部通过才提交并推送 `main`；任一环节失败或门禁期间工作区被改动都会中止。
- `--plan` 只检查发布纪律不执行；平时提交小步也可用普通 `git commit`。

## 提交前

- 运行 `jiepi-clear`（轻量模式）：检查实际 diff，清理死代码、临时文件、误提交的大文件；确认文档更新落在正确的归属格里。
- 只提交本次评审过的文件，不夹带无关改动。
- 完成的工作正常提交；提交后刷新 `docs/development-handoff.md`，把 TODO 完成项回写 ROADMAP。
