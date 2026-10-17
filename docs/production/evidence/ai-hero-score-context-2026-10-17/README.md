# AI 当前英雄计分上下文准确性修复

基线：`760b9ebd56605d44786e6e8d2221b8ba22ab06a6`。独立工作树与分支 `dev/ai-preview-context-20261017`。
实测产品/测试源码提交：`24285a60bb049ab5cb87b3e1b56572a008b00738`（测试后仅提交同一份源码与测试，没有再改产品）。
环境：Windows、Node v22.20.0、npm 10.9.3、Vitest 4.1.11、Vite 7.3.6。

## 已修复

- `AiHandCandidates` 原快照把刘娥 `erxiangHandoff.targetId` 强制清空，实际 `previewR2Hand` 又漏传整个新契约。现在快照、缓存键和每个候选统一采用同一份公开计分上下文，保留显式目标。
- 使用现有正式 `previewR2Hand`，无第二套计分规则。`aiHandScoreInput` 按候选重算 Boss 普通点数抑制，传递新旧身份契约、路线、六英雄技能状态及已选助攻。谢幕显式支付只在预览输入中模拟 reducer 支付后的金币，原局金币、次数、蓄势、押注与 RNG 不变。
- `aiScoreContext` 是场景可用的显式草稿适配器；只采用调用者已经选择的目标/金额/释放/助攻，不寻找或提交技能。不替历史身份补新技能契约。
- 候选与已选技能不兼容时，由正式计分器拒绝该候选；只跳过列明的候选不兼容错误。无兼容候选或资源/身份错误返回 `unsupported`，不清空技能后回退出一个假候选。助攻已选时的 `heldIds` 与正式预览一致。
- 排名仍按公开最低分支；每种牌型只保留一组，平分先少出牌再按座位，高牌最后。没有改变高牌策略、性能切片或新增远端 API。

## 实际验证

`npm exec vitest run tests/ai-hand-candidates.test.ts tests/ai-hero-score-context.test.ts tests/ai-hand-action-cancellation.test.ts tests/erxiang-handoff.test.ts tests/azao-charge.test.ts tests/xiemu-burn.test.ts tests/amo-assist.test.ts tests/laohuan-refill.test.ts tests/touye-wager.test.ts tests/touye-new-core.test.ts`

PASS：10 文件、152 测试，exit 0。新增 18 项适配测试包括：

- 六英雄新局全部候选逐一对比独立构造的正式预览输入，完整预览对象相等。
- 普通 8 对：刘娥新技能未选 **102**、已选一张 8 **430**、取消后 **102**；移除新契约的旧身份对照为 **178**。B08 未选保持 **102**，显式发动按正式规则拒绝。
- 已选刘娥核心、苏轼助攻、谢幕支付、蓄势释放，以及已提交投爷新核押注、已用秦琼换牌状态与正式预览相同；没有自动发动或花费。
- B02 零点核心拒绝、已用技能拒绝、支付不足拒绝、取消改变缓存键并废弃旧空闲任务、只读随机预览不恢复/推进 RNG。

PASS：`npm run build`（`tsc --noEmit && vite build`），exit 0；328 modules。Vite 既有大块警告保留，没有扩大性能改造。

PASS：最终新增测试后 `npm run typecheck`，exit 0；`git diff --check`，exit 0。

初轮 30 测试有 1 项失败：测试期待 `insufficient-gold`，实际正式计分器优先报 `invalid-score-resources`；据正式行为修正断言后最终 152 项全过，未修改领域规则来迎合断言。

## GameScene 交接与尚未签收的范围

按文件所有权要求，**没有编辑 GameScene.ts**。该文件、domain、content、audio、public 与共享 plan 对基线无差异。

提供 [GameScene-owner-input.patch](GameScene-owner-input.patch)，仅两行：导入 `aiScoreContext`，并把现有 `aiInput().score` 包入适配器，传入 `erxiangTargetId / xiemuBurn / azaoRelease / assistIds`。已在基线源码运行 `git apply --check --unidiff-zero`，PASS；未应用，也未签场景集成通过。

**负责人还须核对同一交互中的草稿生命周期**：当前 `switchHandType`（约 1066 行）会清空 `erxiangTargetId / azaoRelease / xiemuBurn / assistIds`，候选弹窗换组也清空部分草稿。只接入输入补丁而沿用清空动作，已选技能参与比较后会在采用候选时被取消；不能据本包单测声称最终点击出牌已一致。本包不擅自改变该场景交互。负责人需统一 AI 采用候选时的技能语义，并在其工作树验证；不要只孤立套用输入补丁就发布。

策略限制待产品决定：高牌可能公开保底更高但仍排在成牌之后，沿用现行产品口径；当前只比较公开保底、每种牌型一组，不等于全局最优或实际随机结果保证。

NOT_RUN：浏览器、真人操作、设备、CI、部署。未直接修改/推送 main；不涉及商店、美术、音频、规则、数值、存档或共享计划。
