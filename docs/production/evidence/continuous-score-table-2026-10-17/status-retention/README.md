# 计分信息保持窄检查 · 2026-10-17

基线为连续计分候选 `e2e64946f6fabe6fc0e8b369a6b3b52c5bda9d29`。该源码中没有 `renderShowStage`；对应入口为 `presentTrace`、`setSettlementFocus`、`updateHud`、`updateHeroControl` 和 `showScoreEvent`。没有发现计分时清空目标、阶段已得分或余次的分支。`setSettlementFocus` 只暂时隐藏可点击提示光晕，输入仍由既有 playing/ready 门禁禁用。

| 核查字段 | 持续呈现与证据 |
| --- | --- |
| 阶段目标 | 桌面 `hud/target` 保持“目标 400”；手机沿用 HUD 的“已得 / 目标”同一行。 |
| 阶段已得分 | `heatText` 全程可见。最终桌面复查在真实 award 前为 0，入账过程中滚动，落位为 34,681；不把尚未到达的本手总分提前当阶段已得分。 |
| 剩余出牌 / 弃牌 | `resourceCounts.play/discard` 保留提交后的实际余次。最终桌面为 3 次 / 3 次；此前刘娥 390×740 为 3 / 3，秦琼为 3 / 2。 |
| 技能已用 / 待兑现 | HUD `roleText` 与 `hero/skill-status` 保留。修复助攻成功出牌后，阶段已结束造成公共可用性查询返回 phase、UI误显“条件未满足”的情况：计分期间读取真实已保存 `stage.assistUsed`，经既有 `heroSkillButton` 显示“已用”。不改规则可用性。刘娥“已用”、秦琼押型持久化后的“已押两对”和出牌“结算中”复用下述原证据。 |
| 当前实际来源 / 效果 | `score/source` 每个事件都保持可见，显示真实来源及 operation 的效果文案；另有原来源旁的实际数值与累计 H / M / 本手总分。长篇重复 `breakdownText` 未重新打开。 |

最小产品修复只有 GameScene 三处：导入已有 `heroSkillButton`；`updateHeroControl` 在真实计分期间按已保存 assistUsed 保留“已用”；`animateRole` 不再用瞬时效果 note 覆盖 HUD 技能状态。实际 note 仍在原计分框，英雄头像响应保持。未改 ShopScene、画廊、DPR、素材、音频、领域规则或存档。

首次桌面观察（已加防覆盖、尚未修助攻已用）看到“苏轼·已选助攻×2 / 条件未满足”；拒收截图保留为 `rejected-stale-assist.png`。旧观察器只验证文字不为空，不能证明状态含义正确；本次补上对真实 assistUsed 的断言。

最终只复查同一组公开控制手牌，真实 UI 选牌、助攻、PlayAssistedHand 保存与演出，完整结果与同命令领域结果全等。1366×768 / Edge 143.0.3650.80，33 个事件、1202 个渲染帧，HUD 文本/可见性、真实助攻已用、来源效果和数字边界检查均无违规。最终 HUD 为“余音袅袅 · 已用 / 已用 / 出牌3次 / 弃牌3次 / 目标400”；原助攻当前已用状态保持到实际 ×2 到达。见 `runtime.json`、`hero-impact.png`、`award-landed.png`。

复用原 `../erxiang-short/runtime.json`、`../erxiang-short/02-hero-impact.png`、`../touye-short/runtime.json`、`../touye-short/decision-target-locked.png`、`../touye-short/05-hero-impact.png` 及两段连续录像的目标/余次/押型与实际来源证据。它们属于 e2 源码，非本次重录；本次未重跑六英雄矩阵，其余英雄交各自 owner 验收。

验证命令：`npm test -- --run tests/score-table.test.ts tests/hero-ability-cue.test.ts tests/touye-scene-phase.test.ts tests/score-table-haptics.test.ts`，4 文件 30 项通过；`npm run build` 通过（含 tsc --noEmit）。首次沙箱测试在临时缓存 rename 报 EPERM，0 项执行；正常本地权限重跑通过。构建仅有既有大 chunk 提示。最终源码原字节 SHA-256 在 `source-sha256.json`，检查输出在 `checks.txt`。

未签完整六英雄、所有尺寸、DPR 清晰度或发布后表现；本次只交信息保持窄修复。无需再上传 Library，也未重试已拒绝的跨范围物化。
