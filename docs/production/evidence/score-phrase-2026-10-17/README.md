# 整手乐句与源牌弹簧：可评估样本

产品 `c2228a64b5772709e5c5be44ade4d825afbbba80`，分支 `feat/owned-joker-score-motion-20261017`。在已交 `4eac55ed` 上完成第一版整手表现编排；P08 仍为 in_progress，真人整段节奏与听感尚未验收。

## 直接查看

- PC：[连续音画](pc/av-continuous.webm)、[出牌前](pc/selected.png)、[关键乘倍率正向](pc/accent-right.png)、[反向回弹](pc/accent-left.png)。
- 390：[连续音画](phone/av-continuous.webm)、[出牌前](phone/selected.png)、[关键乘倍率](phone/accent-right.png)。
- 4×：[连续音画](fast/av-continuous.webm)。
- 同一13源牌收益序列：[关键拍蓄势取消](cancel-windup/av-continuous.webm)、[回弹取消](cancel-rebound/av-continuous.webm)。原生菜单提前打开，记录按钮实际派发时的源牌 phase，避免菜单打开耗时跨过请求取消的动作。
- [逐拍计划与实际时间 CSV](timeline.csv)、[汇总](summary.json)、[常规原报告](normal-report.json.gz)、[实际取消边界原报告](cancel-report.json.gz)、各目录逐帧 `frames.json.gz`。

WebM 来自实际 canvas 与同一 master WebAudio graph，包含 VP8＋Opus，未试听。正常三档为一份编译应用，严格取消边界为相同产品源码的第二份编译应用；报告保留各自 HEAD、dirty 和源码哈希，未混写成一次构建。

## 本批实际改变

`ScorePhrase` 只消费已保存事件，按原顺序产生四段时长与 `role/pulse/accentWeight/paired`；不排序、不改得分、输入、RNG或存档。删除 `impactBeat` 固定时长覆盖，源牌时长直接服从编排，数字的弹簧脉冲也不再被260ms上限截断。只有选定结构手势有回弹第二声，其他连发是轻重不同的单击。

| 段落 | windup | flight | impact | rest | 力度与落点 |
| --- | ---: | ---: | ---: | ---: | --- |
| 起势 | 120 | 95 | 300 | 90 | 0.72，蓄势静音 |
| 连发 | 64→30 | 96→62 | 250→174 | 66→26 | 四拍交替轻重，随拍序小幅增加 |
| 同源连发修正 | 再减14，最低18 | 同上 | 同上 | 再减10，最低18 | 不重复长蓄势 |
| 关键真实乘倍率 | 180 | 105 | 340 | 100 | 1.0；最大真实倍率，同倍率取最后一次 |
| 总分 | 120 | 0 | 430 | 130 | 汇聚→一次终音与落定 |
| 成长／关末回执 | 20 | 0 | 100 | 24 | 0.28，不再开启完整双拍高潮 |

单位是交给 TweenManager 的表现毫秒，统一按设置速度缩放；无数值飞行的事件 flight=0。两项明确的快速可见性下限也在同一计划内：源牌单击实际至少96ms；选定双拍按弹簧首个反向极值保证主击→回弹至少50ms，4×所用885ms表现槽实际约221ms。其他三段及数值单击继续压缩。实际帧边界开销见 CSV，参数不冒充观察值。

扩展现有 `inkwaveSpring`：mass=1、stiffness=400、damping=10，dt≤100ms、子步≤1/240s；0.7s曲线预采样，首个反向极值约在归一化0.226。源牌与数字使用同一曲线、同一 impact slot；光效力度和声音 weight 取相同事件字段。所有等待／姿态仍由 Scene TweenManager 与 EffectQueue generation/AbortSignal 驱动，不引入 setTimeout、全局 hit-stop、第二算分器或另一套音频队列。

声音按用户指定顺序采用 owner 的 `4a1f9227`＋`cbf2f0f0`，本分支对应 `833b6e2f`＋`c2228a64`。冲突仅发生在临时接口兼容的 AudioEngine 与测试，两文件均采用 owner 最终版，三个音频源码文件与 `cbf2f0f0` 逐字节一致。Scene 在唯一 arrival 传第六参 `pulse/accentWeight/paired/durationMs/signal`，回弹沿同 eventId；五声固定采样速率、战鼓与钟均走现有总线。没有引入新加坡原型的独立合成器、算术或姿态争写。

## 验证与保留边界

| 同版实录 | 观察时长 | 连发段前8／后8间隔中位数 | 关键拍蓄势到 arrival | 主击→回弹 |
| --- | ---: | ---: | ---: | ---: |
| PC | 17.36s／1042帧 | 517.2→417.5ms | 333.0ms | 67.7–97.9ms |
| 390 | 17.36s／1043帧 | 517.7→416.3ms | 333.4ms | 67.5–97.5ms |
| 4× | 8.18s／490帧 | 200.0→233.0ms | 118.8ms | 65.6–86.5ms |

三档各32个表现收益 arrival、13个真实源牌收益、6个结构回弹；测得最多3个计分声部，预算仍为6。关键拍在此同一序列为最后一笔真实×1.5，不伪造更高倍率。常规速度实际渐密成立；**4×后段受源牌可见性和双拍下限影响，没有持续渐密**，当前作为可评估样本交付，下一迭代需调整结构双拍密度。不是用参数表把此缺口签完。

公开“导入本局”受控五槽库存，原生选牌与 PlayHand；同一13个真实源牌收益序列含普通、加倍率、真实乘倍率，还保留完整扑克数值 arrival。PC/390 的 hover／点按、帮助／Escape、键盘、鼠标／touch 双向调序与完整领域 oracle 均检查。取消用相同完整库存，不降低目标；按钮派发时必须仍是关键拍的 windup/rebound，且无晚计分音、声部归零、最终完整状态精确一致。

78项最终定向、typecheck通过；实际 Vite e2e 应用构建并录制。此处不将 owner 的110项再相加。未操作 main、CI、部署或域名。

[首个4×反向回弹 FAIL](first-fast-spring-FAIL.json.gz)完整保留：44.75ms弱拍在帧间跨过反向峰值，实录只有一侧明显；修的是计划内96ms可见下限，保原双向断言。早期新测试还修过错误 import 与过度绑定具体木声文件名的期待，均非领域失败。

未完成：4×后段持续渐密、真人整手节奏／听感、物理手机、真正透视／反光／触碰惯性；320／短横／减少动态／后台／销毁未在本批重跑，上一基线证据按原范围保留。英雄大立绘与c12由整合负责人接入，本分支未回写那些布局或奖励模块；并版时保留其改动。最大倍率相同时取最后一次重拍仍需听感评审，当前实现不是“爽感已达标”。长期计划与剩余项见[开发计划](../../OWNED_SCORE_EXPERIENCE_20261017.md)。

重跑入口：[harness/owned-joker-score-motion.mjs](../../../../harness/owned-joker-score-motion.mjs)，设置 `OWNED_MOTION_PHRASE=1`、`OWNED_MOTION_CASES=pc,phone,fast,cancel-windup,cancel-rebound`、独立 `OWNED_MOTION_OUT`。依赖已安装的 Playwright Chromium；只访问本地127.0.0.1。
