# 当前交接：P08全游戏手绘墨线／纸色主线

## 当前发布与验收状态

已核 remote main `d1c072dff5055238bd94775a14f2fca44c4d38b8`，精确 [CI37238909688](https://github.com/big-dimple/dachoupai/actions/runs/37238909688) 与 [production-docs37238909684](https://github.com/big-dimple/dachoupai/actions/runs/37238909684) success。

| 项目 | 当前状态与边界 |
| --- | --- |
| 已发布手绘覆盖 | Joker72/72、原6角色/JQK；P08 165 WebP／4,454,670B。工具39/39、物品12/12，goods102 WebP／1,742,780B；最后十二图已发布。 |
| 铜钱消费 | 批准单图256²／15,958B；旧atlas归档，保原800ms显示和已保存奖励去重。A03整包planned／humanGate保持。 |
| 牌组查看本次review | [共享查看器证据](production/evidence/p08-deck-inspector-2026-10-04/summary.json)：source 624bc28cae3b3f94e19468e91957446ee5d0c577。13点数与花色、Game全部／剩余及增强筛选；Shop原菜单默认全部持久有效牌，不显示下一场剩余。 |
| 本次实际检查 | 36相关tests、type、clean构建和320／390／844×300 top12/bottom34原生输入通过；全run／seq／RNG／选牌保持、滚动／关闭／回调释放、真实复制／改点数／改花色／增强与reload计数通过。三图actual view，五次检查器FAIL原身份保留；只有review，新CI另报。 |
| 原流程证据 | D7b自然流程仍固定runtime7b787773，只到首Boss；T06–T11及S01–S08为原生fixture，不证明自然获取／当前main全流程。既有证据与历史FAIL／NOT_RUN不改。 |
| 剩余门禁 | P08 in_progress；整体审美、OnePlus、GPU、听感未通过。C04 D32暂停，resumeContract与V01/L01保持。父协调串行main，不自动推gameplay／部署。 |

只读产品改动已完成后才校准上述当前数字；领域、save、RNG、所有素材、手牌布局、火和音频树保持main。主线验收清单见 [P08](production/WORK_PACKAGES.md#p08)。

## 历史检查点（按各自 SHA 保留，不作为当前调度指令）

以下记录逐SHA保留，不作为当前调度。

### 本次校准前的当前记录（原文保留）

P08手绘铜钱有界review：交付f44320be经sourceCI/portable/hash/实际view；单图256²15958B，活跃旧atlas不再消费，旧文件保留。source2ebb590仅RewardCoin.ts，800ms墙钟单次/56-72-96原display scale、5秒截止/取消/迟到不缓存/reduced静态与原clearId奖励去重保持，e07实际9金只展示。49相关tests/type/content及5条Canvas原生路线通过、两张fixture实图actual view；正常合已发布main719保C最后12、工具39/39物品12/12，图片保原build身份不重拍。暂不main、新reviewCI另报；整体/OnePlus/GPU/听感未验。 证据docs/production/evidence/p08-handdrawn-reward-coin-2026-10-04/summary.json。

## 当前发布与验收状态

当前 remote main 基线为 `58e9d223ee5f29b965532551e71afc6fc6785d51`；精确 [CI37231962418](https://github.com/big-dimple/dachoupai/actions/runs/37231962418) 与 [production-docs37231962445](https://github.com/big-dimple/dachoupai/actions/runs/37231962445) 均 success。最后十二图目前仅 review，发布覆盖按此 main 读取。

| 项目 | 当前状态与验收边界 |
| --- | --- |
| 工具包与窄屏修复 | 工具包7b787773及749a85ee两修复已发布。320十四牌仍五牌分页、390十四牌两行、普通九牌一页；OnePlus真机未通过。 |
| main 可消费手绘 | Joker72/72、原6角色/JQK；P08 165 WebP／4,454,670B。工具27/39、物品12/12，goods78 WebP／1,266,494B，已含P02–P07。 |
| 最后十二图候选 | source1cbc3e7的P08/P09/P10/P12/S01/T19及source6d3596b的S03–S08，S04为v2。仅两个指定目录和24图、12个真实ID；候选39/39、102 WebP／1,742,780B，尚未发布。GoodsArt与原缩略图／按需详情消费通路保持，P12/S04各一张实际详情通过。 |
| 铜钱候选 | RewardCoin.ts的16帧／800ms atlas仍由IntermissionScene消费实际已提交过关奖励；A03整包仍planned／humanGate，人工审美和真机未通过。 |
| 六工具实际使用 | T06–T11原生fixture已验收；原source f10d2d0、review98b66db4、精确CI37228691506 success，原报告与三图身份保持。fixture不证明自然获取或完整自然流程。 |
| D7b 有界自然流程 | [e899194原证据](production/evidence/p08-natural-run-2026-10-04/README.md)及CI37231091422 success，11文件按原blob/mode纳入。实际runtime固定7b787773，首Boss1018/800、seq26/journal25、奖励2→10金与唯一T16补给、三次恢复通过；T10自然购入和使用。停止首Boss结果，未进入第二章、T16未使用；不扩写为当前main完整八章或设备结论。 |
| 剩余门禁 | P08仍in_progress，整体审美、OnePlus、GPU、听感未通过。C04 D32暂停、resumeContract和V01/L01人工／多人门禁保持；不自动推进后续gameplay。 |

本批 [最后十二图与证据审计](production/evidence/p08-tools-final12-2026-10-04/summary.json) 和D原证据仅交 review，父串行协调main；运行源码、旧资源、严格五动作smoke、六工具原证据保持。历史 [状态校准](production/evidence/p08-delivery-state-2026-10-04/summary.json) 的21/39及各旧报告覆盖数字保留原身份。主线验收清单见 [P08](production/WORK_PACKAGES.md#p08)。



以下旧“待 CI／待发布／下一任务”仅属于记录当时；历史 FAIL、NOT_RUN 与数字不改，当前调度由上表覆盖。

P08两处手持设备修复combined review：正常合已审/精确CI通过B2bca8c8（十四牌计数）与本5ca6a8c（320商店卡条），保mainf10工具15/39及全部资源。合并仅三docs冲突且双记录保留；运行只GameScene.updateHandCount+ShopLayout/ShopScene，逐字节同双方已审代码。147相关tests/8files/type/plan PASS，不重拍双方原图；320十四仍分页、390十四两行，不改手牌位置命中/规则/RNG/save。新combined精确CI另报，main待父放行，整体/OnePlus/GPU/听感未验。 证据docs/production/evidence/p08-shop-rack-320-2026-10-04/combined-fourteen-review.json。

P08 320卡条review正常合入已发布mainf10d2d0（T13–T18六图）：src同已绿c7cd7c5，92相关tests/type及12新增WebP portable/全54runtime hash PASS；工具15/39、道具12/12和朱砂/工具包/失败摘要逐树保main。旧两图不重拍/不改身份，父侧方向通过，独立hit/短横审查另行；未混B14计数候选，不推main，新精确reviewCI另报。 证据docs/production/evidence/p08-shop-rack-320-2026-10-04/f10-main-alignment.json。

P08 320商店卡条独立修复review：main5d54421基线、源码1557d41。实际复现原344宽/首x=-12末332、卡体428.8和命中450.8碰按钮424；54.4×76.16紧凑5:7、14px四字名利用座位间隙、命中止于按钮前4px，三货/工具入口/行动锚点保持。实际短横safeTop造成shop.top24的3.6px旧交叠同预算修；88受影响tests/type/build及320/390/844原生详情取消/工具包/调序状态比对PASS，两图actual view。原图B商店功能仅测试叠加且bd/7b两模块等同；后正常merge已发布main7b78777，88tests/type/build及同三组无overlay原生回归PASS，保持新main GameScene/工具/资源逐树相同；当前只是review，整体/OnePlus/GPU/听感未验。 证据docs/production/evidence/p08-shop-rack-320-2026-10-04/summary.json。

P08 14牌修正父图审后正常main对齐（UTC 2026-10-04）：父实际看320/390两图并读仅updateHandCount diff，局部修正通过；边界为320十四仍5牌分页可逐张操作，390两排全14，普通九牌一页保持。正常无冲突merge sourcea2a2107合已发布mainf10d2d0纯T13–T18资源；GameScene逐字节同已审e96e971，所有public/art与布局/ShopLayout/火/audio/domain/content/规则逐树同f10。59相关tests/4files/type PASS，检查前后source/index/HEAD一致；两目标九牌单页与十四分页/两排几何专项PASS（非新原生），工具15/39、道具12/12、Joker72/72，goods54files870142B/P08 165files4454670B。旧两实图字节/sourcefccddf7身份保持，不重截图/原生/全矩阵。仅新review精确CI待报，main不推进；六工具真实使用仍下一独立任务。证据docs/production/evidence/p08-tools-fourteen-2026-10-04/main-alignment.json。

P08 14牌竖屏缺口有界闭环（UTC 2026-10-04）：基线已发布main7b787773；合法原生14牌/工具2/3 fixture，非自然获取。320真实选J复现计数盖点数8px，原FAIL与局部实际像素检查保留；仅GameScene.updateHandCount将计数/页码分两行移至既有工具包左侧，卡位/命中/底栏/字体/待出区及ShopLayout不改。sourcefccddf7 exact modified=false，55相关tests/3files/type、一次软件Canvas320×568与390×740 PASS，source/index/HEAD一致。320十窗口逐张点全14，390两行全14；全牌点数花色>=14且无遮挡，原生选/取消全28个逐一通过，选5后预览/工具包/出弃bounds互不挡，出弃实际触点命中后取消，工具包开/关选牌与完整run-RNG不变；仅两张完整页已actual view，父独立图审与新精确reviewCI待接。全部资源/规则/save/火/audio保持，main未推；六工具实际目标/使用验收下一任务。证据docs/production/evidence/p08-tools-fourteen-2026-10-04/summary.json。

P08工具包正常对齐C已发布main（UTC 2026-10-04）：父已完整批准review0452e418并独立确认精确CI37224263669 success；正常merge源码ab4d626合入main5d54421，仅AGENTS/handoff/plan三处文档冲突，双方历史/evidence与C completionScope保持。C六张T06–T11资源、两处CSS删除、只读失败摘要及其测试逐树同main；已批准工具包产品/样板逐字节同0452。26相关tests/3files及type PASS，当前runtime逐SHA零不符：72/72 Joker、6角色/JQK，工具9/39、道具12/12；P08 165files4454670B，工具42files643054B。未重截图/原生矩阵/全冻结，旧证据保原源码身份；本新review精确CI另报，main待父串行授权。证据docs/production/evidence/p08-tools-entry-2026-10-04/c-main-alignment.json。

P08失败摘要review已由父侧读完整源码并实际view390 after，局部方向通过；已正常对齐main2d999cd（含朱砂/72人话/12道具），仅UX冲突且双合同保留。合并源码0aa7399，65相关tests/type/build及自然胜败/刷新继续/同种子重试/短摘要详情PASS，GameScene/ScoreFlame/audio/public/art逐对象同main。既有图身份不变，无新截图；320构筑裁切明确OPEN，未修。本review精确CI另报，main不推进；整体/OnePlus/GPU/听感仍待验。 证据docs/production/evidence/p08-failure-summary-2026-10-04/main-alignment.json。

P08 72张人话文案main7d44已正常FF发布，精确main CI37221283754与production-docs37221283740 success；局部方向接受，整体/OnePlus/GPU/听感仍未通过。本次有界失败摘要review源码9e1a176：实际颜色已被共享纸墨映射纠正，无颜色缺陷；真实失败只露差额，补已保存原因/最后一手/剩余资源。35受影响单测/type/build及自然胜败/恢复/重试、390/1280/844有限文字bounds PASS；review新CI另报，main不推进。 证据docs/production/evidence/p08-failure-summary-2026-10-04。

P08工具包CI真实失败与合同修正（UTC 2026-10-04）：父图审/独立合并审查已通过bd3840d，但精确CI37223525814 browser job111498414350 FAIL；真实日志为screenshot.mjs112旧常驻四动作列表，仅多已批准action/tool-inventory。build/domain/docs通过，失败前后source/index/HEAD一致；不是观察竞态或安装故障。保原FAIL/redacted摘录及私有完整log哈希，不重试旧job。仅sourcebb62c1f同步严格五动作列表，并加原生工具包开/关全run-RNG及选牌保持断言；其他断言/timeout不改。系统Chromium151原smoke桌面1280×720/DPR1和手机390×740/DPR3 PASS，校验前后source/index/HEAD同。src/tests/assets/art逐树同bd3840d；不改产品/火/CSS/规则。正常新review+一次精确新CI待报，main禁推待父串行。证据evidence/p08-tools-entry-2026-10-04/ci-failure-resolution.json。

P08工具包正常对齐朱砂main（UTC 2026-10-04）：正常merge0080fb9合main2d999，两处GameScene冲突按main删除旧burst/shockwave/庆祝章，不复活旧效果。sourcedb00121 exact modified=false；仅工具包实际button加入外扩3px保护guard，原action前景收集自动保按钮/纸底/字在墨线上。头像块、refreshScoreFire/ensureScoreFlame/impactAccumulator/keepScoreReadable方法原文同main；ScoreFlame/AudioEngine及跨档/层级测试、CSS/DetailDialog、文案/assets/domain/application等字节同main。46相关/3files、type及320软件Canvas合法原生流程PASS：实际计分ink索引6，avatar7/entry50/art48/label49，29 guards含新按钮，所有maskpieces不相交；计分时原生点工具包/关闭全run-RNG不变，真正Play结果同applyCommand。四张新完整页actual view，字仍71×17完整在88×44/112×44。仅新review精确CI待报，main待父串行；不扩矩阵、14仍单测、不碰C图片CSS修复。证据evidence/p08-tools-entry-2026-10-04/ink-main-alignment.json。

P08工具包字面消歧（UTC 2026-10-04）：父已实际看game320/shop390/game844 bottom34，入口位置与手牌空间通过；仅按反馈把两场景库存、标题和空态统一叫工具包x/y，商品分类仍工具。source9c8e22d exact modified=false，16专项/type及320软件Canvas原生购买/取消/两场景各一次保存使用/reload PASS；文字71×17px完整落在Shop88×44/Game112×44内，三新完整页actual view。与1354的布局/货品/所有按钮frame-font/待出牌工作面逐值相同；GameScene/ShopScene/CSS/DetailDialog和素材本轮字节不变。不重做布局颜色、不扩设备或14矩阵，14避让仍仅单测；CI交父跟进，main仍等待串行放行。证据evidence/p08-tools-entry-2026-10-04/copy-clarification.json。

P08工具入口review检查点（UTC 2026-10-04）：实现0d21cd4；正常合入main7d44保留72 Joker文案、12道具及既有三组底栏。source1354a808 exact modified=false，93相关单测/7files和type PASS；320/390竖屏、844×300 top12/b12及b34的原生零库存、购买计数/扩容、取消/关闭全run-RNG不变、Shop/Game各一次有效使用（连点确认仅一次保存）、商店专用场内禁用、reload全run通过。8场景完整页＋390空态图已actual view，fixture为合法原生导入、非自然连续获取。Game/Shop常驻工具x/y，消耗工具与本局道具分组，复用原目标/确认/保存。手牌和底栏逻辑坐标不改；14牌竖屏仅必要待出牌视觉避让（单测覆盖，未冒称native14），短横safe34进度线上移4px。首轮U04容量误样板、a01不支持及3offer超合同失败留证后修正，未削guard。仅review待新精确CI/根独立图审及串行main放行；P08仍in_progress，不扩矩阵，不全冻结。证据evidence/p08-tools-entry-2026-10-04。

P08底栏三组复核收尾（UTC 2026-10-04）：原三组方向已获根实际看5f4da3两小图通过，未再美化。正常对齐main8888e82保ce299六道具/a11及MIT调序；只有handoff/plan冲突且双方记录保持。禁用余次复用disabledInk至4.51对比度；原生1180排序确认5张手牌盖住手内深青提示，另独立afbb6bf把首用提示移到既有status、14px、普通1860/reduced3000有限寿命，原cancel/离场/偏好保持，其他未知色块同因未证明。source2db4216 exact modified=false：390普通＋844×300 top12/b12、b34三完整页actual view，12长按取消、7排序和7真实出弃、原生DOM菜单/全屏、回载不重播全PASS；实际文字/余次在按钮内、全部非control坐标同88b、全保存结果逐字段同领域applyCommand。191相关tests/type PASS，src/tests同；首轮reload脚本错点新局造成timeout，原FAIL留证后改继续入口，没有放宽保护。public/assets、art/sources、domain/application/content/audio/vendor/license逐树同main。仅新review CI一次push，未全冻结/未推进main，由根看三完整页及提示修复后协调放行；P08仍in_progress。证据evidence/p08-action-groups-2026-10-04。

P08底栏三组第一版检查点（UTC 2026-10-04）：实现e2df9f8，对齐maince299（src仍同88b17）后tested1ee6e7b；88px青蓝纸色整理组内两44px触点，弃牌390由70→106／320由106→114，朱红出牌保主动作；墨线纸牌下落到平放牌堆／牌扇向前送出，文字与真实余次保持。原底栏及全部非control坐标指纹cff0c393…同88b17，主56px、容量回退54/52px不变。89原受影响＋9新增几何/符号/type PASS；320/390软件Canvas DPR1原生合法导入及选牌、实际文字框/可见线图/全run不变PASS，两小图已actual view。根要求先看第一版，停止自行美化和大收尾；844短横实际操作及本皮肤按住/取消/禁用/真实出弃仍NOT_RUN，整体IN_PROGRESS。一次文档锚点补丁未应用，无测试/浏览器失败。public/assets、art/sources完全保maince299六道具/a11追加；不改火/音频/计分/RNG/save/手牌/调序入口。独立review，不自动main，证据evidence/p08-action-groups-2026-10-04。

P08 MIT 调序 review 资源发布顺序对齐（UTC 2026-10-04）：已等六道具＋a11主线正常发布到ce299b8，再正常合入，合并源码8d0efea；整个src逐树同上一绿review9f3db15，public/assets和art/sources逐树同ce299。sortHand清选／Joker调序与原命令保存手势合同不变；仅handoff/plan冲突，主线最新清理文档＋本包evidence保持。205相关tests/content43公开文本/一次生产build（含typecheck）PASS，编译bundle保a11-v2哈希路径＋六道具注册、14dist图片逐字节/SHA同批准源，旧a11 canonical dist路径不存在，全文MIT notice再核同。证据 [resource-main-alignment.json](production/evidence/p08-browslatro-joker-reorder-2026-10-04/resource-main-alignment.json)。本轮未重演未受影响UI/无全冻结；新精确reviewCI和普通FF资格交父报告，未抢写main，仍由父单独放行。

P08 MIT 调序 review 对齐排序 main（UTC 2026-10-04）：原663ace1精确CI37213762076 success；正常合入已发布main88b17e2，合并源码254863e。仅handoff/plan冲突且双方记录保持，sortHand先结束手势并清全部选牌/ghost/undo的方法逐字同main，Joker调序同原已审review。305受影响tests/type/plan与一次exact modified=false构建复用于原排序/Joker harness均PASS，原生排序4组/忙态禁排序与自然Joker33检查保持，全文MIT notice再核逐字节相同。证据 [main-alignment.json](production/evidence/p08-browslatro-joker-reorder-2026-10-04/main-alignment.json)。新review HEAD精确CI另报；只供父协调串行FF，未写main/未取Goods六道具候选/未重复全冻结，P08仍in_progress，真机/GPU/听感/部署/整体审美NOT_RUN。

P08 GitHub MIT 调序复用独立 review（UTC 2026-10-04）：基线 main3938cee，源码与自然构建8b05042（modified=false），仅复用 browslatro 固定 eb3d51f 的 insertIdAtIndex 与前8测试，全文版权许可跟随 public/licenses → dist/licenses 实核逐字节相同，整体项目许可不变。薄包装统一 GameScene 持有 Joker 详情左右移/拖放及 ShopScene reorder；保 instanceId/expectedSeq/领域排列校验/先存后发，不接 nearestGapIndex，原355ms/10px/槽位命中不变。236受影响 tests/type/build、两组390×740 DPR1软件 Canvas 自然鼠标/原生触摸33检查与 reload PASS；同槽/非法/取消不dispatch，合法seq只增一次，RNG/gold/非默认成长保持。只完成去重一致性，非视觉升级；本地无无关全冻结，最终 feat HEAD 的新精确 CI另报。证据 [MIT 调序复用](production/evidence/p08-browslatro-joker-reorder-2026-10-04/README.md)。独立 feat 分支、main先不推进，父协调串行合并；保并行点数/花色收回选牌及 GoodsArt U01–U06，不碰手牌排序入口/规则/save/资源/火，P08仍in_progress，OnePlus/真GPU/听感/部署/整体审美NOT_RUN。




P08点数／花色放回选牌review（UTC 2026-10-04）：基线已授权发布main3938cee（缺图主题FF15:16:39Z，精确main CI37212391288与docs37212391290 success），本排序独立source bf01aa5暂不推进main。仅GameScene.sortHand：await-input且ready/无presentation时，先cancel手势，再清全部手选／直选／顾问选牌和旧ghost/undo，刷新普通座位后走原单次ReorderHand；原比较器、ID焦点、九牌几何与规则参考保持。历史排序保选合同按最新用户要求覆盖；三旧浏览器样板正确更新，并重新原生选牌保弃／出检查。101受影响单测/type PASS，旧8测试7红1绿保留；390×740 DPR1软件Canvas一个合法九牌native import，手选／顾问3张／空选／重复四排序全归空、原框和全run除order/seq/receipt外不变，271忙帧含270presentation均禁排序且真实点击无新命令PASS；唯一现成PNG actual view。public/assets、art/sources（72原画＋四工具样图）、domain/application树同3938；无美术/火/工具loader/计分/RNG/save-format变化，不重跑无关全冻结/设备/录屏/PC/部署。证据evidence/p08-sort-return-2026-10-04；整体仍IN_PROGRESS，review待根协调放行。
