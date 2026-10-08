# 结束状态保存复核

产品增量 `bc6cc510f3ba06ba6fbe865c8c7a18df72b09465`。仅存档验证谓词＋一个有意义的当前边界用例，不改C数值/输入/演出。

复核发现：原验证只据 stage.index / handsLeft / clearId 判连锁应否保留；指定核心后 AbandonRun，或牌堆已空时 DiscardHand 弃完可用牌，领域 clearStageEffects 已正确清连锁，但还有 handsLeft 就被 readCheckpoint 拒绝。新增当前用例先复现 `invalid-save-core-chain`，再将谓词加真实 phase==='await-input'，结束态要求null；历史trace的原核心点数保持14，不伪装成无发动。

18项定向通过（当前核心12＋原AI取消/失败恢复6），typecheck通过。用例覆盖主动放弃和余次>0的无可用牌失败，真实applyCommand→makeCheckpoint→readCheckpoint；空牌边界是守恒的受控当前状态，不是自然触达/浏览器输入。现有菜单不提供直接AbandonRun，未新增入口或冒称浏览器放弃已验。

原2e8a562/36822a4正常入口图和记录仍保原SHA。此增量没有视觉/正常回合变动，不重跑其窗口或完整路线；最终CI只按最新head回执，不借历史绿项代签。仍待父独审与真人/实机/GPU/听感，三线均衡未签。
