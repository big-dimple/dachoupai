# 大丑牌 开发交接

状态：Phase 1 完成（含六角色立绘接入与裁切修复，`main` = `18bf081`，typecheck / 28 测试 / build 全绿）。本文是换 session / 换模型恢复上下文的入口，只写当前工作包与唯一下一步；稳定合同见 `docs/GDD.md`。

## 最近完成

- 六张正式立绘接入（`cd66332`）：`CharacterDefinition.portrait`，BootScene 统一预加载，选角页 3×2 卡片 + fallback 占位，GameScene HUD 角色小头像。
- 裁切焦点与资源路径修复（`18bf081`）：
  - `src/game/portraitCrop.ts`：纯函数 `portraitCoverCrop` / `portraitSquareCrop`，选角页 cover 裁切与 HUD 正方裁切共用同一 focal 配置。
  - 修掉方向反转 bug：原 `offsetY = (drawH - boxH) * 0.8` 实际裁掉头部；现按每角色 `portraitFocusX/Y`（0.52~0.62 / 0.07~0.11，按实际脸部位置估）锚定。
  - 立绘路径从 `/assets/...` 根路径改为 `import.meta.env.BASE_URL` 拼接，兼容子目录部署；补 `src/vite-env.d.ts`。
  - 新增 `tests/portraitCrop.test.ts`（真实图幅 1086×1448 + 选角框 352×158）。

## 验证与证据

- `npm run verify`（typecheck + vitest 28 项 + build）全绿，本机实跑。
- focal 数值是按原图逐张目测估的，尚未截图评审实际取景——启动 dev server 看选角页即可复核。

## 遗留风险

- 6 张 PNG 合计约 14.3 MB，BootScene 开局全量预加载；H5 首次打开受网络影响明显（已知问题，见 TODO P0）。
- 选角页仍是 `#090711` 深色背景，与明亮东方立绘不搭；属 Phase 3 视觉统一范围，不单独修。

## 唯一下一步

**TODO.md 的 P0 批次：角色立绘资源压缩**（WebP 缩略图 + 按需加载）。由外部模型并行处理，验收标准与接入要点已写在 TODO P0 批次内；完成后把该批次从 TODO 回写 ROADMAP，并刷新本文。

P0 完成后主线进入 Phase 2 Batch 2A（关卡骨架：RunState / StageDefinition，见 TODO.md）。
