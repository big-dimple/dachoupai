# P08 计分朱砂勾框：首个可审检查点

本轮按父最新收尾指示停在首版。独立 `feat/p08-score-cinnabar-review-20261004`，基于已发布 `88b17e23c9aa778c8ac93c9998cd090ba48ab82d`，不合 main、不接后续资源／底部控件／Joker 调序。

实际运行源码 **fac1709fa999f2f07470dea1299aa7377711c6c9**，e2e build-info `modified=false`。执行采帧 harness 版本 **fdcf109**；后续提交只整理采帧说明和本证据，不改运行源码。

已实现：ScoreFlame 的 set／impact／setGuards／destroy 接口保留，内部最多3个 Graphics、零新纹理、固定有限朱砂路径。正向落点可在未达标时创建两道短笔划；target／2x／5x 依当前已揭示的保存 trace 值，分别四角／半框／双框。每档只首次写出，退档立即静态，重入不重炸；最长900ms收静态，减少动态无持续 update。局部窄边带和原8px外框带减去实际文字、牌和控制 bounds，原来源飞入／逐项说明／真实数字安全呼吸保留。删除本手两处震屏、award粒子／冲击波／中央章，入账说明保 resultText。

持续燃烧声已删除；对应本手倍率／award重奏改为100–160ms低频下降＋30–50ms纸击，通过原 AudioEngine note／paper 和 presentation／event 所有权去重。静音、后台事件也消费身份；取消、离场清音尾，回看不补播新短鼓。其他场景既有成功音未重写。

首张 **390×740、safe top12/bottom34、DPR1、Linux Chromium 软件 Canvas、原生触摸**候选：[实际 target 帧](390x740-target-first-candidate.png)。已 actual view，**零轮参数微调**。它来自 postrender 第176帧，框写出后183.3ms，显示 `500`，框宽3.5px、alpha约0.998；当时处于已保存 base 揭示，后续自然计分最终保存 `600`。参考值与实际 frame／phase／geometry 见 [checkpoint.json](checkpoint.json)。本图是首个外框候选，不代表未达标局部短线或其他档位已视觉验收。

52项受影响单测（6文件）、typecheck、候选 e2e build、plan检查 PASS。390自然600完整路径的332实际帧：每个来源有序 impact、同帧精确档位、共享 mask／实际 guards／飞线落点、零震屏／中央章／燃烧床、演出期全保存状态稳定、结果600且一次结算、离场 Graphics与短鼓尾均归零 PASS。超长数字只改 UI Text并恢复，实宽互不相交、全run保持。domain／application／public/assets／art/sources Git树与基线完全相同。

首次采帧 FAIL 已保留：脚本曾错误要求600 wheel也存在未达标帧，实际 base为125×4=500，已高于目标400。只修采帧假设，未改规则或数值。完整原报告留工作树 `shots/cinnabar/first-capture-failure.json`，公开摘要写入 checkpoint。

仍待补：844×300 safe12／34；从其他合法自然路径取未达标／2x／5x实际关键帧；两张四阶段联系图及其单帧；减少动态从开始／中途切换、skip／重复／回看／恢复浏览器检查；精确 review CI。相关单测已跑，浏览器未跑的项目不包装为 PASS。总状态 **IN_PROGRESS**，父继续此任务时优先补上述证据，候选后仅允许一次有依据的线宽／opacity／timing修正。听感、真机、真GPU、GPU FPS、录屏和整体审美 **NOT_RUN**；main串行整合由父负责。
