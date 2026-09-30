# 大丑牌 开发交接

状态：Phase 1 完成 + 工程防线就位（双端冒烟、release 门禁），`main` 最新提交 `94015f3`，typecheck / 28 测试 / build / 双端冒烟全绿。本文是换 session / 换模型恢复上下文的入口，只写当前工作包与唯一下一步；稳定合同见 `docs/GDD.md`。

## 最近完成

- 工程防线（本提交，移植 board-race 成熟做法）：
  - `harness/screenshot.mjs` + `npm run shot` / `verify:smoke`：playwright 双端（桌面 1280×800 / 竖屏手机 390×844）跑通「选角 -> 开局」并断言六卡渲染、点击进入 game 场景、无页面错误；截图落 `shots/`（gitignored）。
  - `scripts/release-checked.mjs` + `npm run release:checked`：测试 + 构建 + 冒烟全绿才提交并 push main；要求 main 分支、只允许已 stage 文件、门禁期间工作区不得变化。
  - `main.ts` 增加 `?harness=1` 挂钩（仅测试模式暴露 `window.__harness`）。
  - CI（`.github/workflows/ci.yml`）原有 typecheck+test+build 保留，与本地 verify 对齐。
- 修复立绘纵向压扁 bug（接入时就存在）：`setDisplaySize` 按完整帧宽高分别求 scale，cover 裁切后被压成横条；改为 `setScale(coverScale)` 双边同比例。冒烟截图确认选角页六张立绘正常满框显示。
- 六张正式立绘接入（`cd66332`）：`CharacterDefinition.portrait`，BootScene 统一预加载，选角页 3×2 卡片 + fallback 占位，GameScene HUD 角色小头像。
- 裁切焦点与资源路径修复（`18bf081`）：
  - `src/game/portraitCrop.ts`：纯函数 `portraitCoverCrop` / `portraitSquareCrop`，选角页 cover 裁切与 HUD 正方裁切共用同一 focal 配置。
  - 修掉方向反转 bug：原 `offsetY = (drawH - boxH) * 0.8` 实际裁掉头部；现按每角色 `portraitFocusX/Y`（0.52~0.62 / 0.07~0.11，按实际脸部位置估）锚定。
  - 立绘路径从 `/assets/...` 根路径改为 `import.meta.env.BASE_URL` 拼接，兼容子目录部署；补 `src/vite-env.d.ts`。
  - 新增 `tests/portraitCrop.test.ts`（真实图幅 1086×1448 + 选角框 352×158）。

## 验证与证据

- `npm run verify` 全绿；`npm run verify:smoke` 双端通过（桌面 + 390×844 竖屏）。
- 双端截图在 `shots/`（gitignored）：`desktop-select/game.png`、`mobile-select/game.png`，立绘满框、HUD 头像正常。

## 遗留风险

- 6 张 PNG 合计约 14.3 MB，BootScene 开局全量预加载；H5 首次打开受网络影响明显（已知问题，见 TODO P1）。
- 选角页仍是 `#090711` 深色背景，与明亮东方立绘不搭；属 Phase 3 视觉统一范围，不单独修。

## 唯一下一步

**TODO.md 的 P0 批次：Phase 3 视觉素材与特效**（东方戏台背景、出牌/爆分特效、卡面底图、角色头像特写），只产出素材不改代码，风格硬约束与验收标准在 TODO P0 内。由高端模型接手。

P1（立绘 WebP 压缩，工程任务）可与 P0 并行，完成后把对应批次从 TODO 回写 ROADMAP 并刷新本文。

素材齐后主线进入 Phase 2 Batch 2A（关卡骨架：RunState / StageDefinition，见 TODO.md）。
