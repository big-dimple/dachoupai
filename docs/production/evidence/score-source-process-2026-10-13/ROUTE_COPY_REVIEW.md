# 过关加成显示词补正（2026-10-13）

在已核 `f3768366ea96242f9d4dfe56502cd91e74957353` 上，仅将 `ScoreSourceProcess.ts` 的 route-factor 来源效果词“本局资历”改为“过关加成”，删除同词的旧“资历”短写回退，同步现有断言。内部变量、事件/规则、before/after 消费、评分公式、布局、GameScene 与 PR160 的局部修改不变。

`npm test -- --run tests/score-source-process.test.ts`：1文件6项通过；`npm run typecheck`：通过。仅这一显示词，不新增 UI 验收矩阵或整局试玩，旧截图及验收范围仍按原 SHA 保留。精确新 HEAD CI 绑定 PR155 的最新提交，成功后再 ready；不合 main。

未来数值候选的单次 route-factor 仍按实际 before/after 消费，未写死 ×4，也未在本轮集成或代签该候选。后续单次事件集成体验仍需复验。
