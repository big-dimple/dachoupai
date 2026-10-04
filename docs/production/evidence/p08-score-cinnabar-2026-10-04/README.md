# P08 计分朱砂勾框：首版候选完整可审证据

最新主线整合：正常合入已发布a6e482b（action row／status hint／12items），仅DECISIONS冲突且双方决定完整保留；随后确认文案 **7d44b8bcada32942acded87d70abe78dea12f275** 已main，正常合入，无冲突，实际最终源码／干净e2e build **085ad38e04fdd285d83842e23adcfd2cd690d8be**。最新文案接线、status/hint、排序/Joker方法、layout/SceneView/HandActionArt、全部12items及MIT逐项保主线。未取任何未发布文案分支。

独立复核指出旧层级漏了头像：roleFrame是roleAvatar子对象。修复3a5620f以root直属roleAvatar作前景锚点，mask继续用roleFrame真实bounds；观测器单列avatar索引、显式断言存在且高于局部笔划，不能通过过滤漏验。a6源a13de85与最终085ad38各四条有限自然202／5589两尺寸回归PASS；最终**1158实际计分帧**、保存/RNG全程不变、一次入账、mask／真头像／牌／按钮／文字层级、长数字、来源顺序、零持续燃烧／震屏／中央章、离场Graphics与短鼓尾归零PASS。**零张新截图**，未重演已过全矩阵。76计分/底栏/hint单测与随后23文案单测、type/e2e build、plan通过；源码、具体frame层级与主线保留hash见 [main-alignment.json](main-alignment.json)。新精确review CI随交接报告，不以旧CI代替。

父已实际看下面两低档新图并批准成对折笔可见、不盖文字，**视觉方向通过，不再调参**。ScoreFlame及AudioEngine代码同该批准候选e902ebf；只补头像层级锚点与已发布主线整合。唯一局部参数修正已用，总体P08仍IN_PROGRESS；设备／听感／真GPU／GPU FPS／录屏／整体审美仍NOT_RUN。

---

唯一一轮局部修正与首版历史：

父实际审过2b2ec4两联系图和844全页DOM图，认可target四角／2×半框／5×双框方向，低档遮挡未通过。本次按授权用**唯一一轮局部调整**，只改成左右下角短折笔、局部4.5px，并修稳定层级与跨档消费；三档外框的路径、宽度、alpha与时钟绘制代码逐段完全相同。旧8帧不重拍、不改标源码。

新的自然202分低档峰值：[390×740](local-corners/390x740-tier0.png)、[844×300](local-corners/844x300-tier0.png)，safe12／34。实际干净e2e build **bc504efb51db6717916b60dd64741c711c090e68**；frame200／201，local fade age183.3／183.4ms，显示67，最终保存202，仍低于目标400。每笔真实朱砂像素竖屏197／200、横屏134／138，均有横竖两段；两图已actual view。phase／实际层级／guards／像素区域／文件hash见 [adjustment.json](local-corners/adjustment.json)。本图仍待父独立审，工程通过不代替整体审美。

局部几何单独源码140d2ff；正常合入main **8888e82ede1776e259096bbdfe4eef63fc6f2415**的合并0f7c7ca，无冲突。独立审查补修源码44ad1c5：计分纸面／外框／底板／局部装饰稳定放到真实前景之前，局部高于底板、低于所有计分文字与实际牌／按钮，未改布局或删mask；非空root.list单测及两路线398计分帧验证，每帧前景非空。跨到3档消费1／2／3，`0→3→1→2→3`退档与重升均静态。55受影响单测、production build含typecheck、exact e2e build PASS。错误普通build未暴露harness，选角前30s超时保留；只纠正到 `--mode e2e`，未加超时、改数值或再调笔划参数。

排序／inspectJoker／reorderJoker方法、JokerReorder／vendor MIT与许可、domain/application、public/assets/art/sources、layout/SceneView逐项同main8888。独立生命周期／音频审查由父协调，本轮未重复全冻结或四档矩阵；最终新review CI随本轮交接提供。旧低档不再代表当前候选，以下完整首版矩阵为历史原始来源；听感／OnePlus／真GPU／GPU FPS／录屏／整体审美仍NOT_RUN，P08仍IN_PROGRESS。

---

2b2ec4首版完整矩阵历史：

父续令要求的有限矩阵现已补齐，仍为独立 `feat/p08-score-cinnabar-review-20261004`，不合 main。运行实现自 **fac1709fa999f2f07470dea1299aa7377711c6c9** 起未再修改；**零轮线宽／opacity／timing修正**。以下完整矩阵替代首检查点的未跑项记录，首图和失败历史保留在下文。

优先审 [390×740 四档联系图](complete/390x740-contact.png) 与 [844×300 四档联系图](complete/844x300-contact.png)。两图仅按实际原生采帧拼接，并标实际 frame／phase age；完整单帧与 bounds／guards／source／文件 SHA256 见 [matrix.json](complete/matrix.json)。

| 视口，safe top12／bottom34 | 未达标局部，实际自然202 | target 四角，自然600 | 2× 半框，自然1200 | 5× 双框，自然5589 |
| --- | --- | --- | --- | --- |
| 390×740 | [frame195，unfold116.6ms，显示65](complete/390x740-tier0.png) | [frame178，fade183.4ms，显示500](complete/390x740-tier1.png) | [frame406，fade250ms，显示1200](complete/390x740-tier2.png) | [frame187，fade283.3ms，显示4050](complete/390x740-tier3.png) |
| 844×300 | [frame191，unfold116.7ms，显示65](complete/844x300-tier0.png) | [frame177，fade183.3ms，显示500](complete/844x300-tier1.png) | [frame404，fade250ms，显示1200](complete/844x300-tier2.png) | [frame182，fade283.3ms，显示4050](complete/844x300-tier3.png) |

8张 Canvas 帧实际 e2e build source **29eb4c3a0595f365bcf6b8095e4daeda20188f0f**、`modified=false`；生命周期补测 build **9635354e62cdaa782629877ad94a739a4bbf72c4**、`modified=false`；最终执行 harness **52ac65294ed59b7e5d2e7191a54bb1615c0c657a**。三个源码的 `src` 和 `tests` Git树均与 fac1709 完全相同，后续仅修正观测假设、原生回看接线与归档。不可把不同实测 build SHA 统一改标为最终证据提交。

保留 DOM 菜单／全屏的真实页面图：[390×740](complete/390x740-tier3-page.png)、[844×300](complete/844x300-tier3-page.png)。两图各在对应5× Canvas同一 postrender 峰值睡眠 Phaser loop 后截图，保全部页面控件再 wake；frame、product、phase完全一致，截图前后整个保存状态不变。实测菜单／全屏44×44或64×44，其 bounds距8px外带最少4px，没有相交，因此不需要改 DOM 布局或增新 guard。

两尺寸自然202／600／1200／5589共8路径，另390低档 reduced、844中档 reduced、390低档原生skip与真实回看／reload继续、844中途原生切减少动态共4路径，**12用例 PASS、3042实际计分帧＋193真实回看帧**。低档用 `p04-golden-02` 阿默原始手牌单张 clubs-5；真实保存 trace H45×M9/2向下取整202，低于400，返回 await-input，不把600起始500伪标未达标。每个来源顺序 impact、同帧准确 target／2×／5×档、实际 guards与共享mask、飞线落点、长数字实宽不交、选牌不建装饰、全保存/RNG稳定、一次入账与离场3 Graphics／短鼓尾归零通过。降档／重入只首次演出、同eventId在reduced早退前去重、无逐帧RNG和幂等destroy由首版对应单测验证。

首版52项受影响单测、typecheck和e2e build结果持续有效。持续燃烧床为0；只读观察原 AudioNode start/stop 排程证明 reduced 开场尚存的循环是≤350ms且有有限stop的原出牌滑声，未删它洗绿。真实回看193帧新短鼓voice始终0。四个采帧/观测假设失败及纠正摘要保留于matrix，原诊断留忽略的shots，不加入提交。当前归档 plan检查另跑；**最终分支精确 CI结果以交接消息的实际SHA与run URL为准**，首检查点9fb旧CI不代替最终CI。

已 actual view 两联系图、低档单帧及两DOM页面图。**视觉待审限制：低档左短笔划可见，右短笔划部分被既有不透明得分底板遮挡；未据机器通过宣称两道均完整可见或整体美术通过。**按父“先完整一套再审、暂不调参”停在本候选；之后如获继续，仅剩一次有依据的参数修正额度。听感、OnePlus、真GPU／GPU FPS、录屏、整体审美 **NOT_RUN**，P08整体仍 **IN_PROGRESS**。`domain/application/public/assets/art/sources` Git树同88b17e2；未接其他worker的底部布局、Joker调序、工具或a11素材。

---

首个检查点历史：

本轮按父最新收尾指示停在首版。独立 `feat/p08-score-cinnabar-review-20261004`，基于已发布 `88b17e23c9aa778c8ac93c9998cd090ba48ab82d`，不合 main、不接后续资源／底部控件／Joker 调序。

实际运行源码 **fac1709fa999f2f07470dea1299aa7377711c6c9**，e2e build-info `modified=false`。执行采帧 harness 版本 **fdcf109**；后续提交只整理采帧说明和本证据，不改运行源码。

已实现：ScoreFlame 的 set／impact／setGuards／destroy 接口保留，内部最多3个 Graphics、零新纹理、固定有限朱砂路径。正向落点可在未达标时创建两道短笔划；target／2x／5x 依当前已揭示的保存 trace 值，分别四角／半框／双框。每档只首次写出，退档立即静态，重入不重炸；最长900ms收静态，减少动态无持续 update。局部窄边带和原8px外框带减去实际文字、牌和控制 bounds，原来源飞入／逐项说明／真实数字安全呼吸保留。删除本手两处震屏、award粒子／冲击波／中央章，入账说明保 resultText。

持续燃烧声已删除；对应本手倍率／award重奏改为100–160ms低频下降＋30–50ms纸击，通过原 AudioEngine note／paper 和 presentation／event 所有权去重。静音、后台事件也消费身份；取消、离场清音尾，回看不补播新短鼓。其他场景既有成功音未重写。

首张 **390×740、safe top12/bottom34、DPR1、Linux Chromium 软件 Canvas、原生触摸**候选：[实际 target 帧](390x740-target-first-candidate.png)。已 actual view，**零轮参数微调**。它来自 postrender 第176帧，框写出后183.3ms，显示 `500`，框宽3.5px、alpha约0.998；当时处于已保存 base 揭示，后续自然计分最终保存 `600`。参考值与实际 frame／phase／geometry 见 [checkpoint.json](checkpoint.json)。本图是首个外框候选，不代表未达标局部短线或其他档位已视觉验收。

52项受影响单测（6文件）、typecheck、候选 e2e build、plan检查 PASS。390自然600完整路径的332实际帧：每个来源有序 impact、同帧精确档位、共享 mask／实际 guards／飞线落点、零震屏／中央章／燃烧床、演出期全保存状态稳定、结果600且一次结算、离场 Graphics与短鼓尾均归零 PASS。超长数字只改 UI Text并恢复，实宽互不相交、全run保持。domain／application／public/assets／art/sources Git树与基线完全相同。

首次采帧 FAIL 已保留：脚本曾错误要求600 wheel也存在未达标帧，实际 base为125×4=500，已高于目标400。只修采帧假设，未改规则或数值。完整原报告留工作树 `shots/cinnabar/first-capture-failure.json`，公开摘要写入 checkpoint。

首检查点当时未跑：844×300 safe12／34；未达标／2x／5x实际帧；两联系图；reduced／skip／回看／恢复浏览器；精确review CI。上述浏览器和证据项现由顶部完整矩阵补齐。首检查点精确9fb0c95 CI37216277663、docs37216277579均success，但不代替最终分支CI。main串行整合仍由父负责，整体审美与设备仍未验收。
