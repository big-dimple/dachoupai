# P1-J 成组升级四卡原型

状态：WIP 首代码检查点，独立 review，未main。基线 ac025ee9132dcd5e2ce97767ff7adb780873ab95；已通过授权 connector 逐52个差异 blob 校验并重建完整 tree a3ea7905530fb3d3e0b817f3987cf026c0d859b0。正常入口保留 e7d，场景与布局保持。

显式 profile `group-upgrade-v1`；版本 `quality-r2-group-upgrade-prototype-v1`；当前 hash `json-fnv-v1:5025cc23c013987f`。完整继承 e7d 四卡和六角色能力，仅替换 b03/b06/b08/b10。v10/v11/843f/e7d 定义/hash/初始等级保持，未知与混配拒绝。

成组精确集合：对子、两对、三条、葫芦、四条、五条、同花葫芦、同花五条；普通同花即使有同点不算。

|卡|新合同|
|---|---|
|b03 老搭档|特别6；任意成组 afterHand 倍率成长+0.25，cap3；本手读旧值，下次起生效，每手一次，跨场保留，售出丢。其他型可读已有但不增长。|
|b06 再说一遍|稀有8；原始主手 scoringIds 同点最多组，平手取主手最先出现组；先选包括失效的组，再仅对该组有效牌各再计一次。附带/held/assist不参与；extra4/depth1/events512保持。|
|b08 对半分|特别6；成组主手真实过关+3金，clearId一次，失败/跳场无奖励；无需held数，不抬e04共同奖励前本金。|
|b10 练对子|新普通4/权重5；成组 afterHand 热度+10，cap100；旧身份仍特别6/权重3/+5cap50，售价依据实例实际paidPrice。|

两种成长初始按既有加法成长合同为0，无新计数器。封禁停止计分读取、b06与版次，不停止非计分成长或b08收入。满堂彩、全部基础分/牌级、其他五人能力和素材保持；两对/葫芦等级分别沿原规则。

纯接口：`R2_GROUP_HAND_TYPES`；`r2LargestScoringRankGroup(played, scoringIds)` 是原始主手顺序的 typed 纯目标选择，`largest-scoring-rank-group` predicate 额外要求精确成组型，无RNG或预测收益。既有四集合 facts 和 trace targetCardId/rootEventId 标明实际来源，不加目标按钮。

保存：新身份继承 e7d openingDiscard/clearCapital 严格字段和所有工厂/profile resolver。四卡本体按实际身份定义匹配hook/condition/op，版次绑定真实实例；新成长读取、afterHand次数/结果/当前实例必须闭合；b06目标、原牌root、请求/实际重计与cap闭合；b08收入必须存在且金币流水闭合。旧身份禁止新predicate，不因新卡扩大旧condition/op/counter。

首轮检查：typecheck和84项相关检查通过，包含五个引擎裸Lv1无增强/角色b06金样 99→142、99KK且9在先→242、999→432、999KK→1420、9999→2744；三旧fixture以及从未载入新group代码的e7d真实完整state/RNG/receipt/journal/checksum回放通过。首FAIL保留：测试直接修改冻结结果、误把B16当全禁用，以及遗漏ScoreEvent类型导入；随后Boss样板误加不存在字段导致一次typecheck失败，测试未运行。修正样板/导入后通过。

仍待：五条及组合上限边界、全部版次/retag腐坏源验证、真实购买售出/S06创建路径补证、原生失败保存同候选重试/分区恢复、有限自然候选/基线计划和最终冻结门禁/精确CI。首检查点不冒充完整验收、自然取得、平衡或真机通过。

后续 UI 自然验证只留两条候选：成组逐级升级保成长与收入，缺b06仍靠普通/特别推进；已养b03/b10转顺子或同花携带存量。b10权重变化会分叉同seed后续货架，不能声称同货；未自然遇稀有则标缺证。本批不做UI新布局或长视频。
