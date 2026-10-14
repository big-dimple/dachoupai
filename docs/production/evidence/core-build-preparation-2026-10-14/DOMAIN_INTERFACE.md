# PR178 领域接口，供商店线程接入

父已确认：普通八章目标/封×4保持；无尽27/20逐章；服务报价4+2×floor((等级−1)/3)、原优惠最低1金，与改牌/染色每店共享一次；随机与库存T01不变。新局身份 `quality-r2-core-build-v1` / `json-fnv-v1:6dfe1a721e4949e6`。领域分支不改ShopScene/GameScene/结算/声音。

```ts
import {isR2CoreBuild} from '../domain/r2GroupUpgrade';
import {r2PracticeQuotes} from '../domain/r2Practice';
import {r2ChapterTargetPreview} from '../domain/r2Run';
import {r2TargetPolicyFor} from '../domain/r2TargetPolicy';
```

`r2PracticeQuotes(run)` 是无写入查询，返回已发现且未30级的全部牌型，每行包含 `handType, levelBefore, levelAfter, basePrice, price, goldAfter, shopSeq, expectedSeq, available, reason`。金额不足仍返回该行及 `reason='not-enough-gold'`，不能用买不起冒充未发现。非新身份、非商店或本店额度已用返回空数组。取消/查看不发送命令，不占额度。已有工具库存容量不影响这个立即升级服务。

确认一行q发送原SavedRun入口：

```ts
{type:'PracticeHand',handType:q.handType,expectedLevel:q.levelBefore,shopSeq:q.shopSeq}
// command.expectedSeq 使用 q.expectedSeq；按原 send(action, expectedSeq) 提交。
```

确认即原子扣款/优惠券消费/升一级/本店额度消费；不往道具箱添加T01、不额外使用道具。成功返回一个真实领域事件：`{type:'hand-practiced',handType,levelBefore,levelAfter,paidPrice,goldBefore,goldAfter}`。UI只在保存成功后消费它。重复同commandId返回原重复回执；保存失败未发布，retry复用同候选，不重新计价。报价后等级变化拒绝 `stale-practice-level`，序号变化按原 `stale-sequence`；旧店为 `stale-shop`；已选基础工具为 `basic-choice-consumed`；未知牌型为 `undiscovered-hand-type`；30级为 `hand-level-cap`；不足金币为 `not-enough-gold`。

共享额度仍是 `run.shop.basicChoice`，练级成功的purchase含 `definitionId:'T01',handType,levelBefore,commandId,paidPrice,seq`。普通改牌/染色原purchase字段不变。练级成功后基础/染色不可买；先买基础/染色后练级不可买。刷新不重开，下店重置。随机T01现货购买与持有工具使用仍沿原价格/库存/效果，不占服务额度，也不应用阶梯价。

`r2ChapterTargetPreview(run)` 返回保存的克隆 `{policyVersion:'core-build-target-v1',chapter,targets:[暖,正,压],boss}`；旧身份返回undefined。筹备店创建之前已生成此快照；本章后两店、任何采购/改牌/爆分/恢复都保持同一快照。`getR2Stage(index,tourMode,difficulty,run)` 已按新身份读取对应目标，当前章直接消费锁值；B14按initialTarget增量、无复利。C9三目标27642/41462/55283，C10为37316/55974/74632。

无尽确认文案须改读 `r2TargetPolicyFor(identity).multiplier`：新身份27/20、bounded旧身份11/10、其他原身份12/5。现有 `EndlessContinuationCopy`仍用旧分支读取，领域未跨界修改它，请显示线程接同一reader，否则新局会误显示1.1倍。无需新菜单、曲线选择或按手得分重算。

商店线程 `01a13ab2-ba3c-74c8-8156-77c85990003b` 可使用本接口；父最后集成同一个新身份和保存合同。软件领域通过不代签UI原生链、自然三路线终态、设备或听感。
