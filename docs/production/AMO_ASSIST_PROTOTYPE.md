# 阿默主手＋助攻领域原型

本批仅领域 / application 保存 / platform 验证及必要测试；不接 UI、不推进 main。来源为已发布 main `8e0daae74efd56969886d1fdb2c28df404af27e0` → 计划 `ec506b4658ae726661b939b8d9385f4f112282ad` → 未完成 WIP `2328587e6823450c1da503f70aa30d2464e6fb62`，不是旧美术或旧单张倍率任务的重复交付。

## 已决原型合同

- 显式 `createRun({rulesVersion:'r2',characterId:'amo',r2Profile:'amo-assist-v1',...})` 创建新身份。现有无 profile 的入口仍建 v11；没有 UI 上线。只有阿默可选此原型，其他五人未实现。
- 主手 1–5 张，唯一 `evaluateR2Hand` 判型。两对、三条、顺子、同花、葫芦、四条、同花顺、五条、同花葫芦、同花五条合格。对子/高牌正常出牌，无助攻；新 profile 不赠高牌 Lv3、不做单张 ×3。
- 副组必须是剩余可见手牌中恰好 2 张同点对子或 3 张同点三条，全有效、实例互斥。暂定 ×2/×4，在整手 Joker（含版次）后、唯一 final floor 前。B03/B04 主手仍按原判型/失效语义，不增全主手有效要求；B08/Q01 拒绝助攻，不能白筛。
- 每场一次；成功领域候选消费 `stage.assistUsed`，保存成功后才对外发布。返手、救场、普通手、弃牌、整理、重载、重复 commandId 不恢复。成功过场/商店仍保存旧场额度，真正 EnterStage 才创建下一场额度。SkipStage 只建不能出牌的跳场记录，不能取得可用助攻。
- 主/副按起手顺序一起移入既有 `playedPile`（本场已用区）；副组不算主手/弃牌/持牌，不触发牌点、强化、版次、随机、重触发或弃牌 hook。仅一次出牌、playIndex、afterHand、寿命和救场。非过关手从原 drawPile 尾部补满，缺牌沿原合同；不隐藏洗牌。已过关不额外补牌，仍保原合同。
- A 系单张卡/高牌卡与 72 池原定义完整保留，合格主手不会冒领单张条件。A 系新 profile 报价/推荐/条件适配是正式上线前阻塞项，尚未实现。×2/×4 只是原型占位，不是平衡结论。

## 给后续单一 UI 写窗口的最小接口

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

新 version 为 `quality-r2-amo-assist-prototype-v1`，hash 由冻结 v11 身份及明确助攻合同计算。混配/未知身份拒绝。schema2 按 profile 严格解析：新阶段必须有 boolean assistUsed、新 trace 必有上述字段；旧阶段/trace 拒绝新字段，旧命令/trace/receipt 不补写。新字段不是所有旧保存都接受的宽松 optional。

保存沿原 pending candidate 原子事务，不重新 apply；receipt 指纹、journal、checksum、真实牌区、保存导入均交叉验证。截断 journal 不凭缺失历史恢复额度；可见 journal 中同场重复助攻、trace 与命令不符拒绝。三 profile 各自分区；继续同模式优先当前活跃身份，坏 current 仅可退回同身份 previous，两者都坏时不偷切另一规则。原始损坏记录按已有 retained 合同保留。

真实 v10 fixture 原文件不动。新 `tests/fixtures/r2-v11-amo-checkpoints.json` 是在独立 published checkout `04d2f729...` 上重放同一受控可见手（计分前选择 v11），由旧构建导出的 before/command/after；不是把新 resolver 结果贴成旧证据，也不是自然局。

## 有限决策证据与验收边界

专项覆盖 `99KKQQ67` 主99KK+助QQ的消费/补牌、顺子占用9与99副组的交集拒绝、候场席与d03持牌损失、完整葫芦不拆组更高且保留额度、三条助攻、全部10种合格主型、B03/B04、B08/Q01、返手/救场/寿命、缺牌、重复/失败保存与旧局原输出。它们证明合同与存在保留额度的合理决策，不证明所有副组代价已平衡。

原生保存专项：`node harness/amo-assist-save.mjs`，真实 Chromium IndexedDB，无 UI、录屏、FPS 或策略模拟。最终证据位于 `docs/production/evidence/p08-amo-assist-domain-2026-10-05/`。UI、六人玩法整体、A 系适配、平衡、OnePlus/真实 GPU/听感均未验收；main 仍需父串行放行。
