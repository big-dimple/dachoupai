# 阿默主手＋助攻领域原型

## 2026-10-05 正常新局入口 review（PR21，覆盖下方历史“未接UI”状态）

基线d1dfb90已含完整显式助攻UI，本批仅接正常Title→CharacterSelect→runAdapter.startRun→GameSession.start：阿默新局读取现有amo-assist-v1精确version/hash，其他五人v11；未传profile/identity的底层createRun默认v11不变。RunLaunch明确区分new/retry，重试必须是当前局，校验原seed/角色/mode，StartRun用r2Identity白名单直接创建v10/v11/助攻，不建后篡改。身份/数值/七卡/旧fixtures/全局characters/保存格式保持。继续、导入、接管、无尽不调用新局政策。

选角、详情使用characterForNewRun，与实际启动策略同源；阿默“主手＋助攻（试行）”说明每场一次、副组真消费、合格主手与高牌对子兜底。BuildTip独立覆盖旧单张建议。新建保存失败仍只保一个pending候选，不先换当前指针。原型version quality-r2-amo-assist-prototype-v1 / hash json-fnv-v1:843f02356211cb91不变。

自然路线与原FAIL见[evidence](evidence/p08-amo-launch-recovery-2026-10-05/)。仍为draft review；父独审决定main。下文旧领域/UI边界按各自source保留，不视作本批新结论；不宣称六角色玩法/平衡/真实设备通过。

本批仅领域 / application 保存 / platform 验证及必要测试；不接 UI、不推进 main。来源为已发布 main `8e0daae74efd56969886d1fdb2c28df404af27e0` → 计划 `ec506b4658ae726661b939b8d9385f4f112282ad` → 未完成 WIP `2328587e6823450c1da503f70aa30d2464e6fb62`，不是旧美术或旧单张倍率任务的重复交付。

## 已决原型合同

- 显式 `createRun({rulesVersion:'r2',characterId:'amo',r2Profile:'amo-assist-v1',...})` 创建新身份。现有无 profile 的入口仍建 v11；没有 UI 上线。只有阿默可选此原型，其他五人未实现。
- 主手 1–5 张，唯一 `evaluateR2Hand` 判型。两对、三条、顺子、同花、葫芦、四条、同花顺、五条、同花葫芦、同花五条合格。对子/高牌正常出牌，无助攻；新 profile 不赠高牌 Lv3、不做单张 ×3。
- 副组必须是剩余可见手牌中恰好 2 张同点对子或 3 张同点三条，全有效、实例互斥。暂定 ×2/×4，在整手 Joker（含版次）后、唯一 final floor 前。B03/B04 主手仍按原判型/失效语义，不增全主手有效要求；B08/Q01 拒绝助攻，不能白筛。
- 每场一次；成功领域候选消费 `stage.assistUsed`，保存成功后才对外发布。返手、救场、普通手、弃牌、整理、重载、重复 commandId 不恢复。成功过场/商店仍保存旧场额度，真正 EnterStage 才创建下一场额度。SkipStage 只建不能出牌的跳场记录，不能取得可用助攻。
- 主/副按起手顺序一起移入既有 `playedPile`（本场已用区）；副组不算主手/弃牌/持牌，不触发牌点、强化、版次、随机、重触发或弃牌 hook。仅一次出牌、playIndex、afterHand、寿命和救场。非过关手从原 drawPile 尾部补满，缺牌沿原合同；不隐藏洗牌。已过关不额外补牌，仍保原合同。
- 旧 v10/v11 的 A 系单张卡/高牌卡与 72 池原定义完整保留。新 profile 仅按下节适配七卡，其余65卡不变；报价/掉落/美术不变。×2/×4 只是原型占位，不是平衡结论。

## 新 profile 七卡适配（2026-10-05）

正常合入已发布 AI切 main `a5cdc5fcb6394b229ad609104d970de3fa460bb7` 的 review 中间点为 `1d8400db2f1667992a13024bf7530ed7615e1a71`；七卡第一代码检查点为本地 `3acc73906c12730b67b721cc93e57d619317a4f3`。默认新局仍为 v11，本原型尚未接 UI。

|卡|新原型规则|
|---|---|
|pengci|主手精确三条，整手倍率 +2；副组三条不算。|
|a03|合格主手的首张有效计分牌热度 +15；逐张阶段，合法重触发可重复。|
|a05|既有成长每手读取；相邻两手为同一种合格主手，afterHand 成长 +6、封顶90、下一手生效；一次正式手只更新一次。|
|a06|前后两手均合格且不同型，整手倍率 ×1.5；首手／前手对子或高牌不满足。C11原普通顺子↔同花×1.75保持。|
|a10|先排除副组和停用牌，再按手序找首张 J/Q/K，持牌阶段倍率 ×1.25；前面的小牌不阻断，不限主手张数。|
|a11|主手葫芦／同花葫芦，每张有效核心额外重触发一次；副组不触发，原每牌额外4次／深度1／事件512上限保持。|
|a12|全场成功出牌的主手都≤4张，过关+3金；副组不计入，任何5张主手破坏资格。|

复用已保存的 `previousHandType`；只新增纯条件 `hand-type-relation {values,relation:'same'|'different'}`，不新增持久任务状态。A04/A07/A08不动，A09仍为≤2张倍率+1的对子过渡，不推荐为助攻主构筑。旧模板JSON和旧72定义逐字节保留。新原型 trace 对七卡的时点、条件、固定值、目标及成长变化按本 profile 校验，旧局不接受新增连续条件。

## 给后续单一 UI 写窗口的最小接口

定义统一从 `src/domain/r2ContentProfiles.ts` 的 `r2JokerDefinitionsFor(run)`（72张）或 `r2JokerDefinitionFor(run,id)`（单张）取；二者只接受精确 `contentVersion + contentHash`，无默认回落。玩家文案统一从 `src/game/JokerMemory.ts` 的 `jokerAbilityCopyForRun(run,id,instance,ctx,events?)` 取；内部复用新七卡模板、其余65卡和旧profile原模板。使用 `publicJokerMemoryContext` 构造 ctx，助攻草稿传 `r2AssistFacts` 作为 `ctx.facts`，实际记录使用 `recordedJokerMemoryContext(ctx,trace.bossContext)` 和 trace.events；不把提交后的 previousHandType 当本手之前的历史。

B单一UI窗口须切换 GameScene 的大丑牌详情、完整构筑、条件说明、AI切输入 definitions、selection/assist facts，以及 ShopScene 的购买／持有详情。`getR2Joker(id)` 和全局 `R2_JOKERS` 仍是已发布定义，不能用于新原型的效果和文案。名字／稀有度／美术／价格不变。本批只交纯函数，不修改这些 Scene。测试策略读取公开 run 的精确 profile；未增加策略模拟或助攻自动决策。

`r2AssistAvailability(publicRun)` 只读当前 profile、角色、phase、Boss/模式和 assistUsed，返回 `{available,remaining,reason?}`。busy / pending 保存仍以 `SavedRun.status` 为准，不能把纯领域资格当保存许可。

`r2SelectionFacts(input)` 保持原主手合同。`r2AssistFacts({...input,assistIds})` 只接受可见 hand、selectedIds、assistIds、disabledIds、当前静态 Joker 定义/规则，不读 RNG、未来牌、预计分、命令或 journal。返回主手原事实及：

|字段|语义|
|---|---|
|`playedIds`|主手，仅它参与判型、played-count、rank-groups、maxPlayedCount、章节牌型历史。|
|`scoringIds` / `activeScoringIds`|唯一判型核心 / Boss 筛后有效核心。|
|`assistConsumedIds` / `assistIds`|副组本身，2 或 3 个实例，原手序。|
|`heldIds`|从完整起手去掉主手及副组后剩余。|
|`consumedIds`|主手与副组总消费，原手序；与上行副组集合不同。|
|`assistKind` / `assistMultiplier`|pair/three-kind 与暂定 2/4。|

提交 `{type:'PlayAssistedHand',selectedIds,assistIds}`（外层沿原 runId / commandId / expectedSeq）。非法输入整笔返回原 state，无 RNG/seq/资源推进。默认普通 PlayHand。取消、撤销、手改及 AI 切仅属于后续 UI 草稿，不新增取消命令。

新 profile 的每条 score trace 必有 `assist`（普通手为 null）及 `sets.assistConsumedIds`（普通手为空）；助攻时 `assist={ids,kind,multiplier}`。`cards` 仍保完整起手快照。唯一角色倍率来源为 `sourceType:'character'`、`sourceDefinitionId:'amo'`、`sourceInstanceId:runId+'/character'`、`reasonKey:'amo.assist.pair'|'amo.assist.three-kind'`。紧接其后是 finalScore；副组没有伪造 card source。`hand-scored-r2.playedIds` 仍只含主手，后续 UI 从持久化 trace 取副组。

## 身份和保存

`r2PublishedContent.json` 来自真实已发布 `04d2f729bbe37d7e34783f4a2a81b9026ff98a64`，冻结 v10/v11 完整内容合同、Joker 定义、基础分与初始等级。v10 hash `json-fnv-v1:24efe7a905216d85`，v11 hash `json-fnv-v1:bd4a1230833ab884`。共用资源/商店/工具定义仍有原调用，新增 shared runtime hash guard；未来未经 profile 分派的公共定义漂移会明确拒绝启动，不能静默沿旧 hash 换规则。

新 version 为 `quality-r2-amo-assist-prototype-v1`，当前 hash `json-fnv-v1:843f02356211cb91` 由冻结 v11 身份、明确助攻合同及完整七卡 overlay 定义计算。混配/未知身份拒绝。未发布的前版原型 hash `json-fnv-v1:79ddb0bb71434f9f` 不再兼容，必须新建原型 fixture；不迁移或覆盖旧 evidence。schema2 按 profile 严格解析：新阶段必须有 boolean assistUsed、新 trace 必有上述字段；旧阶段/trace 拒绝新字段，旧命令/trace/receipt 不补写。新字段不是所有旧保存都接受的宽松 optional。

保存沿原 pending candidate 原子事务，不重新 apply；receipt 指纹、journal、checksum、真实牌区、保存导入均交叉验证。截断 journal 不凭缺失历史恢复额度；可见 journal 中同场重复助攻、trace 与命令不符拒绝。三 profile 各自分区；继续同模式优先当前活跃身份，坏 current 仅可退回同身份 previous，两者都坏时不偷切另一规则。原始损坏记录按已有 retained 合同保留。

真实 v10 fixture 原文件不动。新 `tests/fixtures/r2-v11-amo-checkpoints.json` 是在独立 published checkout `04d2f729...` 上重放同一受控可见手（计分前选择 v11），由旧构建导出的 before/command/after；不是把新 resolver 结果贴成旧证据，也不是自然局。

## 有限决策证据与验收边界

专项覆盖 `99KKQQ67` 主99KK+助QQ的消费/补牌、顺子占用9与99副组的交集拒绝、候场席与d03持牌损失、完整葫芦不拆组更高且保留额度、三条助攻、全部10种合格主型、B03/B04、B08/Q01、返手/救场/寿命、缺牌、重复/失败保存与旧局原输出。它们证明合同与存在保留额度的合理决策，不证明所有副组代价已平衡。

原生保存专项：`node harness/amo-assist-save.mjs`，真实 Chromium IndexedDB，无 UI、录屏、FPS 或策略模拟。最终证据位于 `docs/production/evidence/p08-amo-assist-domain-2026-10-05/`。UI、六人玩法整体、七卡交互推荐与平衡、OnePlus/真实 GPU/听感均未验收；main 仍需父串行放行。
