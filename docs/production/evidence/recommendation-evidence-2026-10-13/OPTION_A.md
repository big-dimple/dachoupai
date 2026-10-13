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
