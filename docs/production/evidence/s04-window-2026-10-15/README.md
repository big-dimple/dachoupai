# S04同版受控数值证据

来源候选：`4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`。取舍、推荐与待批准合同只写回[既有S04条目](../../DELIVERY_PLAN.md#整体数值窗口待完成任务独幕s04的获取与改造取舍)，本页只说明证据与复算，不另建计划。运行`src`与候选逐树相等，无部署、合main或PR创建操作；没有自然试玩或18路线重跑，C04暂停包不动。

已读仓库`AGENTS.md`与现行DELIVERY_PLAN/CONTENT及相关规则；`/workspace/.agents`、`/workspace/.codex`为空，仓库没有`.agents/skills`或本地`SKILL.md`。按本次明确授权串行完成离线方案，不把AGENTS历史任务专属文件窗口当作本任务指令。没有使用需要外部技能的文件/站点创建流程。

## 证据索引与身份

- [执行模型](../../../../analysis/s04-window.ts)、[runner](../../../../analysis/s04-window-run.mjs)、[边界测试](../../../../tests/s04-window.test.ts)。沿已有纯规则工具的esbuild临时打包方式，直接调用`createRun/applyCommand`、真实计分/预览/资源/供给与培养函数，无新依赖。
- [完整结果](results.json.gz)：JSON解压后含`baseSha/runtimeTree/analysisHash`、新局实际身份、原始首店货架、每次获取前后/实付/改牌ID、逐场预算/选择/弃牌/真实分数/成长/过关或失败；有所有选牌类型的当手最优预览，便于核转向和取舍。
- 身份核验：正常入口为`quality-r2-core-build-v1 / json-fnv-v1:6dfe1a721e4949e6`；继承bounded封×4/取最高一次。另独立BigInt逐项核G/S/F因子，核前八章24目标和共同计分输入相同。core的培养和无尽×1.35仍按自己身份读取。
- [规则与分析边界检查](rule-checks.txt)、[类型检查](typecheck.txt)、[逐字节复算](reproduction.txt)、[计划结构检查](plan-check.txt)。旧`analysis/scoring-calibration`的f23c基线/指数公式/报告完全未动，也未导入本次模型。

## 实验口径

两个种子`s04-public-window/A`、`s04-public-window/B`在第一轮运行前写死，均保留，无搜索、替换或败后重试。156个**受控比较窗口**由同一组输入配对组成，不能当156个独立随机样本：

| 结果字段 | 窗口数 | 作用 |
| --- | ---: | --- |
| `windows` | 72 | 三路线×index0/6/12×两种子×无S04/当前整副/仅延后/9张影子，每窗最多后续三场 |
| `bossPressure` | 36 | 第5章B05/B10，三路线×两种子×无/当前整副/9张影子，一场 |
| `preparedWindows` | 24 | 第3/5章，三路线×两种子×买/不买60%收尾；两边已实付相同七件染色 |
| `finalPressure` | 24 | 第8章B03/B05/B10，同花×两种子×买/不买×Lv3/实际付费培养至Lv5 |

英雄固定老幻但不使用戏法能力，隔离主动差异。普通52张、各13色；G持满堂彩+b10，S持c04，F持c06；初始等级1/成长0，中晚等级3/热度40或倍率2，发现全部牌型。这些持牌/等级/既往清场账及40/50金准备预算是**明示植入**，不是同预算经营路线，也不证明自然供给、现金、发现和养成可达。各同组只改变S04政策，晚取得不是把早窗口失败局救活后续演。

先对六个真实新局首店只读留货架，未出现也保留；随后成对实验另植入合法S04现货，沿现行购买/使用事务扣6金。不能把它叫随机真实取得。7件T03通过真实`BuyBasicTool/UseConsumable`支付28金、共改19张；各店的OpenShop收据/额度为植入，**不是**通过前面七场和赚到预算的命令回放。第8章Lv5只把同花由3→4→5，真实`PracticeHand`扣4+6金/两个不同额度，其它类型仍Lv3。两边同组预算相等；无S04分支保留6金与一格手牌，不自动替它买东西。

9张候选先执行现行S04事务，再在分析副本恢复未选牌花色；选择固定为公开最高点数的9张非红桃，不看之后牌序。60%/章门也是分析层资格判断，合格时复用现行整副事务。**都不是新规则实现、候选存档或候选UI验收**，不能把这些副本导入游戏冒称新身份。永久容量/扣款/卡ID/点数/增强/版次/顺序和输入不变均有断言。

后续场均真实`EnterStage/PlayHand/DiscardHand/OpenShop`：枚举当前公开手牌全部1–5张选法，取最低预览最高者；若当前最优分×余下手数不足余下目标，弃掉不在该选择中的最多5张，受真实3弃预算限制。无隐藏牌序读取、重排或强凑指定手牌。正常补牌、Boss、当手/下手成长、清场奖励实际执行；败即止，不额外补窗口。该贪心策略不是最优人类策略，尤其会漏掉提前规划顺子/存牌，失败不证明人类必败。

`flushAccess`是指定目标色至少5张的超几何精确枚举，**不是所有花色并集、实际清场率或自然频率**：13/52、8张手牌为1.741%；整副染后7张为100%；9张范围后22/52、7张为10.363%；已有32/52、8张为63.728%。分数全走当前有理数计分与最后floor，不引用旧f23c高分。

## 复算与原失败

从仓库根运行，无需浏览器或网络：

```sh
node analysis/s04-window-run.mjs --write
node analysis/s04-window-run.mjs --check
npx vitest run tests/s04-window.test.ts tests/bounded-clear.test.ts tests/c01-spectral.test.ts tests/core-build.test.ts
npm run typecheck
node scripts/check-production-plan.mjs
gzip -dc docs/production/evidence/s04-window-2026-10-15/results.json.gz > /tmp/s04-results.json
```

runner检查HEAD的src树等于指定候选，且没有未提交src变更；不相等即拒绝，防止旧结果签新规则。`--check`比较解压后完整JSON的每个字节，报告不使用运行时刻/随机临时目录。源码和runner合并hash在JSON中。

[首轮夹具失败](initial-fixture-FAIL.txt)：直接在事务外重建商店却未绑定其OpenShop收据，触发原`basic choice visit/receipt/quota`守卫；只为植入入口补明确收据，不改产品或削guard。[初轮类型失败](initial-typecheck-FAIL.txt)：分析评分输入重复传characterId，已统一沿真实`r2ScoreContext`读取。两项原FAIL保留；最终PASS另列。

方案评估已完成；具体数值尚待批准，规则实现、自然出现/可负担/未用/放弃、双端操作与玩家理解/整体平衡仍OPEN。B05一手清场未触发惩罚的窗口保留，不用“Boss存在”代签挑战有效；B03/B10和付费培养的成功/失败均据原样报告。
