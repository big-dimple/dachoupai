# 方案 A：五星规则恢复与指定替换 bug 分离

用户本轮明确选择方案 A，输入 PR143 HEAD `9b9d3aa7cf1929ec3b5ada946c2b7ecef084fccd`。该旧HEAD CI38346093938及production-docs38346093604均success，只属于旧候选。此次不合并、不增加其他需求，总计划仍由父任务整合。

## 最小差异

- 从原 main `f23c1fc2389242bacbb8f5d35733f1c344610727` 逐行恢复 a06/diverse-coefficient、b06/group-retrigger、a11/house-retrigger 三处完整判定；不新设五星阈值、不扩大到其它牌、不以类型缺口加分。
- 恢复 `shop-recommendation.test.ts` 与 `shop-post-purchase-condition.test.ts` 的原五星断言和名称；删除保留五星占位的产品注释。新增枚举测试仅检查1–5范围及完整五颗星，不再以全卡≤4为合同。
- 保留所有指定出售后的来源/修饰重算及不可出售待核处理，ShopScene、逐槽真实成本、组合潜力/上手共同计分说明逐字节不动。
- 新增一个受控20张公开牌组，覆盖三张旧五星同时出现；同一状态指定卖掉唯一加倍率来源时 a06 降四星，保留来源仍五星，证明修来源 bug 不需要取消五星。

这三个既有分支有公开条件见证，但**没有完成同点/顺子/同花跨路线价值、成本与寿命的统一校准**。恢复它们不等于认可全局最优或证明已平衡；五星应罕见，但本批不承诺出现率或每局2–3张。不再将覆盖不足直接等同于“全部既有五星错误”。

## 本轮验证

56项受影响规则/显示合同测试（6文件）及typecheck通过。此前96项和7对原生记录按原SHA保留，不冒称为这次新跑。新增手机检查仅390×844和320×640：三张五星货架、逐槽比较、成长损失、购买详情/组合说明及取消；使用受控导入与软件触摸，不是自然获得、自然通关、物理手机或跨路线五星校准。

冻结源码SHA、新截图、完整只读保存相等记录与最终CI在实际取得后追加。复现：

```sh
npx vitest run tests/shop-recommendation.test.ts tests/shop-recommendation-c2.test.ts tests/shop-recommendation-c07.test.ts tests/shop-post-purchase-condition.test.ts tests/shop-recommendation-evidence.test.ts tests/shop-offer-guidance.test.ts
npm run typecheck
RECOMMENDATION_OUTPUT=/tmp/recommendation-option-a node harness/recommendation-five-star.mjs
```

### 冻结与实际回执

产品恢复提交：`a154c9e2d3d6e3159439300d3177d7041f8b73c8`。最终截图观察器冻结：`586f70f74cbc8d628d649f4ea7ac0e25f4fab312`；两者产品src树相同，均为 `42fccbf84292ac7bf86cd10e4af90d189705048f`。后续仅追加证据，最终PR HEAD/CI以push后的工具回执为准，不能借旧9b9绿CI代签。

- [56项/6文件测试](option-a/tests.txt)、[typecheck](option-a/typecheck.txt)、[计划32包检查](option-a/plan.txt)全部通过；没有重跑无关规则或自然局。
- [冻结浏览器报告](option-a/report.json)及[全量state/journal/IDB/localStorage](option-a/full-state-journal-storage.json.gz)：两视口均三张五星，源文件无dirty。逐件真实点击比较、返回购买详情、滚动和取消，send=0，完整前后相等，页面错误0。
- 三张货架各五个14px实心星，bounds在本件区域内；详情完整“推荐指数 ★★★★★”首行也以DOM Range核对在滚动正文可见边界内，没有缩字或改样式。
- a06指定卖对上眼：四星；指定卖小费盒：五星。手机比较的四星/五星同时存在，不把具体条件损失等同于全局限星。卖已养成长期捧场的“失去：系数×1.6”、真实返4/付8/买后54仍可读。
- 两个原测试文件与原main逐字节一致，三条产品判定与原main逐行一致；ShopScene及其它产品文件与上一候选逐字节一致。对比原main仍仅推荐来源/说明与ShopScene购买摘要/比较的授权范围，不触及结算/领域/目标/倍率/资产/总计划。

已实际查看的新图：

- [320三张五星货架](option-a/320-five-star-shelf.png)、[390三张五星货架](option-a/390-five-star-shelf.png)。
- [320再说一遍详情](option-a/320-b06-detail.png)、[320独家戏详情](option-a/320-a06-detail.png)。正文仍可滚动，未宣称全部内容首屏同时露出。
- [390指定槽四/五星对照](option-a/390-a06-compare.png)、[390真实成长损失](option-a/390-growth-cost.png)。

首轮截图使用居中scrollIntoView，320长摘要的推荐行滚到可见区上方；[原帧](option-a/initial-scroll/320-b06-detail.png)与[源码/观察器身份](option-a/initial-scroll/metadata.json)保留。仅调整观察器为滚到摘要起始位置，并增加首行可见范围断言；**未修改产品滚动、布局或文字**。最终16张截图均绑定586f70f，文件[SHA256清单](option-a/sha256.json)可核。

仍未验收：跨路线五星统一校准、自然出现率/购买收益、父dot自然经营、物理手机/玩家理解。原三分支恢复不代表这些缺口已完成；草稿不合并。
