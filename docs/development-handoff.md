# 大丑牌 开发交接

状态：2026-09-30，Phase 2 **Batch 2B 商店与构筑**完成（紧接 2A 关卡骨架）。稳定合同见 `docs/GDD.md`；P0 素材包已交付未接入、P1 立绘加载优化未做，均为独立批次，本包未夹带。

## 当前工作包与已完成

Batch 2B 交付（TODO 已勾选，ROADMAP Phase 2 已回写）：

- **经济与 RunState 扩展**：`RunState` 新增 `gold`；起始 6 金、起手 0 张大丑牌（落实 GDD「商店完成后改为购买制」）。过关奖励 = 关卡 `clearGold`（stages.json，6/7/8）+ 剩余出牌 ×2（`stageClearGold`），在 `advanceStage(run, heat, handsLeft)` 内结算，纯函数。
- **商店规则纯函数**（`src/run/shop.ts`）：货架 3 张按稀有度加权（5/3/2）不放回抽；定价普通 4 / 罕见 5 / 稀有 6；刷新 2 金；`MAX_JOKER_SLOTS=5`；`canBuyJoker` 返回 `already-owned / slots-full / not-enough-gold` 供 UI 置灰，`buyJoker`/`payReroll` 不可用时抛错。商店随机走 `shopRng(seed, stageIndex)` 派生源，与关卡 `stageRng` 隔离。
- **ShopScene**（`src/game/ShopScene.ts`，键 `shop`）：装备槽 5 格、货架卡（稀有度描边、价格、不可买时置灰并写原因）、换一批（金币不足/无货停用）、进入下一关。货架只在进店时生成，存场景内存，不污染 RunState。
- **流程变为**：选角 → **商店（开局先淘牌，按钮「开局」）** → 第一关 → 过场（显示过关金币与现有金币，按钮「去货摊看看」）→ 商店 → 第二关 → … → 第三关 → 落幕（2C 再接 Boss）。GameScene 空装备时显示「尚未装备大丑牌」提示；深链/冒烟旧路径仍兼容。
- **数值不是拍的**：`tests/balance.test.ts` 用贪心机器人在真实计分+商店逻辑下跑完整一局做回归门禁。实测空手第一关 1200 太狠（贪心 7/10 失败）、700 仍让休闲打法多数失败，所以改成开局先进店。当前 700/1500/2200 + 起始 6 金下，二响/阿燥贪心全通 ≥5/10、首关失败 ≤2/10。注意贪心低估阿默（不会主动打单牌），角色间平衡是后续批次的事。
- 冒烟 harness 更新为新链路（选角 → 商店 → 开局），双端断言照旧。

## 验证与证据

- `npm run verify`：typecheck、45 单元测试（新增 `tests/shop.test.ts`、`tests/balance.test.ts`，更新 `tests/run.test.ts`）、build 通过；`npm run verify:smoke` 双端通过。
- `shots/shop-flow.mjs`（gitignore 临时脚本）全有机实机验证：选二响 → 商店（6 金买借东风）→ 第一关过关（得 7 金）→ 过场 → 商店（买满堂彩、刷新）→ 第二关。截图 `shots/desktop-{shop-start,shop-after-stage1,intermission,stage2}.png` 已目审：装备槽、货架置灰原因、刷新停用态、开局按钮均正确；手机竖屏商店 FIT 缩放正常。
- 过程中抓到并修复：空手开局难度断层（改开局进店）；起始金 4 买不起罕见牌（改 6）；`slots-full` 在池=槽时不可达（测试改用防御性断言并注释）。

## 遗留与边界

- 大丑牌池恰好 5 张 = 槽位数，槽满约束当前对玩家不可见；2C 或内容批次加新牌即生效（逻辑与测试已就位）。卖出/卸下未做（TODO 未要求）。
- 商店刷新平价为 2 金（无递增）；阶段目标 700/1500/2200 是仿真校准初值，真人手感与角色差异（尤其阿默）留待统一调。
- 三关全过仍是「落幕回选角」临时收口；Boss 关定义要独立，不混进 stages.json 普通关表。
- P0 素材接入、P1 立绘按需加载、Phase 3 明亮东方 UI 均未动。

## 唯一下一步

TODO 的 **Phase 2 Batch 2C：Boss 与结算**——1 个真正改变规则的 Boss（独立定义）、胜利/失败结算、六角色开场/胜利/失败台词。
