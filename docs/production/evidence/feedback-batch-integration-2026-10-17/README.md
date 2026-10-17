# 本轮反馈整合回执 · 2026-10-17

## 商店头栏／虹彩与小文案实际整合（277d13cc）

**商店与说明小批实际整合：** 基线main `5cafa41ace1abbfd5d9fe4ad97f9bb10a00867a4`，上一条6609登记已普通push dev `590d5b0e79e99a17301aedc572425d3867177cc0`。头栏安全区 `aceb2403856440ba280f2dc1453718ee46883620` 已含Shop虹彩后继 `1075bd204e364d867528183d8e0c0c162ced93d9`，再顺序合入旧名出口 `63145adfdecd06af006ea62e21b24455a88367fc` 与极简手册最新回执 `7b18d9d9098464fefcc1562e6a7730b18a1a9d41`，产品 `277d13cc381545e4b2965d2aa019c6bb7e11ad1c`，三次正常merge无冲突。来源35路径全同、63145的23路径中22同（唯一测试差异为完整保留main已有长期文案用例，当前测试精确基线）、手册4路径全同；头栏5个LF源指纹及虹彩/暖金挂载hook保留。新增4文件38项交叉、类型/340模块构建通过，原18/28/30/74窄测和各自双端证据按原版本范围复用，未重跑手册产品测试或浏览器矩阵。GameScene、音频、规则/存档/资产不改；Shop虹彩不代签战斗接线，旧词现场根因仍未知。整包389文件/37,488,833B仍超20MB。按既有授权普通eyes/main发布，最终SHA以远端交付回执为准；不是仅登记。最高源牌音画仍等01a147ec与最新6609真实scoreRebound双拍的同版GameScene/序列证据，不单发旧8a9；不阻塞核心、三目标未达标/P08 in_progress与审美/真人/听感触感/真机/正式门保持。

- 精确来源：[头栏](../shop-header-safe-area-2026-10-17/README.md)、[Shop虹彩与忘招暖金](../polychrome-iridescence-2026-10-17/README.md)、[旧名出口](../tool-copy-boundary-audit-2026-10-17/README.md)、[手册最新名称纠正](../minimal-handbook-copy-2026-10-17/README.md)。1180/390原生菜单边界8px及12边缘点击、虹彩无输入连续视频/减少动态/清理、189展示视图均只签来源同码范围；本版没有新自然长局或真机验收。
- [来源/保护树绑定](checks/shop-small-batch-binding.json)：源码无新冲突修补。首次“全部源文件均应一致”的审计在已发布测试组合处FAIL，完整差异已记录并确认当前测试精确基线，不改产品、不放宽机制断言。
- [合版交叉](checks/shop-small-batch-cross.log)：shop-flow-components、joker-extra-bonus-copy、player-facing-text、catalog，4文件38项；不冒称重跑来源74或合算各批数量。
- [类型与生产构建](checks/shop-small-batch-build.log)、[构建身份及包体积](checks/shop-small-batch-build.json)：revision277d13cc，builtAt2026-10-17T12:52:53.976Z，sourceStatus clean/modifiedfalse。验证时仅有未跟踪绑定记录/忽略日志，不宣称所有文件均无暂存外输出。默认沙箱最初无法写Temp日志，没有有效结果；改用允许的同工作树权限后完成上述实际检查。
- 不因既有20MB FAIL扩大删资源范围；不等CI、查域名或部署。旧失败原件、冻结内容和存档保持。

**最高音画批音频更新（仅登记）：** 现用候选 `6609f4f609199ee1d5c9271c9389daaebb943bd7`，为同分支8a9b后继，含真实回弹阶段scoreRebound双拍契约。源牌owner01a147ec须给GameScene同版接线及实际序列回执后再联合整合；旧一声版不提前单发，不以接口/单测宣称用户双拍或三体验已满足。其余已完成小批不阻塞此最高优先级；本次不合产品、不跑测试、不push main。

## 刘娥样例与AI实际操作一致性后继整合

先完成商店main/eyes `934477727201a83b7b2590ee9a2a4645b5f45606` 的成功普通push及双ref核实，才接本批。正常合入[刘娥387](../liue-target-attachment-2026-10-17/README.md)与AI8cf，产品 `10c92404fb4e0cac7ca89a10fd47fdcecc6b7ec6`。e32149e8/24285a60底层模块是8cf真实祖先；387的证据末提交不是8cf祖先，二者共享b0a52c96产品，故另合387保留录像/原FAIL/31项日志。最终GameScene、AiHandCandidates、HeroSkillDraftLifecycle及两附着模块五文件逐blob精确8cf，无覆盖旧场景；刚发布ShopScene/规则/数值/保存/音频/public/art/包锁/.github零差异。

[新增3文件27项交叉](checks/liue-ai-cross.log)通过，覆盖AI显式上下文、选定草稿合法性及原辛弃疾目标交接；[含类型336模块生产构建](checks/liue-ai-build.log)通过。来源刘娥31项/type与b0a52c96四段连续动态、AI51项/type及底层152项各自按原版本复用，不机械相加。其余五英雄附着、物理设备/听感、低端新增CPU预算与用户审美未验，不能把b0a52四段说成8cf新合版全矩阵。

### 本批必需的真实AI选择／取消／切换

[实际原生报告](ai-context-native/report.json)、[连续录像](ai-context-native/continuous.webm)、[完整初末状态](ai-context-native/states.json.gz)、[可复跑驱动](../../../../harness/ai-hero-context-integration.mjs)。使用真实Windows Edge143.0.3650.80、1366×768/DPR1鼠标输入，真实菜单导入合法公开夹具。e2e产物revision精确10c92404、builtAt2026-10-17T12:33:52.806Z，sourceStatus=clean/modified=false；报告同时保留当时未跟踪harness工作树行，不能把编译source状态冒称所有工作文件都已提交。

- 原6♣/6♥对子未发动按canonical380；明确选6♥后同一对子1241，兼容顺子1390。AI采用顺子保留6♥，取消目标后缓存key和评分输入更新、顺子回580，之后AI不自动重选技能。
- 重选6♥后，实际AI在顺子/对子两种合法候选间循环；撤销换组恢复先前手牌与6♥目标。9次观察中完整state/journal/storage不变；每组实际捕获的aiInput经正式preview计算，逐候选与独立applyCommand结果比较相同，非只看一个label或模块单测。
- 最后真正点击出牌只保存一次PlayHand，目标6♥、所选顺子及最终1390保存结果与独立canonical完整状态、checkpoint一致。原高牌最后策略未改，不签全部主动技能最优、随机结果保证、六人实际流程或自然经营。

整合者核看[撤销后真实待转画面](ai-context-native/AI-before-play.png)和[取消后真实画面](ai-context-native/cancelled.png)；[初选](ai-context-native/chosen.png)、[保存后](ai-context-native/saved.png)一并保留。首轮[SSR加载超时FAIL](checks/ai-context-native-initial-ssr-FAIL.log)发生在浏览器前；仅修改自有驱动关闭不必要的dev发现/监听，产品保持原五文件，随后同一窄流程[实际PASS日志](checks/ai-context-native.log)。未扩大重跑旧矩阵或修改产品迎合验证。

**核心优先级不被此样例代签。** 用户12:26指定的顶部五张唐宋牌分散悬浮、去红粗框、真实触发左右回弹及音效同步仍是最高下一项，源牌owner01a147ec正在联合声音8a9b；本批没有完成该整改。声音源105/type/build/无削波不等于实际试听，不单合声音签三目标。虹彩176仅Shop接线候选（战斗未接）、图鉴及额外美化后排；63145旧词保障、极简手册最新证据7b18（产品4fef）可并后续小批，不抢核心，也不重复手册产品测试。

当前完整dist **389文件/37,479,977B** 仍超20,000,000B，原chunk/CI缺口/原日志FAIL保留。按持续授权普通eyes/main交付，完整main SHA以成功回执为准；无CI重跑、域名/部署或自然长局，P08仍in_progress，三目标、用户理解/审美/听感/触感/真机及正式门开放。


## 商店四区、自选三路与额外收益最终整合

基线已发布main/eyes `7f40cd1b07d2fac8c0cddfb0860ba79fb27ba5b6`；[主体c048及最终7db6来源](../shop-workshop-structure-2026-10-17/README.md)已正常无冲突合入产品 `77b19cae62904a45647a8b7c7c30f02d5daabfb7`。先合已交付c048，收到最终SHA后同批正常接7db6；没有发布中途c048。最终来源相对4b0的74路径中73逐blob相同，唯一r2ToolInfo组合保留已发布9c12的12长期物品文案。

已核提交关系：最终分支c048→28429044→7db6；4b74和9c12本身都不是其祖先。28429044的adapter产品/测试补丁与4b74稳定patch-id同为b958dbca09881503834dbdfa1afa5b769300d34b；当前r2ToolInfo相对7db6的差异与9c12原文案补丁patch-id同为19084b79fae7bab534ed8574b48369b7edc0aa02。采用Git局部组合，没有重复应用adapter或覆盖加演许可。侧栏1af6、GameScene/Xin2f、计分/触觉、规则/数值/存档、AudioEngine、public/art原字节和137退役结果均与7f40保持；包锁/.github不改。

PC四主消费区同时展示唐宋牌、消耗工具、自选做牌和长期物品，竖屏四类同排可达，短横只签紧凑四入口。自选三路共享节点及可逆选择，原点数/花色只带入筛选、目标仍空选；实际保存成功才按原共享凭证显示已用，报价/购买入库存/确认使用/保存失败重试沿原命令链。Boss预告依据当前shop/visitIndex/stageIndex重新派生，普通商店render校验音乐上下文回shop，真正Boss预告仍onReveal切换；这是上下文软件证据，不签听感。

[额外收益原adapter](../joker-extra-bonus-copy-2026-10-17/README.md)已通过最终owner接线：保留多彩标签，未点击货架直接显示额外倍率×1.5、闪箔额外热度+25、全息额外倍率+2，购买详情/身份标签共用接口。原4b74待接线状态现由此有界软件交付覆盖，不再当未合模块。来源首次50/10错误期待及其原FAIL保留，最终按本项目25/2/1.5目录验证；没有修改领域规则迎合断言。

当前仅新增[4文件41项交叉](checks/shop-structure-final-cross.log)：9c12长期文案/旧名合同、共享商店几何与流转、额外收益行及当前资产退役；[含类型333模块生产构建](checks/shop-structure-final-build.log)通过。来源主体12文件136项、10组页面及原生命令/失败恢复，追加4文件46项/5组页面，扩货架与Boss各一次补查，分别按原来源范围复用，不相加成全量数、不重跑旧矩阵。报告base写4b0工作来源，不能说是在本整合SHA新跑的浏览器；r2ToolInfo当前另外组合9c12，也不冒称最终截图每个完整文件都同hash。

整合者查看来源1366五持有额外行、390五持有和三路空选图，父级另在审PC/手机；**零脚本异常、命中区或函数边界通过不代签审美**，未获审美/三目标通过。原布局/fixture/runner/扩货架/追加期待等FAIL全部保留。收尾整批diff空白检查还报出来源fixture-third-tests-FAIL.txt、tests-first-FAIL.txt、tests.txt三份原始日志的尾空行；这些源日志逐blob相同并原样保留。仅排除这三份原始数据后的产品/文档/本批日志空白检查通过，未改任何素材、规则、工作流、阈值或全局空白设置。受控Boss使用公开牌型等级工程样本，非自然获得/实战完整复现；自然残留触发与实际听感/设备由父级另记。

完整dist **389文件/37,471,750B** 仍超20,000,000B，FAIL和chunk警告保持。按既有授权正常eyes dev/main发布，完整远端SHA以成功回执为准。AI已收8cf3接线回执及刘娥387c样例，先发布本商店批再顺序接入，AI须补选择/取消/AI切换窄实际验证；二者尚未合入本批。真实牌动作、虹光和图鉴重排仍后继，未纳入、不等待。孤注旧词未复现仍开放，既有CI缺口/真人理解/听感/触感/实体设备/C04/A03/V01/L01保持，P08仍in_progress，无域名/部署/自然长局或CI重跑。


## 加演许可与长期物品持续范围文案

基线已发布main `e389ea2c4a7f6d49284546f91992d13055072655`；dev先前af45仅登记AI候选，没有合AI模块。本次只正常无冲突合入[9c12来源](../tool-player-copy-2026-10-17/README.md)，产品 `67a187a286f9132f2c8dcb4b032014ffdc9cd00c`；15路径逐blob全部相同，r2ToolInfo浏览器来源指纹匹配，ShopScene/ConsumableDialog/Catalog/DetailDialog四消费者亦与来源精确同blob。未合其后继4b74，不复制owner场景。

U03加演许可明确“从下一场起，本局每场出牌次数+1；当前场次数不变”；新增源回归以真实购买和连续两次入场验证仍持有、每场5次出牌。12类长期物品说明均写清各自本局持续范围、入场/即时/每店/每章等真实时点，未改机制、数值、规则或存档。两处旧“大丑牌”测试预期同步到当前“唐宋牌”，没有放宽效果/价格/消耗断言；不因此宣称4b0历史CI55项全修或CI通过。

来源Windows4文件105项/构建与1366×768、390×844前后查看证据按原范围复用，含全部39工具详情展开、完整state/journal/storage不变；并未确认购买或使用。整合者查看来源390加演许可像素，仅作源图核对，不冒称新整合浏览器或实体设备验收。源47d2…冻结JSON工作字节hash是Windows CRLF口径，既知Linux LF固定hash测试缺陷仍开放，未改领域内容。

当前仅新增[图鉴消费端1文件10项交叉](checks/encore-copy-catalog-cross.log)及[含类型的329模块构建](checks/encore-copy-build.log)，均PASS；不重复来源105或新浏览器矩阵。GameScene、ShopScene、规则/保存/src/domain/content/application/platform、音频/public/art原字节、137退役结果、.github/包锁保持e389，先前侧栏16项和资源17/423/366证据留在自身产品范围不重跑。

**孤注旧词仍开放。** 用户所见未在来源PC/390使用页、购买、图鉴及39组件复现，原因未知，不归因缓存，不写成已修复。4b74额外加成只有adapter与76源测试，[接口交接](https://github.com/big-dimple/dachoupai/blob/4b74ebc71aa760700d978057f7fd7fa46ca3bdaf/docs/production/evidence/joker-extra-bonus-copy-2026-10-17/README.md)待商店owner接货架未点击信息、detail及标签并给同版回执后才可合入落地；AI e321也继续等唯一Scene owner01a147f6的输入和switchHandType/候选采用草稿一致性回执，模块均未合。

本批携带af45计划登记并按已有授权正常eyes dev/main发布，完整远端SHA以成功回执为准；不等新问答/多彩虹光、刘娥附着大样例或未完成接线。当前完整dist **389文件/37,460,654B**，20,000,000B预算仍FAIL，既有chunk警告/CI15格式与混合断言/待战超时不掩盖。无CI重跑、域名/部署/自然长局，P08仍in_progress，三目标与人验/听感/触感/真机及正式门开放。


## 英雄侧栏长状态与胜利后误停用修复

基线已发布main/eyes `760b9ebd56605d44786e6e8d2221b8ba22ab06a6`，来源[1af6e171](../hero-sidebar-status-layout-2026-10-17/README.md)正常无冲突合入产品 `46ced0c81471b18f059a88b5720a60bcf105b44a`。来源29路径中28逐blob相同；唯一GameScene自动组合为侧栏局部增量加已发布2f2e独立弃牌，Xin方法/入口分派与760逐段相同，没有整份覆盖旧场景。6个叶模块指纹匹配；源第7个GameScene完整指纹不同，明确是组合，不将源24布局/受控动态冒称当前全文件同hash或新整合浏览器复测。

PC在原250px左栏中给状态14px/scale1全宽独立两行，手机13px/scale1短句保真实层数/倍率/支付/目标。azao/erxiang/xiemu展示适配分离能力启用与await-input资格，stage-cleared不再误报永久停用，结束不可提交操作，真实已用/B08/Q01停用各读自身合同；文成同型主动释放后仍可重蓄规则未改。父级花蕊胜利“已停用”反例作为同源输入保留，不冒称本地自然局。

新增[3文件16项交叉](checks/hero-sidebar-cross.log)：阶段已结束、真实B08及文成再蓄合同，和已发布辛弃疾/秦琼目标交接；[含类型的329模块生产构建](checks/hero-sidebar-build.log)通过。来源8文件72项、六英雄四视口24组232文案及文成178/297累计475的两手受控逐帧流程按原范围复用，不机械相加或重跑矩阵。整合者查看来源PC胜利状态与320短句像素，仅为源图复核；原两份初始检查保留，实体设备/真人理解/听感/触感不签。

规则/数值/存档/src/domain/content/application/platform、AudioEngine/音频/public/art原字节、137项退役结果及.github/包锁相对760均不动，先前17资源交叉/423清单/366在用保护证据按自身产品复用，不重复执行。当前完整dist389文件/37,460,495B，20,000,000B预算仍FAIL，现有chunk警告保持。

按既有授权正常eyes dev/main发布，实际完整SHA以成功回执为准；孤注文案未收到SHA不纳入，不等待刘娥附着样例，GameScene保持该owner以1af6e为基底的后续窗口。既有指定CI15格式/55混合失配/待战烟测超时保持开放，未重新抓日志/测试或改门禁。无域名/部署/自然长局，P08仍in_progress，三目标未达标及人验/正式门不关闭。


## 旧资源清理与全日计划对账后继批

基线已发布main/eyes `179e17414aa9dbae67dfa33dc991c2a298895223`，最终产品 `e92ebe1a7ff32b2b4942d1d93d7681513c7c5d3c`。正常合入[c676两份计划](../../CURRENT_BATCH_20261017.md#hero-target-fx-20261017)及[47f旧资源清理](../runtime-asset-cleanup-2026-10-17/README.md)。两份文档仅顶部追加冲突，保留双方全部计划/安全回执后按当前事实覆盖旧4b0/辛弃疾待整合/H13待交付状态；H17首刘娥样例独立实现中、尚未交付合入，本批只有其计划，四消费区与评估待取舍不签实现。

资源152个来源路径（含137删除）全部逐blob匹配。唯一运行时代码为删除jokerArt中恒空旧映射；GameScene/Xin局部、同桌计分/眼神/触觉、规则/数值/保存/AudioEngine和art/sources原画保持179e。当前72卡、51工具物品、24立绘、6眼图/6focus回退、72高光、JQK/字体/纸纹/5首BGM/在用Foley均保留；96KiB高光上限不变，不为了预算删在用图或音。

来源96相关回归、6工具测试和Git历史四输出完整核验按精确来源复用，不重跑该矩阵。本次仅补[2文件17项当前URL与高光源图交叉](checks/asset-plan-cross.log)、[423项资产只读核验](checks/asset-plan-inventory.log)、[类型及328模块生产构建](checks/asset-plan-build.log)，均通过。

[构建字节审计](checks/asset-plan-runtime.log)由当前生产注册API导出366真实在用路径：362二进制与已发布179e原始字节相同，4个未改纸纹/符号SVG按来源LF文本内容身份相同，全部366构建文件原始字节与当前源相同；137退役文件均不在public/dist。[首轮直接比Git LF/Windows CRLF的4项FAIL](checks/asset-plan-runtime-initial.log)保留，随后只复核这4项，未修改素材/测试阈值/CI，不掩盖真实SVG内容变化。

当前完整dist **389文件/37,458,958B**，相对辛弃疾构建526文件/45,174,068B少7,715,110B（含元数据/代码变化），20,000,000B预算仍FAIL。来源37,469,485B属于c452基线清理候选，不冒称当前合版数字。已有chunk警告、指定CI15条证据格式/55混合断言/待战烟测超时均仍开放；未扩大CI修复或重跑。按已有批准正常eyes dev/main发布，不等下一视觉大改，实际完整main SHA以成功回执为准；无域名/部署/自然长局。P08 in_progress，三目标未达标、真人理解/听感/触感/物理设备与正式门不关闭。


## 辛弃疾弃牌目标隔离后继批

基线main `4b0de064480a9c518f6443984ef6a465c4b3323d`；[来源2f2eb708](../xinqiji-discard-targets-2026-10-17/README.md)正常无冲突合入产品 `de144e76d7e8d9b14df105da6fa96817862c0dc7`，14个增量路径逐blob相同，来源浏览器6个指纹均匹配（明确兼容LF/CRLF工作字节）。GameScene仅该来源局部增量，共享计分/眼神/触觉、68手机/98正名/71零成长不回退；领域/规则/数值/存档/音频/美术/public/包锁相对4b0零改动。

辛弃疾提醒返回和主动技能都先另选空弃牌草稿，取消不动原拟出牌和保存，确认只提交新目标；候选提示用领域required实际张数。秦琼复用同一空草稿组件，原眼神接线保留。精确复用来源5文件50项与1366×768鼠标/390×844触控DPR1短受控交互，原选择器FAIL保留；整合者查看来源390确认图，不冒充新合版截图或实体设备验收。

新增[4文件13项交叉](checks/xinqiji-cross.log)：辛弃疾/秦琼目标交接、共享眼神及当前零成长；[类型](checks/xinqiji-typecheck.log)与[328模块生产构建](checks/xinqiji-build.log)通过，旧大chunk警告仍在。未重复来源50项/完整浏览器矩阵或自然长局。完整dist526文件/45,174,068B仍超20,000,000B，FAIL不关闭。已正常push main与eyes dev `179e17414aa9dbae67dfa33dc991c2a298895223`，远端双ref已核对；未等待工坊重排、CI或再次回复，无部署/域名操作。P08仍in_progress，三目标未达标，人验/听感/触感/物理设备与正式门保持。

### 两条指定CI只读失败摘要（对应已发布4b0）

每个运行/失败job日志只取一次，后续仅缓存分析；未重跑、等待或改工作流/阈值。这些失败没有运行预算门，不能解释为已知20MB预算失败。

- [CI39027786241](https://github.com/big-dimple/dachoupai/actions/runs/39027786241) docs和[production-docs39027786207](https://github.com/big-dimple/dachoupai/actions/runs/39027786207)均15条P08 invalid evidence record；validator要求taskId及40位testedCommit。c452与4b0静态逐记录都为15条，属于既有证据格式缺口，不能作为有意保留的人验门或予以忽略。
- [domain job](https://github.com/big-dimple/dachoupai/actions/runs/39027786241/job/117382079997)16文件55失败、296文件4071通过。至少一个本批新增跨平台测试错误已精确定位：tangsong-player-terms固定Windows CRLF SHA47d2b0b0…，Linux/Git LF实际5521e9ed…；c452/4b0锁定JSON Git blob均为5521e9ed…，没有内容数据漂移。另有唐宋牌正名与旧字面/旧展示hash断言失配，以及旧推荐指数/技能名/成长措辞/音频/排版断言；未将全部55项说成旧问题或数值回归，需后续逐项定向修复，不改领域断言凑绿。
- [browser job](https://github.com/big-dimple/dachoupai/actions/runs/39027786241/job/117382079883)327模块生产构建已通过；烟测在harness/screenshot.mjs:82等待hand/cardViews超时30秒，日志phase=stage-ready、controller=idle、renderFps约60。该批GameScene/RunLaunch/烟测脚本相对c452未改，现有日志仅定位待战入口未跨过，不证明游戏死锁；后续需针对入口衔接诊断，未扩大重跑浏览器矩阵。


## 手机文字／正名／零成长小批

基线main `c4525b2c2faf77ad2df0b5486e0ea64276856d04`，产品 `60a81684058bec92c5fb8eabd0937550bd55ad49`。正常合入[68手机热修](../shop-owned-caption-2026-10-17/README.md)、[98玩家正名](../tangsong-visible-name-2026-10-17/README.md)、[71零成长](../zero-growth-caption-2026-10-17/README.md)，无冲突；路径分别21/21、61/62、5/6，唯一r2Help自动组合保留名称和零成长单位修复。锁定发布JSON SHA47d2b0b0…、规则/保存协议/历史/美术/AudioEngine/GameScene与c452保持；正名显示模板/文案JSON为授权范围。

本地[3文件12项交叉](checks/mobile-name-zero-cross.log)、[类型](checks/mobile-name-zero-typecheck.log)、[327模块构建](checks/mobile-name-zero-build.log)均PASS，source86/304分批/26及各自DPR3/实际菜单证据复用，不相加或重跑矩阵。整合者查看源390五槽图，仅为源图核对，不冒充新合版浏览器截图或实体Android验收。完整dist526文件/45172542B，20,000,000B预算仍FAIL，原chunk提示保留。

按用户本批重新明确授权正常dev/main发布，不force/改权限或安全设置，不等CI或再次回复；背景/工坊结构/资源清理后续，不混入。实际完整main SHA以成功推送回执为准。三项目标体验未达标/重新整改、P08与正式门、人验/设备/听感/触感边界保持，旧批和所有原FAIL证据保留如下。

## 当前后继合版：连续计分、统一触觉与手机商店

最终后继产品 `fe532299c50a659be65d01f0cdcfde4a6366fcb9`；所有必要来源已无冲突合并，含及时完成的[7c9详情艺术墙](../card-detail-background-2026-10-17/README.md)与[346公共文字采样/峰值安全修复](../score-raster-safe-area-2026-10-17/README.md)。7c9 30路径/4指纹、34616路径/修后4指纹精确；关键19产品路径的最终SHA归属见原plan.json recordingHold.finalFileAttribution。规则/存档/AudioEngine/原图/public/包锁与4314保持。源208/59/72/240等各按原范围复用，不相加。

最终本地仅补[2文件8项跨模块](checks/release-final-cross.log)（共享文字理牌消费者、秦琼原选牌/弃牌意图）、[类型](checks/release-final-typecheck.log)及[327模块构建](checks/release-final-build.log)，均PASS，旧chunk提示保留。构建后只改台账。完整dist526文件/45,171,422B超20,000,000B，仍FAIL，未删素材或放宽门槛。下文1629检查及夹具首次失败保留为历史，不冒充最终新测。

[c197](../amo-laohuan-dynamic-2026-10-17/README.md)/[361](../wencheng-huarui-dynamic-2026-10-17/README.md)原视觉FAIL不抹除；[2a](../amo-laohuan-public-fix-2026-10-17/README.md)与346只复验受影响字段及手机边界。346同事件75实际下缘326.78→265.20，框下缘285.6，乘倍率峰值仍约1.54；苏轼/文成/花蕊实际draw密度/越界/重叠0，保存全等。六人原分工证据齐，不声称全部按最终版本完整重跑。整合者查看源after75及390购买艺术墙图，只为来源像素核对，不代签新合版动态、人验或设备。

目标/阶段已得/实际余次/技能状态/真实来源分别保持，af9真实assistUsed与2a状态模块实际接线保留；隐藏的是提示光晕、动作输入由playing门禁禁用，重复长副文本不另起数字。商店英雄18%沉底仍限标准PC/手机竖屏；卡牌详情用当前卡图铺满/局部文字浅底/顶部44px原图入口，目标工作区清旧背景并保持手动确认，是另一明确范围。按已有授权正常dev/main发布，实际完整main SHA以最终成功推送回执为准，不等CI/用户回复，不部署/查域名。三目标仍体验未达标/重新整改，P08及正式门不关闭，听感/实体触感/实体手机/Safari/WebGL和自然长局未验；父级后续dot另行核对。



产品 `1629c0d2ac33851e950f4ca50ddb5fe0f5a6136e`；aac06056/e2e64946/a6b49d62正常无冲突合并，计分68与Shop39实际应用路径精确，计分10与Shop5指纹匹配（Shop原报告含CRLF/LF，仅换行差异）。GameScene精确e2e、ShopScene精确a6，规则/存档/AudioEngine/原图与public无增量变化。源[计分动态](../continuous-score-table-2026-10-17/README.md)按最终短屏两例/较早修订其余例区分；源[商店240与受控布局](../shop-flow-redesign-2026-10-17/README.md)复用，不重跑全套，不签实体手机/触感/听感/Safari。

本地5文件[交叉首轮](checks/continuous-shop-cross.log)71PASS/1FAIL来自旧秦琼无DOM意图夹具；仅补减少动态值及空标题查询，原行为断言不变、产品无改。[失败文件定向复验](checks/continuous-shop-handoff-recheck.log)3PASS，按每文件最新结果共72PASS、不相加成75。[最终类型](checks/continuous-shop-typecheck-final.log)与[326模块构建](checks/continuous-shop-build.log)通过；构建后只改夹具/台账，原chunk提示保留。完整dist526文件/45,167,559B超20,000,000B，预算FAIL保留。

18%沉底仅Shop标准PC及手机竖屏；短横/700–999中间分支及战斗结算不在覆盖内。main仍4314，等待01a147eb苏轼/辛弃疾与01a147ec文成/花蕊两路有界动态回执，连同秦琼/刘娥逐人覆盖；关键回归先修再main，不等用户回复。三项目标仍体验未达标/重新整改，正式门和P08不关闭。机器状态见原plan.json的recordingHold，不新建重复清单。 最新技能小字清晰度与计分关键字段副作用已纳同一台账，尚未验收；当前通过仅指上述1629产品软件检查，后续实际补丁需相应复检。

本四源批已普通推送dev/main至 `4314a2459ade4ea68133f67468c98f9f42b2e251`，ls-remote核实两ref相同；以下产品检查仍绑定4d496e20。用户录制期间的后继dev与main冻结见[当前批次](../../CURRENT_BATCH_20261017.md)，不将下一批触觉接线签为已上线。

**最新体验结论：** 用户最新明确否定三项目标已达到要求：计分爽感、商店联动、Boss压制均为“体验未达标／重新整改”。已有实现、提交和有界功能证据保留，不能由上线、单测/截图或局部参数调整推导目标完成。父级正在主动对照Balatro及成熟卡牌竞品并继续dot自然对局，形成具体差距与整改动作，不等用户逐项指出；后续动作沿本计划，不新开重复清单。眼图/状态/小图及已交付商店局部整改现已齐源，按最新授权必要检查后普通发布；三项目标未验收、需整改的结论不变。

## 独立眼神清晰度、秦琼状态、小图提示与商店正式改造合批

最新父级台账补证：父级dot08:15第3章自然两对1199＋四条8906＝本场10105/1800，已自然触发完整高光；观察到小HUD、长射线与全屏opaque打断连续性，作为体验未达标反例。此回执未给精确部署SHA，不将它冒称当前4d496e20合版或新眼图自然验收。 验收必须覆盖连续动态过程及动态视听触，静态截图/函数参数只能作局部证据。用户休息或未录屏不是停工理由；父级继续竞品与dot自然核查，现有2–3层音效归N01不重复立项，听感仍缺。统一触觉由01a148f7补，当前源仅OwnedJokerHaptics的12ms拾取；API实现、设备支持、人体感受分别验收，不相互代签。 美术规则沿既有规范细分：原比例完整；原图自带框不再外套多框；角标签移图外；大背景仅局部压暗且商品不整张灰；选择轻抬柔光。先核商店505a范围，跨场景覆盖保持开放；按钮呈现代码统一不以新图为依赖。 08:10三目标明确未达标，不能把已交付软件或局部清晰度通过签体验完成。原聊天Sentinel来源与06:12–08:26边界在eyes-followups.json，不新造另一清单。

基线main43725f697b58ebb64bfa47197512d2d39fe46a48；最终产品`4d496e205ed4683bba5db901e16f1c17fe9b590c`，分支dev/eyes-followups-integration-20261017。已正常合入b4397417（含efbed六眼图）、b8c89e8c已押状态、fd7c888d图下提示，以及在本批尚未main时交付的最终c9f5f534商店运行时（含505a）。无冲突；[逐路径/指纹与精确检查](eyes-followups.json)保留三源47/6/13路径和Shop累计实际应用64路径：fd7仅DetailDialog.ts及其测试由505a有意续接生命周期API，其余主体精确；b8的README由c9补入已完成场景证据，核心代码与测试保留；b439/b05完整原图/p08/48,306B高光及规则/存档/音频不回退，GameScene仅采纳精确1607445b接线。Shop分支有fd7/67b两个共同祖先，按正常多祖先合并，没复制旧整树或恢复旧图。

[眼神与最终清晰度来源](../dedicated-hero-eyes-2026-10-17/README.md)：6个真实2048×768透明原图/完整768×288派生/提前准备原字节保留；原50仅按资产/眼区稳定/真实来源范围复用。父级指出的峰值糊字/红线碰标签由b439窄修：提前按峰值准备位图，1×实例实际2×，默认文字采样保持；逐帧像素对齐，按实测眼图/来源图/标签bounds避让，1px飞入到达淡出。只复用秦琼/刘娥2例charge/flight/impact，标签外扩6px红像素各23→三阶段0，眼区不动/完整保存一致；源40后仅12补验，不机械相加。整合者查看两张源最终命中图，未重跑六人或伪称当前新截图；原不清晰命中帧保留为历史失败输入。

[b8已押投影](../touye-locked-skill-state-2026-10-17/README.md)93项精确复用：真实保存target显示“已押实际目标 · 出牌后结算”，非红色待完成/非行动机会。最终c9/1607445b已在本批未main前交付并正常合入：drawing/换牌中→locked/已押真实目标→settling/结算中→used/已用，3个不可行动阶段禁用且不催促；phase仅场景内、finally/create/shutdown及过期回调清理，不入存档。原93包含在最终108内，鼠标/触屏0错误及完整保存/RNG一致的源证据复用。原授权范围拒绝后以直接证据一次重试成功的历史保留；现在不是待交付接线。[fd7小图](../art-zoom-small-image-2026-10-17/README.md)去图内黑字底、图下单行、整图ARIA键盘/关闭焦点保留；历史150/10短流程按原范围，DetailDialog后来由Shop续接，不能再说该两文件未改。

[505a商店](../shop-flow-redesign-2026-10-17/README.md)正式交付运行时：唐宋牌/消耗工具/长期物品明确分类，PC/手机单一工坊入口，升级/改牌/染色沿原报价与每店共享机会；商品完整contain并放大图窗，无外套框/图内版次稀有角标；提示就近锚定避侧栏，真实已持配合保持。购买保存后同一个原生modal进使用，目标空选、明确确认/稍后使用；无目标页紧凑，需要目标才选牌。只增加DetailDialog owner复用生命周期，不回退图外鉴赏。父级已看1912-shop-final/1912-targetless-tool-final/390-purchased-select-target-final。源223、最新鉴赏167及桌面/手机完整状态/冷续局和最后native :modal检查按原SHA复用；源码10个运行指纹全部匹配最终产品。原backdrop丢失、夹具/观察器及审批范围拒绝历史原样保留；场景owner获直接授权证据后已交付1607445b，当前仅正常合入该已交付来源。

本地仅补共享TextRaster与43725理牌消费者[2文件20项](checks/eyes-followups-cross.log)通过；Shop后这组源/测试无变，保留1bdbe06b原结果不重跑。晚到Shop改变产品，故对中途b418重检类型/326模块构建通过，随后c9新场景源码到达，故仅重检最终4d496e20的[类型](checks/eyes-final-typecheck.log)/[326模块构建](checks/eyes-final-build.log)通过；此前324模块日志只是历史中途快照。无新完整浏览器/单测矩阵或自然长局。完整dist526文件/45,215,166B仍超20,000,000B，预算FAIL与历史图源缺证/源基线FAIL不自动关闭。

用户最新授权四路一起普通dev/main push，不等后续连续计分重编排或统一触觉新批次；实际main完整SHA以成功回执为准，不查CI/域名/部署。**计分爽感、商店联动、Boss压制三项目标仍体验未达标／重新整改**；本次商店软件候选/局部可读性通过不代签目标，父级竞品对照与dot自然局继续给具体差距/动作。新合版自然/真人身份与理解、heard=false/物理设备和C04/A03/V01/L01保持，P08仍in_progress。

本次发布前最后增量仅GameScene和7项场景测试及其原生证据，正常合并无冲突；b439叶模块/原图、b8核心、fd7提示、505a商店代码均保留。源场景4个SHA指纹与最终产品匹配，20项交叉涉及代码未变，不重跑108/223等已有检查。最终完整dist526文件/45215495B仍超20,000,000B；前述b418预算只为当时测量。

## 共用放大与理牌精修整合

基线main `a73d9ec2faae6e537e77a975f02e0a2cef220074`；来源9ec861adce4e8e088d638dc36800ff9cac304ad7和d98b72f2c7a63de0d384a21cd00dbabf58255468已无冲突合入dev/zoom-sort-integration-20261017，最终产品`fb6f699c8ac9d0db9d684ed68f3d6596ccfee9ac`。两路26增量路径与来源blob全部一致；GameScene、ShopScene、规则/数值/存档/音频、public/原图/manifest、包锁与a73保持，完整b05原图、当前hash及48,306B高光不回退。[精确绑定与检查](zoom-sort.json)。已获准普通dev/main合批push，实际远端完整main SHA以成功推送回执为准，不等未完成商店下一批，无CI/域名/部署。

[共用放大来源](../common-art-zoom-2026-10-17/README.md)将CardArtSource/cardArtSource/portraitCardArt、DetailDialog和CardArtZoomModal统一用于72唐宋牌+39工具/升级+12长期物品。按当前注册的精确高清/缩略URL对认图，拒绝旧路径/跨卡混配/机制示意；黑底完整contain、44px关闭/Escape/焦点返回与解码失败重试保留，没有真实高清则不出入口。现有615×768详情被复用，未新增原始更高像素管线；原字节未改。来源152项和10短组件流程/type-build精确复用，源首次重试焦点FAIL及goods-art两条基线旧文案FAIL保留。

[理牌来源](../hand-sort-polish-2026-10-17/README.md)在HandActionControls、SceneView、HandSortButtonVisual仅对三技术ID添两条低对比细短分隔；鼠标纸面/文字2px轻抬、浅底细阴影，固定44px hit不动，触控/失焦/后台/禁用清理，reduced motion位移0，字形按现有字体与crispText光学对齐。原排序/AI、键盘焦点与其他按钮保持，SelectionStageView排除；源35项/构建和有限PC/手机DPR2真实触控排序证据复用，原误判no-op的检查更正按源说明保留。

当前合版只新增[resolver3项](checks/zoom-sort-resolver-cross.log)：实际现行72注册对包含b05-v3新路径/完整hash，并遍历39/12资源及拒绝过期/混配；配合manifest逐blob等于a73，不需要改resolver或新图。[类型](checks/zoom-sort-typecheck.log)与[323模块构建](checks/zoom-sort-build.log)通过，原大chunk警告保留。不重跑152/35或新浏览器矩阵，不机械相加检查数。来源放大4产品文件、理牌3产品文件指纹均可匹配；理牌报告还记录其9e015的GameScene浏览器上下文，与现a73/67b不同，JSON明确区分，不能把源旧牌桌短流程称当前合版自然/浏览器复测。

已更新现有计划/逐项表，不宣称新商店布局/重排/购后流程完成；该路仍由01a148ba接线且不纳入本批。完整dist519文件/44,518,174B仍超20,000,000B，历史图源缺证与源基线FAIL按原回执开放。本批图像完整性/软件组件检查不代签新b05放大观感、全部123浏览器、真人阅读/听感/物理设备、自然眼神高光或正式门，P08仍in_progress。
## 战前/新图批最终整合

基线main `9e015286d1d223afad0a6e6b2860fcfed1457faf`；最终产品 `d2029a560330671a62354c3374cfdfd7a5b2e0e5`，分支dev/prebattle-art-integration-20261017。战前67b4b2cdd10ce8b6ffcd1a10f6bdb55a9f6ab865和艺术2e22aa3137db107f508de7dc0b2ee5bbe53c1ece已无冲突合入，两源43个增量路径全部与来源blob一致，6a044秦琼紧凑提醒及9e015购买修复保留。[精确回执/来源绑定](prebattle-art.json)。用户现已明确授权齐源后普通dev/main合批push，覆盖前一dev等待边界；实际完整main SHA以成功推送回执为准，不等新商店/高清鉴赏/理牌精修，也无CI/域名/部署。

[战前来源](../prebattle-flow-2026-10-17/README.md)68项、最终type/build、8条有限短原生流程按精确源码复用：H14节目单的Shop/章节/待战入口、H16规则实际可见记录共享、离店沿原LeaveShop/EnterStage直接入场、未见恢复/主动查规则均已接线；序号/owner/首次入场封口和危险操作确认保留。来源六浏览器hash为CRLF工作字节，当前逐一精确匹配；初次直接比Git LF失败说明及两种hash仍在JSON，未改源报告。不是新合版自然或全Boss/模式验收。

[最终艺术来源](../b05-fengmingchaoyang-2026-10-17/README.md)48项/构建/来源核对复用，含[2229的现行/历史来源分层](../handdrawn-provenance-2026-10-17/README.md)和70340cc5真实原图归档：b05展示名凤鸣朝阳，用户文件风鸣朝阳.png为1122×1402完整PNG，SHA25611055d52…a6b1e45，原字节保留；旧JPEG严格解码已确认截断且保留历史。新contain缩略/详情使用新内容hash URL，其他80条资源记录完全不动。schema v2 currentSource逐一绑定当前72原图，historicalSources明确旧来源；9项derivatives-only及上一代11缺映射/61缺原文件仍未补齐，不把现行来源通过签成全部历史闭合。

必要跨源检查发现新b05详情换图后，高光清单仍指旧详情hash，保护会拒绝该旧绑定。[首轮原FAIL](checks/prebattle-art-cross-initial.log)：14项中13通过/1失败。只用既有build-climax-source-art --id b05重建完整源区域的320×400派生，48,306B、SHA256e4df8afc…657e5c5，绑定新详情808bf2fb…36a3ec7，其他71条高光记录不动；单图--check复现通过。专用派生/详情复用从52/20成为53/19，共72，96KiB/768px阈值完全保持，当前最大选用96,814B；不是扩大传输上限。测试只更新由新图导致的分类数，保全部文件/hash/几何/失效守卫。[仅失败文件14项回归通过](checks/prebattle-art-cross-regression.log)，未重跑68/48或浏览器矩阵。整合查看新派生完整凤凰/朝阳城景及四边，没有重新生成原画，不代签用户观感。

最终清洁产品d2029a56的[类型检查](checks/prebattle-art-typecheck.log)和[321模块构建](checks/prebattle-art-build.log)通过。原回归在提交前执行，之后仅测试注释空格调整，产品资产与最终提交相同；JSON保留准确运行态。本地完整dist **519文件/44,514,019B，高于20,000,000B，FAIL未关闭**，沿assets-runtime全目录含保留旧副本口径，非网络传输测量；源分支替换前已有44,314,529B、新图源分支44,459,864B的超标，当前不删旧图或扩整包瘦身。首屏146项17.01MiB/20MiB是另一解码口径，只按来源48项证据引用，不能抵消整包FAIL。来源扩展检查goods-art两条旧文案断言/public-art-privacy两条Windows EPERM也仍按原FAIL保留，不宣称全量绿。

P08保持in_progress。H14/H16软件实现与同版静态接线齐、H15当前72源绑定已修，但历史缺证/整包预算、新合版自然流程与b05运行观感、未自然触发眼神高光、heard=false/真人理解/物理设备及C04/A03/V01/L01正式门均未自动关闭。

## dot 自然试玩后的两路小修

本小批基线main `a470da228a85283eabc00811f610ba6a41a38738`，两路正常合并产品 `b1916e6c6b00bdf6635882755b671ce7a4e8892c`，分支 `dev/dot-followup-integration-20261017`，无冲突。两来源26个增量文件全部逐blob相同；复用来源31项与60项，不新增/相加重复单测或浏览器矩阵；只补整合类型/321模块生产构建通过。[本小批精确绑定/检查/实测回执](dot-followup.json)、[类型](checks/dot-followup-typecheck.log)、[构建](checks/dot-followup-build.log)。现有大chunk警告保留，规则/数值/存档/GameScene/音频/public/包锁零改动。按最新授权正常dev/main合入push，实际完整main SHA以最终成功推送回执为准。

- `6a044ee1e21f907212f3464ef7f05b0d7c53b703`：HeroPlayReminder.showHeroPlayReminder的秦琼首层只留重选1–5弃牌/押目标、真实弃牌消耗和B07金币、下一手成功×2/失败×0.85，细则以“押注规则”折叠。重选、按原选择出牌、取消三操作与不再提醒保留，取消/返回不改原选择或保存，每次有资格仍提醒。31定向及type/build由父级来源回执复用，源仅2产品/测试文件，没有虚构提交日志。
- `43216be21d1ac551fb1ffdc55ad4bb67eebb0cc5`：shopDecisionCopy原来以新购成长读取0覆盖c04整牌收益，漏掉顺子/同花顺固定热度+50。现在同时呈现该条件+50/新购成长0，随后成长+10、下一手用/上限100、已有成长每手可用跨场保留；规则定义和实际成长未改。ShopScene购买层去重，邀请改购买。Boss备战页按内容收高且页内完整限制只一处；不宣称跨三处规则已去重。[来源60项、原失败和短受控购买](../shop-purchase-consistency-2026-10-17/README.md)：23→19、取消state/journal/storage不变；1180×757约760×460px，390×844约352×450px，仅来源实测，当前不重新截图/矩阵。

父级dot**自然**回执对应可见站点a470：秦琼第2章正场1705/1350（末手1092），贵宾Boss1874/1800（末手145）；来源连线/数字增量、理牌顶标、等宽主按钮、技能真名与弃牌流程可见。不是b191小修的新试玩，也不把源受控23→19购买混成自然经营样本。没有自然触发全屏眼神高光，音频工具不支持听感，heard=false，不能签全部音画/流畅/真人/物理设备通过。

新反例H16：备战专页→章节目录→场内确认重复同一Boss规则三次，**尚未修**。后续协调按完整身份+Boss场次共享真正可见记录，主动查看仍可达，不入存档、不跳过危险消耗确认；本小批只登记，H14节目入口/H15原始图源链保留。P08维持in_progress，正式门不解锁。

## 前批四路整合证据（产品 e978f295，已发布 main a470da22）
基线 `212e23d547d4fcfdd886f9dfe80699318e77a738`；最终产品 `e978f295136c48f999895e2e9333f8c0b93cc5c1`，开发分支 `dev/feedback-batch-integration-20261017`。四个最终来源已正常合并，无冲突；来源齐全后集中验证，最终按文件去重 **31文件365项通过，类型与321模块生产构建通过**。P08保持in_progress。本记录属于交付提交；正常dev/main发布的完整SHA与是否push成功以最终回执为准，无部署声明。

|最终来源|精确SHA|最终同blob/原增量路径|
|---|---|---|
|数字音阶|5273a1fa3099d29aba7a1300de7560c3d644ed1b|17/22；5项为本批授权分层与测试增量|
|高光、底栏、六英雄名|09249ad5c6e382c56f19a395cbde150d0e3b9153|50/52；2个来源显示入口补T18正名|
|手机结算内容节奏|236acc4cac8b990af9b622179dff4ccdc1e5c774|2/2|
|商店与Boss备战实际接线|3b22614b86e73ba135e3be65db3fc90516300134|50/55；5项去除被用户覆盖的T18比价|

[逐路径绑定](source-bindings.json)记录来源/最终blob及每个例外；GameScene严格保持09249，未再次应用owner-only.patch；IntermissionScene/SettlementPresentation严格保持236acc。规则、数值、存档、src/domain/content/application/platform、public原图/素材、package与锁文件相对基线零差异。

## 三项体验目标各自的交付

- 计分：ScorePosture/HeroClimaxStage与GameScene的实际arrival保持18px、±2.5°及数值回弹；ScoreTextLayout修实际缩放被1.0夹住的问题，来源峰值约1.28/1.36/1.539；高光落数与strike同次到达，去除额外160ms。音频在最终来源的整手正向事件八档大调[0,2,4,5,7,9,11,12]上补材质分层：普通加法钟音+短木，关键加法35ms木尾，大触发钟音+重击+45ms纸尾，乘法钟音+重击+65ms木尾。主音/重击在数字arrival，普通项不带重击；gain、去重、取消、静音、快速播放与voice预算受测。实时画面/主观同步和听感仍归dot/用户。
- 商店：撤可见星级、起手角标/路线潜力标签及选择勾，保内部算法；显示真实新购值、条件、购后现金与保守配合。首击稳定三行说明按实际密度清晰栅格，44px详情入口；只持牌边框呼吸，文本不呼吸，减少动态静态保留。ShopSynergy条件实现未改；无依据或互斥条件不亮成正配合。不再滚动假余额中间帧。有限原生视口/购买取消证据只按[Shop来源](../shop-experience-2026-10-17/README.md)原范围复用。
- Boss：正式[模块及实际接线](../shop-boss-wiring-2026-10-17/README.md)纳入同版。Phaser create/首帧后尝试备战页，真正可见onReveal才切boss曲/一次提示；seen/deferred/失效/隐藏/关闭后重试和场景清理分别保护，继续/关闭不提交规则命令，去重不进存档。BossPressure区分“普通点数归零”与“此牌计分含增强/版次失效”，以及“大丑牌计分与版次停用，经济/静态/结算后成长按各自条件”；不泛称全部倍率失效。

## 底栏、技能名与结算交叉

HandActionControls以14px标题行上置“理牌”，下方点数/花色/AI短标签；桌面144/手机132分组，触区至少44px，弃/出等宽并获得剩余空间。AI完成候选复用、完整key/真实等待及取消边界不变。六技能显示名为余音袅袅、跃马冲阵、众里寻他、垂帘听政、文成和亲、花蕊赏赐；HeroSkillPresentation投影到按钮、提醒、回看和结算来源，技术ID/旧身份不变。手机结算按内容收高，奖励/利息和下一步更集中，红封不重复；与名称来源无路径冲突。来源报告的局部软件图不复制、不上传；手机源仅2产品文件，没有虚构已提交日志。

## T18最新用户决策覆盖

名称改为 **换货券**，首层 **刷新一次商店商品**；说明只保留货架范围与使用时点，通常价格仍显示。删除ShopRerollEconomyCopy及新增的“比直刷省/多花/已持有成本”各入口与死样式。tangsongCardNames/cardDefinitionName、toolInfo、货架用途、库存/奖励/回看均走UI投影；内容定义仍保留原始name参与既有hash，T18、4金/优惠价、素材关联、刷新次数/成长机制及存档不改。原Shop来源的T18比价方案已被用户明确覆盖，不再列为验收目标。

## 检查、失败与音频证据

[命令与去重口径](checks/commands.json)：首批26文件334项中333通过/1旧名断言失败；仅必要显示边界6文件47项中46通过/同一目录用例的旧label断言失败；最后只回归工具目录和Shop文案2文件19项全通过。前两次[原FAIL](checks/focused-initial.log)、[边界回归原FAIL](checks/name-boundary-regression.log)原样保留，未改价格/效果领域断言凑通过；final365为每文件最新通过去重，非334+47+19，更不叠加owner重叠项。source-stage-art核72真实文件/映射/hash/解码与预算：52专用派生守96KiB、20复用详情。

[类型日志](checks/typecheck.log)退出0；[构建日志](checks/build.log)退出0，现有chunk>500kB警告仍在。检查绑定清洁产品e978f295；其后仅文档/证据。

[8.36秒短WAV](layered.wav)、[事件/音层/输出采样](layered.json)与[复现脚本](render-layered-trace.mjs)：真实scoreSourceProcessFixture(chain)通过PlayAssistedHand得到保存trace，23项正向数字事件、真实目标和numberImpact，实际AudioEngine/CC0录音/一个真实OfflineAudioContext/生产bus+压缩+限幅；主音rate1→2逐档后封顶，主音均在arrival，2/3层。peak0.39682，无削波；重击带来较低频能量，所以不能把每次输出最强FFT峰单独当旋律基频。测试还覆盖大触发第三层，当前短trace不假称所有分支都出现在录音。录制HEAD为合并快照2b7e8dd，音频3源文件规范化SHA256逐一匹配最终产品e978f295，见commands.json；不冒称录制时已是清洁提交。固定320ms是短探针节奏，SFX-only，非GameScene连续帧或现场BGM混音。父级音频输入工具不支持播放，**heard=false**，不签真人听感/物理设备。

owner既有范围分别复用：[原音阶113](../score-melody-audio-2026-10-17/README.md)、[姿态51](../score-posture-pressure-2026-10-17/README.md)、[底栏](../hand-action-footer-2026-10-17/README.md)、[六技能名226/最终接线17](../hero-skill-name-projection-2026-10-17/README.md)、[商店](../shop-experience-2026-10-17/README.md)、[Boss](../shop-boss-wiring-2026-10-17/README.md)。不把来源本地截图说成本次整合截图，不重做浏览器矩阵。

## 已登记且本批不扩修

节目选择在Shop.inspectChapter已只剩presentStageSelection，未接showPrograms；GameScene进入await-input后的现存入口又不在允许选择的shop/stage-ready阶段，故节目选择开战前入口有缺口。先登记后续最小接回，挑战模式全局入口未完整审计，不扩大结论。

72张替换资源仍有运行时新字节/hash校验；manifest的sourceCommit/sourceManifestSHA256沿用历史元数据，handdrawn-art.test对ALL72_IDS跳过原来源绑定断言，缺口是新图原始来源链未独立对齐，不是全部取消校验。本批不修改该断言/manifest或重新跑美术流水线。

两项都见既有[需求台账H14/H15](../../REQUIREMENTS_DECISIONS_COMMITMENTS.md)；不阻塞本批，后续独立处理。P08、C04/A03/V01/L01、复杂/旧身份长规则、真人理解、听感、物理设备和当前整合版dot自然复看均保留未验边界。没有自然长局、CI/域名查询、部署或强推。
