# 本轮反馈整合回执 · 2026-10-17

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
