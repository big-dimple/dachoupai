# P1-J：共同Joker四卡原型

## 正常入口/UI review 接线（PR25，2026-10-05 UTC）

在main193c93b独立正常合入PR22 e2fc57c与PR24 36eff49；本UI批六角色正常新局共用上述e7d21身份，仅阿默启用助攻。默认createRun仍v11，旧v10/v11/843f及新combo同种子重试按精确version/hash/角色/种子/模式直接创建，继续/导入/接管/无尽沿原局。商店预览、牌桌/持有/窄条件、AI缓存与已保存回看读当前局resolver，四卡领域规则和hash未改。本批仅review，main尚未发布此共同原型；下方“仅显式领域/未接UI”是PR24当批历史边界。

有限UI与自然经营结果见[evidence](evidence/p08-combo-growth-ui-2026-10-05/summary.json)：自然二响6金买d12、三A553/实际留5收5金并保存刷新；另7个受控正反例明确不作自然取得或平衡证据。132files/2377tests与现有门禁冻结通过，原FAIL保留，最终精确draft CI以PR25交接为准。

状态：**review 候选 / 仅显式领域原型 / 最终门禁与独审以 evidence 为准 / 未main**。产品基线193c93b，正常带入计划PR23的0502ff0。普通生产新局入口保持已发布合同，本批不接UI、不改其他五角色能力、不改美术。

当前源码提供 `r2Profile: 'combo-growth-v1'`，内容版本 `quality-r2-combo-growth-prototype-v1`，hash `json-fnv-v1:e7d21fce68b80072`。六角色共用同一不可变Joker overlay：继承843f改善的七卡，再替换a06/f10/d12/e04；其余定义保留原对象。阿默沿助攻机制，仅阿默保存assistUsed/assist消费集合；其他五人沿v11角色能力。v10/v11/843f完整身份、定义与普通入口保持，未知/混配拒绝。

|卡|原型合同|
|---|---|
|a06 独家戏，稀有8金|初始系数3/2；两对及以上在本槽乘当前系数。每场首次相邻两次出牌均合格且牌型不同，afterHand系数×23/20，下次生效；每场一次、跨场保存、封顶1000000。进场仅重置alternationUsed与上一手型，重买新实例；致胜手和计分封禁仍可成长。|
|f10 冷场救火，稀有8金|本场未出牌、首次成功弃牌且弃前公开当前手牌凑不出两对及以上，才武装rescueArmed。下一实际出牌合格则本槽×3，否则作废；被封禁也消费，后续弃牌不叠加、不重武装。唯一evaluate含c08/c09、分类保失效牌语义，不读未来牌/RNG/预测分。|
|d12 留点悬念，特别6金|合格主手致胜且补牌前实际held≥4，每张1金封顶6；3→0、4→4、5→5、6及以上→6。主手、附带、助攻消费不算；停用但真留牌仍算。成功clearId一次，跳场/失败无奖励。|
|e04 滚个零头，特别6金|成功clear时按统一goldBeforeRewards每10金给1金封顶6；替代旧利息cap+2。基础利息/U04保持，其他过场收入不抬本金，未来燃金先扣真实钱。|

合格集合共用：两对、三条、顺子、同花、葫芦、四条、同花顺、五条、同花葫芦、同花五条。B06/B15/B16仅封Joker计分/版次；a06成长与d12/e04经济保留；B08/Q01沿角色禁用合同。所有新计数器按新定义严格必需，旧身份不接受；倍率成长是精确有理数乘法，非加法成长。shop/score/copy/checkpoint使用profile resolver；新四卡copy只改纯文案函数，不占场景和选择布局。

历史首检查点（f45eb0b，旧 WIP hash `82a7532298315dde`，当前不接受）：typecheck通过；123项相关检查通过，另新补相邻两手成长、重复commandId与下一场次数重置，四卡专项13项通过。首次新测试FAIL来自测试样本含undefined，未进入保存解析；修为实际旧身份混配反例后通过，不能算产品缺陷已修。当前仍待：奖励来源完整性/缺失事件与损坏保存检查、所有首次/返次/售出重买/Boss边界、三旧身份完整冻结回放、失败保存同候选重试及分区恢复、有限经营对照、最终精确CI。后续按真实结果补证据，不用此检查点冒充平衡、自然获得、普通UI可玩或真机通过。

## 保存与纯 facts 合同

只从显式 `createRun({r2Profile:'combo-growth-v1', ...})` 或完整 version/hash 身份创建。生产普通入口仍保持既有身份。`r2JokerDefinitionsFor(state)` 是 shop、奖励工厂、计分、纯文案和保存的共同来源；S06 孤注创建当前 profile 实例，池与价格也携带身份。四卡新计数器是各自定义的必需字段，旧定义不接受；新 profile 也不接受最初 WIP hash。

- `stage.openingDiscard` 是新 profile 必需字段，初始为 null。持有 f10 且未出牌的首次成功弃牌保存弃前公开 `hand`、顺序 `discardedIds` 与 `jokers`。资格从这个已保存来源用同一 evaluate/c08/c09 分类验证，不读未来牌。武装状态不能仅靠改布尔值恢复，实际进下一场才移除旧来源。
- `lastTrace.combo.goldBeforeRewards` 是新 profile 必需字段：未过关为 null，真正过关为全部过关奖励前的共同本金。e04 事件的本金必须与它一致，完整过关金币流水、stage.goldEarned 与即时结算余额闭合。
- a06 的 `read-coefficient` 与 `multiply-coefficient`、f10 的 `rescue-multiplier` 与 `consume-rescue`、d12/e04 的对应收入事件按各自 source、phase、条件、数值、次数与结果白名单校验；版次例外必须匹配真实实例的版次、效果和唯一顺序。缺失必需收入也拒绝。a06/f10 当前仍存实例与上次 trace 的结果绑定，商店卖出可移除旧实例，新买实例从初始状态开始。
- 阿默继续使用既有 `r2AssistFacts`：主手 played / activeScoring / assistConsumed / held 分离。新四卡只消费这些事实，不给 UI 新增判型或预测计分器。`jokerAbilityCopyForRun` 提供身份绑定的纯文案，实际 trace 将计分、成长、消费和收入分别表述；已合入 I 审过的 +0 / ×1 文案，不改旧版本语义。

## 有限证据与边界

`tests/combo-growth.test.ts` 覆盖六角色共享身份、S06 实际发牌、成长、冷开局来源、四卡伪造本体/版次、缺失收入、奖励本金、活体系数和必需计数器。v10/v11 原冻结档及从未载入本原型代码的发布 193c 源码新生成 843f fixture，逐完整 state / RNG / receipt / journal / checksum 回放。

`harness/combo-growth-save.mjs` 用系统 Chromium 原生 IndexedDB 和生产 SavedRun，分别在 a06 成长、f10 武装/消费、d12/e04 收入制造事务 quota abort；验证状态/持久层回滚、pending 严格解析、暂停新命令、同一候选重试和重复命令不重写。覆盖六角色、四完整身份同模式发现、重载/导入导出、损坏 current+previous、跨身份 backup 拒绝与损坏原文保留。四个受控同起点对照展示立即葫芦与花一手成长、弃牌救火与先打高牌、保留4牌收益与消费对子助攻、30本金与真实花10金买组件。它们是规则/保存样板，不是自然获得、长期平衡或策略优劣结论。

原反例 FAIL 保留在 `evidence/p1-j-combo-growth-2026-10-05/`。首原生样板错误把 pop 牌堆当 shift，真实拒绝 unknown-card；只改样板排列后通过，不改领域补牌规则。最终冻结源码、全套门禁和精确远端 CI 在同目录 summary 中登记；未接新 profile UI、未main，玩法平衡、自然取得、真机/GPU/听感与其余五角色后续改造均未验收。
