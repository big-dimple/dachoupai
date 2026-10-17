# 锦上添花：多彩标签与额外加成文案接口

独立批次，基于已推送的长期物品文案 `9c12d119cbd1fa2e763e9e481f526ef6056dfad3`。只扩展共用 `r2ToolInfo.ts` 展示适配，不改 ShopScene、DetailDialog、稀有度、星级、规则、冻结配置或存档。

遵循用户 11:54 澄清：**保留“多彩”标签**，旁边直写 **额外倍率×1.5**；不再用“版次”“独立于本体条件”向玩家解释。商店未点击的货架信息区须展示 `shelf`，不可只放详情。

## 真实规则

- 锦上添花技术 ID 为 `c12`，本场须实际打出过普通顺子与普通同花，两者都要；普通同花加同花顺不能替代普通顺子。成功过关时从 T03–T06 等概率获得一件，库存满转 2 金币；失败、跳场不赠。依据：[冻结定义](../../../../src/content/r2-jokers.json)、[实际历史标记](../../../../src/domain/r2Run.ts#L850)、[条件判定](../../../../src/domain/r2Conditions.ts#L64)、[已有真实过关回归](../../../../tests/c02-economy.test.ts#L114)。
- 多彩额外加成是**乘当前整手倍率 1.5**，不是倍率加 1.5；每手结算到该唐宋牌时，在其原有计分效果之后执行。赠品条件没有达成仍可获得加成；该牌计分被封禁时，加成也暂停。依据：[运算](../../../../src/domain/scoreR2.ts#L226)、[封禁检查](../../../../src/domain/scoreR2.ts#L291)、[逐牌效果后结算](../../../../src/domain/scoreR2.ts#L354)。

## 给商店 owner 的接口 diff

新增导出：

```ts
import {jokerExtraBonusCopy} from './r2ToolInfo';
const bonus=jokerExtraBonusCopy(offer.edition,{
  definitionId:offer.definitionId,
  chapterDisabled:run.chapterDisabledJokerId===offer.definitionId,
});
// bonus.label  → 多彩（既有熟悉标签保留）
// bonus.shelf  → 多彩 · 额外倍率×1.5
// bonus.detail → 多彩 · 额外加成：每手先算这张牌原有的计分效果，
//               再将当前整手倍率乘以1.5（如倍率4→6）。
//               不用先达成过关赠品条件；被封禁计分时暂停。
```

1. 未点击的商品信息区直接绘制 `bonus.shelf`。不通过推荐星级传达该加成。
2. ShopScene 现有 `jokerEditionSummary` 保留调用方，只替换返回值：

```diff
- return '版次：'+editionEffectText(edition).split('。')[0]+...;
+ return jokerExtraBonusCopy(edition,{definitionId,chapterDisabled:this.run.chapterDisabledJokerId===definitionId}).detail;
```

3. `createShopIdentityTags` 的标签和 title 使用相同接口，避免硬编码旧解释：

```diff
- label.textContent='版次 · '+editionLabel(edition);label.title=editionEffectText(edition);
+ const bonus=jokerExtraBonusCopy(edition);label.textContent=bonus.shelf;label.title=bonus.detail;
```

这些场景与标签消费者仍由商店 owner 接线；本分支没有覆盖其并行文件，也不宣称当前货架已接入。无共享弹窗接口变更。已有 `editionLabel` / `editionEffectText` 调用合同保持兼容。

## 验证

`npx vitest run tests/joker-extra-bonus-copy.test.ts tests/c01-score.test.ts tests/c02-economy.test.ts`：**3 文件 / 76 项通过**；`npm run typecheck` 通过。

新增回归检查四种原标签和直白运算文案、封角暂停、普通高牌下 c12 的真实倍率 1→1.5 / 分数 22→33，以及封禁后回到 22；另核对赠品原合同。配合既有 `c01-score` / `c02-economy` 验证实际运算顺序和过关赠品。不写 UI 截图或上线验收结论，货架/详情实际截图由接线 owner 在同版补齐。
