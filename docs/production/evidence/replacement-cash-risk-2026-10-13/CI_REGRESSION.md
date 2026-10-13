# 合同 A：四项 CI 失败归因与修订

原 HEAD `c101864021bd1d7d2a257d3cf043c3e30a47bf3f` 的 [CI 38390594036](https://github.com/big-dimple/dachoupai/actions/runs/38390594036) domain 失败（4 failed / 3325 passed），browser、docs 成功。[原 job](https://github.com/big-dimple/dachoupai/actions/runs/38390594036/job/115273582534) 的四项原日志摘录及本地重现保留在 ci-contract-a；不借用该 HEAD 的绿子项声明新 HEAD 全绿。

逐项对照父选定合同 A 后，未发现需要改产品源码的原因。修改两份既有测试，使它们核验权威命令结果和具体合同边界，而不是只改星数期望：

| 原失败位置 | 原因 | 新核验 |
| --- | --- | --- |
| shop-current-decisions.test.ts:23 | 旧字符串 21→18 混用售前现金。已付 2 金旧牌出售实收 1 金，购买前应为 22 金。 | 实际 SellJoker／BuyOffer 验证 21→22→18，文字必须为购款 22→18，且不出现 21→18；自动路线建议仍拒绝购买，原状态不变。 |
| 同文件 :24 | 指定出售后的零即时成长购入已证明停用包场，旧“指定后仍四星”违背合同 A。 | 未指定满槽仍四星、needs-selection、无替换对象／退款损失／risk；明确选第五槽才得到二星，且预览与真实售后续购 recommendation 相同、risk 两端金币等于实际命令。 |
| 同文件 :25 | 普通末槽优惠购入 21→19 也满足相同现金风险，旧四星期望与“同状态同档”不一致。 | 真实优惠 BuyOffer 消耗优惠、金币 21→19，对应二星；另保留实际售后 25→21 的四星不降档边界，并核验预览／续购一致及原状态不变。 |
| shop-recommendation.test.ts:34 | 旧断言要求指定替换与未指定满槽同星，抹平了有权威购买基线与尚未指定出售对象的区别。 | 未指定仍四星且不假设出售；指定第五槽 21→22→18 二星，续购与预览一致。明确改选出售包场时四星，不得把这个对象借给未指定满槽；原状态不变。 |

本地完整 `npm run verify:ci -- --scope=domain`：226 文件、3329 项测试全部通过，verify:content 72 张定义通过；34 项定向及 typecheck 通过。日志和结构化检查报告在 [ci-contract-a](ci-contract-a/)。报告记录执行时 HEAD c1018640 加两份测试工作区改动，before／after 指纹相同；不冒称提交后的远端 CI。新 HEAD CI 以 PR149 实际 run 为准。

本轮只改测试与证据，`src` 树仍为 `6731aabd6670252357d97475cf3b3f167de1cb07`。现有合同 A 受控截图不重拍，不改 UI、倍率、目标、保存结构或 DELIVERY_PLAN。不合并，仍 draft。
