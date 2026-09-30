# 大丑牌 开发交接

状态：2026-09-30，Phase 2 **Batch 2A 关卡骨架**完成。稳定合同见 `docs/GDD.md`；P0 素材包已交付但未接入游戏，P1 立绘加载优化也仍是独立批次，本包均未夹带。

## 当前工作包与已完成

Batch 2A 交付（TODO 已勾选，ROADMAP Phase 2 已回写）：

- **RunState**（`src/run/runState.ts`）：seed、角色、stageIndex、巡演累计热度 totalHeat、已装备 jokerIds（默认五张，留给 2B 商店接管）。跨 Scene 存 Phaser registry 键 `runState`，更新走纯函数 `createRunState` / `advanceStage`（返回新对象）。
- **StageDefinition**（`src/run/stages.ts` + `src/content/stages.json`）：3 个普通关，目标热度逐级提高——第一关「开台锣鼓」1200/4 手 → 第二关「满座听雨」2000/4 手 → 第三关「灯火连天」2800/5 手。`getStage` / `stageOrderLabel` / `isFinalStage` 助手。
- **Seed 决定关卡随机**：`stageRng(seed, stageIndex)` 派生每关独立随机源，洗牌与骰爷判定都走它；同 seed 同关完全复现，换关/换 seed 即变（`tests/run.test.ts` 锁死）。
- **过场状态**：新 `IntermissionScene`（`src/game/IntermissionScene.ts`），三态——过关（本关数据 + 下一关预告 + 进入下一关）、三关全过（「今日巡演落幕」+ 回选角）、冷场（差距与累计 + 重新开局并清 runState）。
- GameScene 改为打“当前关”：HUD 显示「第 N 关 · 关卡名」与本关目标热度；每关重置热度/出牌数/上次牌型/选牌/演出队列，重洗 52 张。playIndex、谢幕人判定的 handsBeforePlay 均按关重置（回马枪每关第 3 手触发一次）。选角页 `choose` 负责建 runState；GameScene 对深链/冒烟的旧路径（只有 characterId+seed）现场补建，向后兼容。
- `main.ts` 注册 intermission 场景。

## 验证与证据

- `npm run verify`：typecheck、35 单元测试（新增 `tests/run.test.ts` 7 条）、build 通过。
- `npm run verify:smoke`：桌面/手机 选角 → 开局 → HUD 通过。
- 临时脚本 `shots/stage-flow.mjs`（gitignore，勿提交）固定 seed 实机打满第一关：过关进过场、stageIndex 推进、按钮进第二关；老幻单牌变体强制冷场：失败进过场、重新开局回选角、runState 清除。截图 `shots/desktop-{intermission,after-intermission,intermission-fail}.png` 已目审。
- 目审抓出并修复一个真 bug：进第二关时热度沿用上一关（每关目标应独立），已在 `create` 里整组重置；修复后复跑双分支验证通过。

## 遗留与边界

- 三关全过目前是「落幕回选角」的临时收口；Boss 关、胜负结算、角色台词属 Batch 2C，Boss 规则定义不要混进 stages.json 的普通关表。
- 商店/金币属 Batch 2B；RunState.jokerIds 已就位，商店随机另起 `shopRng` 式派生（参考 stageRng 约定），不要复用关卡随机源。
- 关卡数值（1200/2000/2800）是骨架初值，实测阿默单牌流三手即可过第一关，平衡性留给后续批次统一调。
- P0 素材接入、P1 立绘按需加载、Phase 3 明亮东方 UI 均未动；选角页仍是深色。

## 唯一下一步

TODO 的 **Phase 2 Batch 2B：商店与构筑**——金币奖励、商店 3 候选大丑牌、购买/刷新、5 装备槽、商店随机走 SeededRng、无法购买时按钮态清楚。
