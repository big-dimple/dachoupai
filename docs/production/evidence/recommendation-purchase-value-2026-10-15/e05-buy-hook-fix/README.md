# e05经营来源丢失：钩子名小修

承接原开发分支与基线`d3e4c288108ac6059019373498b72d6c60f7e769`。独立审查首先提出“可能静态推导为4星”；本目录随后实际执行该候选，才记录修前4星，不把原静态推导当作既有运行结果。

## 实际复现与修正

输入为`held(fixture(),['b02','e05'])`、40金、现货e08，指定卖出零成长普通e05。来源定义为`src/content/r2-jokers.json`的e05，其购买成长phase为`onBuyOffer`；`r2Run.ts`购买路径实际派发同名钩子。原推荐误查不存在的`onBuyJoker`，未将失去该经营来源纳入上限。

| 执行事实 | 修前 | 修后 |
| --- | --- | --- |
| 现金／退款／实付 | 40→43→35；返3、付8、净5 | 相同 |
| 当前利息档 | 5→5，无下降 | 相同 |
| 普通2♣样例 | 22→39，+17 | 相同 |
| 对子7♣7♦样例 | 122→220，+98 | 相同 |
| `allPositive / unmeasuredLoss` | true / false | 相同 |
| `lostInvestment / ceiling / stars` | false / 4 / 4 | true / 2 / 2 |

执行数据：[before.json](before.json)、[after.json](after.json)。两次均确认原状态未改变；独立克隆交易核真实先售后买。另实际执行“保留e05直接买e08”，确认e05由空成长变为热度8，证明所丢来源确实挂在购买事件，而非凭名字猜测。分差只是已限定的公开条件窗口，不能替未来经营价值兑现。

产品只改`ShopPurchaseValue.ts`的这一处判断：使用`onBuyOffer`，并将字符串数组`includes`改为直接比较`HookPhase`联合类型，使同类不存在的事件名可由TypeScript检查。没有扩充经营phase政策，没有修改领域、展示、价格、成长或存档。

## 验证与范围

- [before-test-failure.txt](before-test-failure.txt)：新反例在原代码上实际失败，`lostInvestment`得到false。
- [tests.txt](tests.txt)：`npx vitest run tests/shop-purchase-value.test.ts tests/shop-post-purchase-condition.test.ts tests/shop-replacement-cash-risk.test.ts tests/shop-sale-continuation.test.ts`，4文件／51项PASS。
- [typecheck.txt](typecheck.txt)：`npm run typecheck`通过。
- [hook-name-audit.json](hook-name-audit.json)：按领域`ScoreHookPhase / TransactionHookPhase`核对五个相关shop/value模块现有事件名。修前唯一不存在的名称为`onBuyJoker`，修后均匹配；`onStageClear`、`onSellJoker`、`onHeldCard`等原有拼写正确。只核名称，不冒称重审全部钩子覆盖或全库经营价值。

重放：在仓库根目录执行`node docs/production/evidence/recommendation-purchase-value-2026-10-15/e05-buy-hook-fix/reproduce.mjs /tmp/e05-hook-result.json`。before/after中的HEAD均为当时尚未提交修复时的父提交；实际所测文件由各自`sourceSha256`区别并绑定，不能把HEAD字段误作两个不同产品版本。

本修复未重跑原双端矩阵、自然试玩或完整构建。此前PC／390验收仍只对应原208aebbb产品；本目录只签此钩子名修复、纯评估反例、相关单测与类型检查。开发分支push，不合main、不部署、不重试Forbidden PR；长期寿命／五星公平性／S04原未决不变。
