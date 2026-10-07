# W3 首章最小交互开工卡

更新：2026-10-07。状态：高优先级待实现、待独立复核与玩家验收。承接原 W1/W3/W5/W4，不重排 W0–W9。本卡没有宣布 W1/W2 全部完成。

- inputSHA：27d31fc50bcbbdc4a7a3405eece92c54e9aa8314；启动时核最新main。当前完整输入见 [INPUTS](evidence/w1-inputs-2026-10-07/INPUTS.md)、[REVIEW](evidence/w1-inputs-2026-10-07/REVIEW.md)。
- dependencies：W1必要九牌/商店/管理状态、现有可读手绘素材和最小尺寸；当前PC全流程布局遗漏先有界收口，不等W2整批精修。游戏单线6.1默认Medium，无并发；超出Medium先说明具体理由。
- 玩家可见结果：同店三货能比较条件、实际作用项与生效时间；持有详情关闭清楚、至少48px高，调序/出售至少44px，取消不扣款。完整规则、真实价/余额、稀有度/版次、工具/长期物品与继续入口可达。首个样板用自然b10/b11/mantangcai，不要求72卡全部改写。
- allowedFiles：src/game/ShopScene.ts、DetailDialog.ts、JokerPlayerCopy.ts、JokerMemory.ts、JokerGroupUpgradeTemplates.ts、src/style.css，仅实际依赖文件；相关现有 tests/shop-layout.test.ts、tests/joker-player-copy.test.ts、tests/detail-dialog.test.ts与有界harness。新增依赖先把准确路径补入卡；领域/content/application/platform、数值、随机、存档、锁文件、CI和资产不在范围。
- acceptance：当前profile全文一致；b10本手读旧值/成组手后新增/下手生效、b11有效匹配持牌前3张各+0.5倍率、mantangcai指定型+90热度可区别，不把热度加成称最终分。首末槽边界/取消完整state与RNG保持；正文≥14px、主48/次44、现有更大触点不缩。PC1280×720/1366×768/1920×1080、手机390×740/320×740/740×390定向检查，九牌未选/已选合法档保护；受影响安全区和811/812容量临界补检。定向后按仓库完成最终门禁，软件截图不签真机/玩家满意。
- nonGoals/stop：不自动出弃/买卖、不预测总分、不窥未来RNG、不改发牌/成长/经济、不实现所有角色或七类全部特效。若要缩字删条件或改领域才能解释，拆出合同审查；同方法两次不能改善就重审，不批量重画。

## 出牌前公开条件提示：后续有界合同

依 [七类效果合同](JOKER_TRIGGER_HIGHLIGHT.md#effect-feedback-contract)，仅用当前手牌、选择、已保存上手/成长与封禁事实，分别显示“当前手牌可组成”“当前选择满足”“为下一手准备”“封禁或未满足”“随机结果未确定”。前两者不能混同，资格满足也不等于实际生效或保证过关。无事件不能演已发动；随机不读取未来结果，不给预计总分，不接管操作。若现有facts不足，另开最小接口卡，不在上面的两个UI缺口中顺手扩领域。

c11换轨：紧邻普通顺子→普通同花或反向，整手倍率×1.75；首手、同型连续、同花顺不触发。首手选择普通顺子只能说“本手不发动；打出后可为下一手普通同花准备”，不能说本手已发动。弃牌不改上手，新场重置；封禁须明确。当前“未满足”提示不算完成全部区分，最终实际收益只读已保存trace。

## 玩家发现路径挂钩

原W1/W3/W5/W4共同验收：发现机会→尝试效果→理解真实收益→主动买牌/改牌加强→缺件时转向。首批只解决上面信息/操作，不冒称五步完成；后续用固定真实trace与新的公开手牌/货架检验玩家能独立选择下一步、解释读取/新增成长、给出有来源且可用的缺件替代。未观察自然组件保留未知，不扫大量种子凑成功。百万/亿分是可选高手层次，不是唯一成功指标；理解、选择与迁移各自留证。有限截图/关键短片，不长录屏或软件GPU帧率签收。

## 2026-10-07 安全管理执行批次

当前 inputSHA：`a6047dedbd89f24a90e9c07de27c82d47d6a9645`（启动已 fetch 并核 main）。旧 inputSHA 与证据保留原身份。本批先复现 320×568 bottom12/34 误触、740×390 折叠管理缺入口、详情关闭44px与底安全区，再修安全操作，最后核 b10/b11/mantangcai 已有正确摘要。

allowedFiles 精确补充：`src/game/ShopLayout.ts`、`harness/w3-shop-management.mjs`；现有 `src/game/ShopScene.ts`、`src/style.css`、`tests/shop-layout.test.ts`、`tests/detail-dialog.test.ts` 仍在范围。只在实际依赖时修改；不动 ToolInventoryEntry、领域/content/application/platform、锁文件、CI。合同记录与源码独立提交，新的有界证据目录为 `docs/production/evidence/w3-shop-management-2026-10-07/`。

保留 PC 新区域、手机九牌及811/812容量临界；管理入口点开/取消不改完整state与RNG，调序边界禁用，出售二次确认。共享详情使用已有正文滚动并把主关闭与整框放在安全区内，不缩字、不用固定高度裁正文。软件与部署证据不代签用户PC/审美。

本批修复分支软件结果：[安全商店管理证据](evidence/w3-shop-management-2026-10-07/README.md)。320误扣款、短横持有管理与安全弹窗已按受控原生输入复查；产品79a4b00、规则展开harness f5ad8b9。仅这批软件验证通过，仍待独立复核、用户PC/手机共同验收与整体信息闭环，不宣布W3全部完成。

## 2026-10-07 购物去向小批

inputSHA：`4a0fdf07cbc1f9bdca891cb16256bcb88997f60f`，父任务确认PR36已正常快进main且精确CI通过，本地fetch一致。继续原W3，不重排总计划。有限核对发现成功购买只有名称/金币反馈，未直接连到实际所得与下一步。本批在已保存成功后呈现三类购物去向，复用既有卡面/商品图与持有详情/工具包；成组成长牌沿用既有读取→结算后新增→下一手生效合同。

allowedFiles补充：`src/game/ShopPurchaseReceipt.ts`、`tests/shop-purchase-receipt.test.ts`、`harness/w3-purchase-destination.mjs`；现有`src/game/ShopScene.ts`及文档证据。只消费提交后的真实state与当前profile定义，不改domain/content/application/platform、存档、RNG、数值、CI、资产。验收：大丑牌实际槽/实例、工具实际库存且未自动用、长期道具已持有/实际生效时机可查；查看/取消不扣款；保存失败或重复提交不假成功；PC三档及手机320/390/740检查、已有九牌回归保护。证据保存`docs/production/evidence/w3-purchase-destination-2026-10-07/`；真机/审美/完整W3继续待验。

本批有界软件结果：[购物所得、去向与下一步](evidence/w3-purchase-destination-2026-10-07/README.md)。首轮clean产品6d7d7f9、最终工具引导/单测591955b，三类实际购入/入口、一次工具使用及保存失败检查通过；原PC/手机安全与九牌回归保护，仍待父独审/精确CI/真机共同验收。完整W3及自然成长路线因果理解不冒称完成。

父审P2：[S07间接删除清理证据](evidence/w3-purchase-destination-2026-10-07/p2/README.md)。产品0d62746仅把清理改为成功提交后按receipt.kind核实际持有，取消/失败不提前清，其他所得入口保护；最终2463项测试通过，仍待新headCI/父复核/真机验收，不扩玩法。

## 2026-10-07 已存成组成长因果小批

inputSHA：`5c9836bc5ae9bbb256012596a00d60bd7a5a2067`，父确认PR37已独审/精确CI全绿并FF main，本地fetch一致。现有lastTrace含结算前sourceJokers、真实read-growth/add-growth事件与结算后jokers，当前存档含实例累计成长，依赖已满足。只做b10优先、同合同b03的既有详情“成长因果”入口，跨場/重入显示实际读入→本次新增→累计已存→后续按条件读取。没有同实例trace明确缺记录，不造完整历史、不预报本手总分，不改数值/存档/RNG/六角色。

allowedFiles补充：`src/game/JokerGrowthCausality.ts`、`tests/joker-growth-causality.test.ts`、`harness/w3-growth-causality.mjs`；现有GameScene.ts/ShopScene.ts及必要文档证据。只读已成功保存的state/trace与当前profile。验收自然练对子既有路线、真实下一手读入、跨場/重入/回看状态不变、封禁不假读、非成组不假增长、cap实际差值、重买不串旧实例；必要PC三档/手机三档与九牌安全回归，软件不签实机。证据`docs/production/evidence/w3-growth-causality-2026-10-07/`，原W3/W5顺序保持。

本批软件结果：[已存成组成长因果](evidence/w3-growth-causality-2026-10-07/README.md)。产品5e34d78，接续既有自然局并实际跨场读20/保存30，重入不变，受控封禁/cap/非成组反例及必要双端/九牌回归通过。最终2469 tests/137 files，首次既有机器人超时保留。仍待父独审/精确CI/玩家解释和真机，不宣布W3/W5全部完成。

## 2026-10-07 成长常规路径发现性小批

inputSHA：`f6d0f85199416e5b1b290d0d83ee0f21a93febcb`，父确认PR38已独审/精确CI全绿并FF main，fetch一致。一次390原生路径走查（未打开成长详情）观察到仅热+10/20/30及条件见详情，过关/商店没有成长新增与下手时点反馈；这是界面检查，不冒称真实新人学会。最高优先补最近已保存成长的短可见反馈，复用GameScene/IntermissionScene/ShopScene既有提示文字位，不加弹窗/新布局/素材。

allowedFiles补充：`src/game/IntermissionScene.ts`、`harness/w3-growth-discovery.mjs`；现有JokerGrowthCausality.ts、GameScene.ts、ShopScene.ts、tests/joker-growth-causality.test.ts及必要证据。只消费同实例成功保存的正增长事件；跨场缺trace只显示当前已存累计及条件读取，不造历史。选牌/错误/封禁/购买消息优先，窄位用有界短句，不缩字裁条件。验证实际选牌/出牌/过关/商店/继续/取消和重入，PC三档/手机三档。原W3/W5、无总分预测/数值/存档/RNG变更保持；真实新人理解待玩家测。证据`docs/production/evidence/w3-growth-discovery-2026-10-07/`。

本批软件结果：[成长常规路径发现性](evidence/w3-growth-discovery-2026-10-07/README.md)。冻结产品a6bbc66，六尺寸未开成长详情的真实选牌/出牌/过关/商店/继续/取消/重入通过；跨场trace清空使用当前已存成长，不冒称刚新增。玩家理解、真机共同验收及完整W3仍待验。

### PR39父审短横语义必修

旧head50753ba独审发现740×390短句丢累计/条件；旧精确CI全绿不代表该语义通过。本批维持区域坐标/字号/按钮，复用提示位与其既有底部安全留白容纳两行：来源+实际新增→累计／下手按条件读；缺trace为来源已存累计／本手按条件读。移除语义删减fallback，helper及原生断言直接核来源、累计和条件；740及邻近短横、既有PC/竖屏路径保护。只限此前allowedFiles及必要证据，真实新人/实机仍待验，不合main。

PR39父审必修结果：[短横完整成长语义](evidence/w3-growth-discovery-2026-10-07/p2/README.md)。产品2e6d1e9移除缺累计/条件短句，复用原底部安全留白容纳两行14px；九尺寸真实路径/语义/控件避让通过。测试样本阶段修正adc0848后默认verify2471 tests/137 files及content/plan全过；旧超时不称历史flake，旧短横PASS不再作为完整语义证据。新headCI/父复核及玩家验收另接，未合main。

## 2026-10-07 W3-P1 工具改牌目标选择

inputSHA：`576a7b60a4153d35d1479cfff9abb0d8cb6d61e6`，父确认PR39独审/精确CI通过并FF main，fetch一致。原W3-P1/U04/U06/U11，复用W2已备资产；W1必要布局、现有phase-known目标/确认/保存合同及J/Q/K、72 Joker缩略映射已具备，不等待整批美术或未放行角色数值。

当前商店工具整副牌目标按原序显示，找同点/同花不便；本批在既有工具目标gallery增点数/花色只读整理，选择按实例保持，原提交顺序仍来自原targetChoices，不改手牌/牌组/RNG。复用court和Joker目标缩略，名称/花色/增强/版次/序号保持，加载缺图退回文字，不添加新图。allowedFiles：`src/game/ConsumableDialog.ts`、`src/style.css`、`harness/w3-tool-targets.mjs`与必要文档证据。相关定向工具/详情检查；最终候选一次必要verify/content/plan及PC/窄竖/短横目标选择、取消、真实使用与重入。不大回归每个小动作、不混领域/角色/经济/存档变化，真实玩家与真机未签。证据`docs/production/evidence/w3-tool-targets-2026-10-07/`，仅draft父审，不合main。

本批软件结果：[工具目标整理与现有图像复用](evidence/w3-tool-targets-2026-10-07/README.md)。最终7db8630，四视口真实多目标整理/取消/实际改牌/重入、当前手牌公开目标、缺图与保存失败同候选重试通过；69相关检查与一次默认verify2471 tests/137 files及content/plan通过。没有重跑成长/商店全套；原W3/W2/W6计划和真实玩家/实机边界保持，新headCI与父独审待接。

## 2026-10-07 W3/W4-P1 换一身真实过关赠品

inputSHA：`3ee210f3b0c5c2d04c00facb09cc1610adae2d0e`，父确认PR40独审/精确CI/FF main，fetch一致。原W3事实/使用闭环与W4-P1资源基础反馈（U06/U10/U11、SG10），对应JOKER_TRIGGER_HIGHLIGHT已核c12样板。依赖现有普通straight+flush同场资格、成功过关保存事件、满包转2金及已备T03–T06图；全部已有规则，不变领域/随机/奖励。现有过关主界面只显示合计金币，赠品来源/名称/入包及满包去向须主动读长trace，先补这条实际经营闭环。

allowedFiles：`src/game/IntermissionScene.ts`、新只读`src/game/StageGiftReceipt.ts`、`tests/stage-gift-receipt.test.ts`、`harness/fixtures/stage-gift.ts`、`harness/w3-stage-gift.mjs`与必要证据。只读成功保存的真实onStageClear c12事件，复用既有footer和详情/工具图；未满足/特殊同花顺/无trace/未保存不假发奖，满包不假入工具。相关单测为主，有限PC/窄竖/短横原生真实两手→赠品/满包→查看/取消/重入→商店使用；最终必要门禁一次。P2特写/音效/角色/数值/存档/RNG/共享布局不改，真实玩家与真机待验；仅draft父审，不合main。

本批软件结果：[换一身已保存过关赠品](evidence/w3-stage-gift-2026-10-07/README.md)。产品7e0b216，三个正常赠品/短横满包/普通同花顺反例共五原生案通过；查看/重入不重奖，赠品接到商店实际改牌并消费一次。68相关检查及一次默认verify2475 tests/138 files、content/plan通过。仅c12普通成功过关样板，其他来源/最终胜利/P2特写及真实理解/真机按原计划；新headCI/父独审待接，未合main。
