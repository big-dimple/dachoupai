# 六张复杂代表：前后对照

审稿状态：草稿，尚未通过独立语义、运行时或界面验收，不能作为完成验收结论。
基线 `88b17e23c9aa778c8ac93c9998cd090ba48ab82d`。旧文案为按当前中央生成器源码复原的相关片段，不是截图采集。新数字为本次权威定义展开示例；实现必须使用 JSON 字段插值。

## a11 · 返个场

旧：计分牌逐张时：打出恰好1张，包括附带和停用牌。请求额外触发1次；实际执行受每牌上限与深度限制。

新主句：只出 1 张且这张牌能计分时，让它再计分 1 次。

默认可见：同一张牌的额外计分次数有总上限，见细则。

展开细则：这张扑克牌的点数、增强、版次及逐张计分加成会再算一次；角色和整手加成不会因此重复。牌被停用时不能再次计分。 所有额外计分效果合计，每张扑克牌每手最多再计分 4 次；先占满次数的效果优先。再次计分不会继续增加再次计分的次数。

机制证据：
- [src/content/r2-jokers.json:52](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/content/r2-jokers.json#L52)
- [src/domain/r2Conditions.ts:14-46](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/r2Conditions.ts#L14)
- [src/domain/scoreR2.ts:144-153,242-305](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/scoreR2.ts#L144)
- [src/domain/scoreR2.ts:307-327](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/scoreR2.ts#L307)
- [src/domain/scoreR2.ts:12,252,286-289,307-322](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/scoreR2.ts#L12)

## c08 · 少一级

旧：4张普通顺子；同花顺仍5张。持有静态规则；不计算整手收益。

新主句：普通顺子可用 4 张连续、点数不同的牌；同花顺仍要 5 张。

默认可见：A234能成顺子，QKA2不能。 同时有“少一块布”时，四张同花连续牌只算普通同花。

展开细则：五张顺子仍然可用。必须整组恰好四张或五张连续不同点数；选五张但只有四张连号不会套用四张规则。若同时有四张同花规则，四张同花连续牌判为普通同花。

机制证据：
- [src/content/r2-jokers.json:37](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/content/r2-jokers.json#L37)
- [src/domain/evaluateR2.ts:12-38](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/evaluateR2.ts#L12)
- [src/content/r2Schema.ts:163-177](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/content/r2Schema.ts#L163)

## c09 · 少一块布

旧：4张普通同花；同花顺仍5张。持有静态规则；不计算整手收益。

新主句：普通同花可用 4 张同花色的牌；同花顺仍要 5 张。

默认可见：同花葫芦、同花五条仍要五张；同时有“少一级”时，四张同花连续牌也只算普通同花。

展开细则：五张同花仍然可用。必须整组恰好四张或五张同花色；选五张但只有四张同花不会套用四张规则。最终仍按牌型优先级判断，例如四条优先于普通同花。

机制证据：
- [src/content/r2-jokers.json:58](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/content/r2-jokers.json#L58)
- [src/domain/evaluateR2.ts:12-38](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/evaluateR2.ts#L12)
- [src/content/r2Schema.ts:163-177](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/content/r2Schema.ts#L163)

## f05 · 越说越顺

旧：整手大丑牌时：每到这个时点检查；满足条件不等于效果已经发生。实际结算后：每到这个时点检查；满足条件不等于效果已经发生。读取已保存成长，作用于倍率。按实际本手比分记录成长，封顶4；选牌时不预测。

新主句：每手加上已攒的倍率；得分高过本场上一手，再攒 0.25，最多攒 4。

默认可见：没高过就把成长清零；新增或清零都从下一手生效。 每场第一手只记下分数，已有成长照常保留。

展开细则：比较本手最终得分与本场上一手最终得分，不比较累计总分；同分也清零。成长换场保留，只重置比较基准。

机制证据：
- [src/content/r2-jokers.json:47](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/content/r2-jokers.json#L47)
- [src/domain/r2Conditions.ts:14-46](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/r2Conditions.ts#L14)
- [src/domain/scoreR2.ts:144-153,242-305](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/scoreR2.ts#L144)
- [src/domain/scoreR2.ts:343-356](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/scoreR2.ts#L343)
- [src/domain/scoreR2.ts:271-280](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/scoreR2.ts#L271)

## f08 · 试试手气

旧：整手大丑牌时：每到这个时点检查；满足条件不等于效果已经发生。公共概率1/3，命中单项热度 +90；正式执行才检查随机。

新主句：每次出牌有 1/3 的机会加 90 热度，没中就不加。

默认可见：每手只抽一次；扑克牌再次计分不会多抽。

展开细则：在本牌的整手加成顺序轮到它时抽取；计分封禁则不抽、不加。预览、演出和回看不能改变已抽出的结果。

机制证据：
- [src/content/r2-jokers.json:70](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/content/r2-jokers.json#L70)
- [src/domain/r2Conditions.ts:14-46](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/r2Conditions.ts#L14)
- [src/domain/scoreR2.ts:144-153,242-305](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/scoreR2.ts#L144)

## e02 · 熟客券

旧：首购优惠1金币，最低1金币。持有静态规则；不计算整手收益。

新主句：提前持有时，每家商店的第一笔购买便宜 1 金币，最低付 1 金币。

默认可见：买这张牌的这一笔，不享受它自己的优惠。

展开细则：大丑牌、消耗品、长期道具都算购买；只有购买成功才占用首购名额。可以与其他首购或跳场优惠叠加；每次换牌不会重置这一家店的首购次数。

机制证据：
- [src/content/r2-jokers.json:42](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/content/r2-jokers.json#L42)
- [src/domain/r2Shop.ts:19-20](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/r2Shop.ts#L19)
- [src/domain/r2Run.ts:464-469](https://github.com/big-dimple/dachoupai/blob/88b17e23c9aa778c8ac93c9998cd090ba48ab82d/src/domain/r2Run.ts#L464)
