# 来源牌撞向正确数字：普通加算与乘倍率样例

基线 `e82c7df8d3e004cb9ad5a86b27389496d397b2ad`；产品 `9969b9e6144ef5442dd6dfbcd636b53a96821167`，开发分支 `feat/owned-joker-score-motion-20261017`。本批只升级来源撞分与总分收束表现，保留基线的大立绘/c12接线。P08仍为in_progress。

## 直接看完整样例

- PC：[连续音画](pc/av-continuous.webm)。普通加倍率：[出击](pc/ordinary-flight.png) → [撞旧字](pc/ordinary-hit.png) → [准确新值](pc/ordinary-pop.png)；真实乘倍率：[出击](pc/multiply-flight.png) → [命中](pc/multiply-hit.png) → [新值与回撤](pc/multiply-pop.png)。
- 390手机：[连续音画](phone/av-continuous.webm)。普通加倍率：[出击](phone/ordinary-flight.png) → [命中](phone/ordinary-hit.png) → [新值](phone/ordinary-pop.png)；真实乘倍率：[出击](phone/multiply-flight.png) → [命中](phone/multiply-hit.png) → [新值与回撤](phone/multiply-pop.png)。截图为DPR2，逻辑视口390×742。
- [4×连续音画](fast/av-continuous.webm)；[减少动态](reduced/selected.png)。
- 原生快进按钮在实际关键拍的[蓄势](cancel-windup/av-continuous.webm)、[飞行](cancel-flight/av-continuous.webm)、[回弹](cancel-rebound/av-continuous.webm)阶段触发取消。
- 修复前同一库存：[连续音画](before-pc/av-continuous.webm)、[旧总分回执](before-pc/final-credit.png)。

普通样例实际是M加2：旧≈31.13→≈33.13；乘法样例是M×1.5：旧≈33.13→≈49.69。整个序列还包括2笔H加热度和最后1笔关键乘倍率，共5笔真实数字撞击。13个真实来源收益包含再次触发等事件，不能将它们全部写成13次数字攻击。

WebM取自实际应用canvas及同一master WebAudio graph，含VP8与Opus。已检查容器/双轨与源码哈希；未试听，未以物理手机或真人重量感签收。

## 根因与改动

旧`presentScoreSource`未使用target坐标，只在来源旁浮字；每次H/M变化还同时放大总分。唯一跨桌移动的总分→HUD回执采用上拱路径。旧实录中，总分在最终落定前最大脉冲1.54；最终回执有13帧与牌架外槽矩形相交。这解释了反向观感，不能只交换某个from/to。

新增`JokerScoreStrike`只消费同一已保存ScoreTrace中的真实正收益事件：来源视觉抬起蓄势，原画副本冲向实际H/M字框，撞击时旧字快照裂为局部6片，准确after值在同一arrival写入并短暂隐藏，35–45ms后显露并弹起，副本沿阻尼弹簧回到原牌。H打H，M加法/乘法打M；不出击资源、成长、未触发和零收益。外层槽位、命中框、顺序及逻辑卡保持原位。

主击沿用唯一`impactAccumulator`调用；结构手势的第二声由同一回撤Tween首次经过来源位置触发`scoreRebound`。两者共享eventId、duration、AbortSignal和已有pulse/weight，不增加声音队列、计时器、独立AudioContext或算分器。局部碎字、火花和临时CanvasTexture在本事件结束前清理。

| 手势 | 蓄势 | 冲撞 | 命中停顿 | 回撤 |
| --- | ---: | ---: | ---: | ---: |
| 普通加算 | 110→80 | 100 | 35 | 180 |
| 非关键真实乘法 | 130→110 | 115 | 35 | 200 |
| 唯一关键真实乘法 | 160 | 130 | 45 | 220 |

单位为1×计划毫秒，全部由同一TweenManager推进。4×在同一计划中保实际蓄势≥40ms、飞行≥60ms、命中≥35ms、主击至第二拍≥50ms，不暂停输入或算分。实际帧采样、计划和声音时间分列在[逐撞时间CSV](strike-timeline.csv)：两次乘法主击→回弹，PC约105/130ms、390约102/132ms、4×约82/81ms。渲染采样按帧量化，参数不冒充实测值。

中途H/M仅强调对应因子，总分保持弱化且脉冲恒1；最终才将H/M汇聚到总分并发一次终音。桌面HUD回执从下方绕行，手机窄空间保持原有原位到账。新实录中，回执与牌架外槽相交为0帧；中途总分脉冲最大1。

已读暴雪[官方VFX开发访谈](https://hearthstone.blizzard.com/en-us/news/22552047/developer-insights-the-art-behind-the-science)、其中SuperCollider动图多帧及[声音设计访谈](https://hearthstone.blizzard.com/en-us/news/23964694)，参考清楚的来源连接、主体动作和局部命中。以上参数是本项目调校，不是暴雪参数；未采用其素材。

## 验证与边界

- PC1366×768、390×742、4×均验证5笔来源→正确数字的单向前进、命中实际字框、旧字隐藏/新值显露顺序，完整领域状态与oracle精确一致。PC hover/键盘/长按调序、手机点按/长按调序、帮助与Escape也在真实输入路径检查。
- 减少动态完整跑完同一保存序列，无飞行副本；状态一致。最大同时计分声部实录3，预算上限6，未出现重复主击或第二拍。
- 三种取消均记录原生按钮实际派发phase；之后声部、撞击容器、旧字纹理均为0，没有迟到音。蓄势/飞行取消未发关键主击，回弹取消只有已发生的1次关键主击。
- 首个销毁用例在较早的非数字来源动作中结束，只证明旧生命周期。为覆盖新模块，另跑[碎字阶段销毁报告](destroy-fracture-report.json.gz)：实际impact且存在1张旧字纹理时停止场景，随后纹理/声部/牌视图均0。两次报告原样分开保存，没有改写第一份结果。
- 39个定向测试（7文件：joker-score-strike、score-phrase、score-table、owned-joker-score-motion、inkwave-spring、hero-gift-scene-wiring、c12-saved-gift）及typecheck通过；实际浏览器样例重新编译应用通过。测试覆盖保存身份/正收益守卫、方向投影、双拍下限、回撤越位边界和已取消不分配。

本批没有重跑320、短横屏、后台或回看；它们不由先前批次结果自动升级。完整透视/反光、触碰惯性、跨类型及4×持续渐密、听感/方向/重量的真人评审与物理设备均仍待验。六英雄基础目标附着由另一owner并行完成，本分支基于e82，仅改GameScene计分局部；整合需保留后来`5be8927`的英雄附着接线，不以旧场景整份覆盖。

## 原始证据与重现

[汇总](summary.json)、[最终八用例原报告](final-report.json.gz)、[精确碎字销毁原报告](destroy-fracture-report.json.gz)、[修复前报告](before-report.json.gz)及各目录`frames.json.gz`保留真实HEAD、dirty与源码哈希。最终八用例是一份构建；精确销毁是同一9项产品源码哈希、仅观察器更严格的第二次构建。

首录观察器对Graphics直接调用getBounds导致TypeError/超时，保留[原FAIL报告](observer-first-FAIL.json.gz)。已按对象能力加守卫，未降低路径/数值断言；该失败不是产品动作失败，也未抹去。

PowerShell重现：设`PLAYWRIGHT_BROWSERS_PATH`为本机Chromium目录、`OWNED_MOTION_PHRASE=1`、`OWNED_MOTION_STRIKE=1`、`OWNED_MOTION_OUT`为新shots目录，运行`node harness/owned-joker-score-motion.mjs`；可用`OWNED_MOTION_CASES=pc,phone,fast`选样例。只受控导入真实库存并出一手，未自然获取、长局、查看CI或部署。
