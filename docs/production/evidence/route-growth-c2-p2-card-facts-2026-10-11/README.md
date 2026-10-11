# PR121 前面主手 cards/rules 一致性返修

2026-10-11 UTC，原候选精确 HEAD `166022277aed2180361d18627b76b9377266c64a`。本轮按父独审指令先实际复现，再报告最小范围后修正；保留同一 draft PR121，不合 main、不部署、不做自然完整试玩。

## 原缺陷确实可恢复并兑现

使用原 `p2-recovery.json.crossStage.before`：seq13、本场三手 high-card。只把首 source 的 `hearts-3.rank` 从3改2、首 handType 改 pair、eligible 改G，再重算原checksum；command/receipt/journal/末trace/真实deck不动。原 HEAD 接受该档。随后直接出**档中实际持有**的 `3♠/4♠/5♠/6♠/7♠`，没有重排牌区、改deck或植入新Joker：合法对照清场为 `clears2/G1/S1/F1`，异常档为 `clears2/G2/S1/F1`，异常后档也能冷恢复。

完整输入、异常输入、恢复及实际兑现保留在 [before-fix-reproduction.json](before-fix-reproduction.json)。这与真实deck的 `hearts-3.rank=3` 冲突；原9反例没有覆盖source cards/rules编辑。原有限独审回执保持其历史范围，不能据此声称本缺口曾验过。

## 最小修复及权威依据

仅产品 `src/domain/r2Run.ts`：两个小型事实检查、读取/事务末不变量接入，以及C2清场兑现前再核。数值、family、成长时钟/位置、Joker定义、身份和保存字段完全不改；没有新增hash字段、签名、旧档迁移或禁用导入。

- `routeCardsMatchDeck`：当前场（stage.index等于stageIndex）及刚清场/胜出时，所有来源完整card记录须与现存真实deck同ID实例相同；不只重判source自身。已出/已碎的牌仍有持久deck实例，碎牌仅改destroyedIds和区位，不改其牌事实。
- 场内普通及可用灵感牌改牌仅以handOrder为目标，已经出过的主牌不能再改。整副染色/清增强只在shop允许；shop之后的历史stage保留原快照，不能无条件倒比后来合法改过的deck。
- `routeRulesMatchTrace`：本场所有来源的fourStraight/fourFlush须等于末次实际scorer的 `trace.sourceJokers` 按真实定义读取的modifier。提供成型规则的c08/c09为静态库存modifier，无场内自毁hook，增删仅在shop；排序、封禁和成长不改变这些规则。末trace保存原scorer输入，下一店卖规则牌后也不拿新库存反改旧场。
- `settleRouteClear` 在加N之前再次核牌和规则事实；即使直接给纯领域API传损坏内存，清场返回score-diagnostic，保留原输入，不发布非法G。

源码依据：`r2ToolCommands.ts` cards目标在场内限定handOrder；`r2SpectralTools.ts` known目标同样限定handOrder；`r2Tools.ts`验证S04整副染色、S06新增稀有、S07牺牲Joker、S08清增强均shop-only；`r2-jokers.json`/`r2Schema.ts`提供c08/c09静态规则，`scoreR2.ts`不会销毁这两张规则牌。OpenShop保留旧stage，EnterStage才重建牌区并清空本场来源。

这只是保存内部一致性：与当前权威deck、本場实际规则源及原命令回执交叉验证。不承诺抵抗整份deck、规则源、trace、命令/回执、结算账同时重造；没有离线防作弊或秘密签名承诺。前述shop后的历史来源不强行等于新deck，是合法阶段变化，不是取消导入检查；原来源/入场/trace/结算账检查仍执行。

## 实际对照和检查

[after-fix-evidence.json](after-fix-evidence.json)保存完整/空/仅末条journal三份新异常档及拒绝结果、合法直接清场、场内实际T08使用与非法已出牌目标、下一店实际T08改旧牌、c08真实四张顺子清场→卖c08→新场四张仅高牌，以及原9异常重核。可用同目录[有界导出](export-card-facts-evidence.mjs)复算；工具库存及指定主手夹具明示受控，不是自然取得认证。

- 9文件205项受影响测试PASS，15:03:01 UTC起3.81s：原C2六文件、新增facts、普通道具和灵感牌两组。新6项各有实际输入/结果，不镜像实现；包含source rank/suit/enhancement/edition、rules单改及四张S成套规则编辑，合法场内/跨店变更及直接兑现防线。
- 首轮7文件168项为167PASS/1FAIL；新增规则对照的首手已清场，夹具仍出第二手导致wrong-phase，按实际清场修正夹具，产品没有为该FAIL改规则。最终7文件168项先PASS，再因加入直接清场防线及原C2两组保护扩大到最终9文件205项；范围不相加冒称独立总数。
- 作者有界导出：新3异常及原9异常均拒绝；合法增长保持 `G1/S1/F1`。type及最终计划检查按各自日志登记。
- 原166 HEAD的3103项、Chromium双端smoke及远端CI属于原候选，不代签本返修。按父要求不为状态重跑全部；本轮领域小补丁以受影响检查及真实恢复/命令证据收口，新精确HEAD标准远端CI及父独审另核。

原C2文件中“合法later deck edit”测试原来直接在stage-cleared手写rank，绕过真实阶段合同；已改为实际OpenShop→T08用牌，并保留历史source原rank，不靠非法夹具证明正常改牌。

自然18实玩、经营可达、整体平衡、真人/设备/听感/美术仍OPEN。没有动PR118/119/120、阿默交互、推荐算法或失败页开发；本轮只补被实证的cards/rules缺口。

最终typecheck/content/production-plan均PASS；docs runner检查前后source/index/HEAD相同。完整日志随本目录保存，当前提交前哈希清单在[manifest.json](manifest.json)；新提交与远端CI以同一PR最终HEAD为准。

可读测试日志只移除末尾多余空行以满足diff检查；原日志完整字节与原标准diff的空白行均保留为 `.raw.gz`，原始SHA在manifest记录，未隐藏或改写失败内容。
