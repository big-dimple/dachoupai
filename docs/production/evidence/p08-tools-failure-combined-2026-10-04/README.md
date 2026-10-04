# P08 六工具图／图框修正与失败摘要统一 review

按父侧明确授权，将已批准工具review `e4fbf6ad750e49e5cd1d76e76406c40d4159de38` 与已批准失败摘要review `28f5c9daee404148563045c1481dafc8b479da07` 正常合并，基线 main `2d999cd938e5c19253daa8ddbd1cf25facf2d9e4`；合并源码 `702b32bceff503d0a3a9bd160c2e0271382ef538`，无冲突、无force、未写main。两输入精确CI均已success：[tools37223260059](https://github.com/big-dimple/dachoupai/actions/runs/37223260059)、[failure37223472710](https://github.com/big-dimple/dachoupai/actions/runs/37223472710)。合并后新head另跑必需CI，不以两输入旧CI代替统一review的验证。

相对main，运行源码只新增FailureSummary.ts、修改IntermissionScene.ts，并删除style.css两条旧工具图框尺寸规则。失败摘要两文件逐对象同28f5c9d，工具资源/图框修正逐对象同e4fbf6a；main的朱砂/头像演出、GameScene/ScoreFlame/audio、72人话文案、domain/application/content、Shop/GoodsArt/按需HD/权威工具文案保持。全部art/public/license逐树同e4fbf6a；只保source b25f00aaafbd79a475fa045eceea18a5d4df6b29的T06–T11新增目录，未获取或合入B工具包失败候选、T13–T18新批。coverage仍12/12长期道具、9/39消耗工具、72/72Joker；42Goods WebP643054B。

失败摘要仅显示已提交的结束原因、经stageOutcome核对的最后一手、真实剩余出牌/弃牌次数，不重算分、不写run或存档，不改变结果布局。工具仍用统一contain/居中图框，原图像素不变。8文件62项最小受影响单测与typecheck PASS。受影响范围是两候选的商品/详情与终局读取；没有重跑无关手动冻结或重新拍图/构建。

双方证据文件保持原字节与构建身份：[六工具／修正证据](../p08-tools-t06-t11-2026-10-04/README.md)、[失败摘要证据](../p08-failure-summary-2026-10-04/README.md)。父侧已实际看contained工具图与CSS两条删除、失败摘要390 after并审源码，局部方向通过；整合者不冒充重拍、当前组合构建图或新的整体视觉验收。工具PNG仍是6df40d5 modified=false；失败摘要原PNG保原报告身份。既有自然路线验证由其输入证据承担；新review精确CI承担必需production/type/三浏览器门禁。

**320px商店构筑条裁切仍OPEN**，原UX/handoff/plan记录完整保留，没有把另一工具入口矩阵PASS扩张成整个320店面通过。该问题未在本次复现或修复；整合者未读取原copy320-shop像素，不声称独立视觉验收。整体美术/OnePlus/GPU/听感边界保持；P08仍in_progress。父侧统一安排一次发布，本候选先不main。

[summary.json](summary.json)记录固定输入、逐树保持与实际测试范围；最终统一review SHA、精确CI及FF资格由交付报告给出。

```sh
npm exec -- vitest run tests/goods-art.test.ts tests/goods-art-loading.test.ts tests/detail-art.test.ts tests/detail-dialog.test.ts tests/failure-summary.test.ts tests/stage-outcome.test.ts tests/failure-audio.test.ts tests/c03-result-transition.test.ts
npm run typecheck
npm run verify:ci -- --scope=docs
```
