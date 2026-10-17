# 《唐宋牌》视听打击感、音画共奏与物理交互返工验证报告 (第二轮整改)
> **分支**：`feat/gamefeel-audio-elevation-rfc`  
> **验证时间**：2026-10-17 22:18 (UTC+8)  
> **运行环境**：Chromium 123.0 (Headless, 1040×780 & 390×740 Mobile, Web Audio API, Vite 7.3.6)  
> **验证结论**：**28/28 真实断言 PASS，0 Page Errors，11/11 Vitest 领域单测全部通过**  
> **产物证据**：PC 与手机竖屏 9 帧关键截屏、连续 WebM/MP4 录屏、结构化断言日志 `report.json`

---

## 一、 第二轮确认硬伤修复对照表

| 评审指出硬伤 | 根本原因定位 | 本轮架构与代码修复实现 | 对应源码文件 |
| :--- | :--- | :--- | :--- |
| **1. 演示用 DOM 假装验证正式模块** | 旧版 `gamefeel-demo.html` 采用 DOM `div` + CSS 动画，未直接执行 Phaser 引擎。 | 重构为真实 `Phaser.Game` 运行时（`GameFeelScene`），直接挂载 `PhaserCardTilt`、`ScoringRhythmOrchestrator` 与正式 `AudioEngine`。 | [`harness/gamefeel-demo.ts`](file:///var/www/dachoupai/harness/gamefeel-demo.ts)<br>[`harness/gamefeel-demo.html`](file:///var/www/dachoupai/harness/gamefeel-demo.html) |
| **2. 动画时钟未与表现有效 delta 统一** | 旧版弹簧积分使用裸 `dt`，微停顿冻结时弹簧仍在推进；回调依赖 `setTimeout`，取消后旧事件残留。 | 弹簧更新与表现时间线彻底同步：`effectiveDt = (effectiveDeltaMs / 1000) * speedRatio`，冻结时 `dt=0` 弹簧物理完全停滞，快进时同步加速；废除未托管的 `setTimeout`，代际计数器与取消立即复位。 | [`src/gamefeel/ScoringRhythmOrchestrator.ts`](file:///var/www/dachoupai/src/gamefeel/ScoringRhythmOrchestrator.ts)<br>[`src/gamefeel/SpringMotion.ts`](file:///var/www/dachoupai/src/gamefeel/SpringMotion.ts) |
| **3. 编排器自行算分、默认补 ×2、推测胜负** | 旧编排器内部执行 `currentScore += chips`，`?? 2` 虚构倍率，无条件播放胜利音效。 | 编排器严格只消费领域 `scoreR2Hand(...)` 输出的 `ScoreTrace`。分数、热度、倍率严格取自 `event.after` 与 `trace.finalScore`；无倍率手平滑收束不补爆点；仅在未达标/失败时禁止胜利编钟。 | [`src/gamefeel/ScoringRhythmOrchestrator.ts`](file:///var/www/dachoupai/src/gamefeel/ScoringRhythmOrchestrator.ts) |
| **4. 倾斜抢管容器坐标，拖拽未隔离** | 旧版直接覆盖 `container.x/y/scale/rotation`，且未正确使用矩阵转换局部坐标。 | `PhaserCardTilt` 严格只作用于内层视觉容器（`innerVisual`），外层 Container 的坐标、缩放由 GameScene 排版与拖拽独占；使用 `container.getLocalPoint(worldX, worldY)` 转换局部触点。 | [`src/gamefeel/PhaserCardTilt.ts`](file:///var/www/dachoupai/src/gamefeel/PhaserCardTilt.ts) |
| **5. 音频私有强转与直连扬声器回退** | 旧版通过 `(as unknown as ...).gains` 访问私有字段，失败时 `new AudioContext()` 直连 destination 绕过限幅。 | 在 `AudioEngine` 增加正式公有扩展接口：`attachMusicFilter`、`playPentatonicNote`、`playWarDrum`、`playTempleBell`。所有音效注册进 `this.voices`，受 SFX 音量、主静音、限幅器与 `cancelPresentation()` 统一管束。 | [`src/audio/AudioEngine.ts`](file:///var/www/dachoupai/src/audio/AudioEngine.ts)<br>[`src/gamefeel/PentatonicSynth.ts`](file:///var/www/dachoupai/src/gamefeel/PentatonicSynth.ts) |
| **6. 低通线路未与音频图生命周期对齐** | 旧版低通未做重连与接线容灾，嵌套弹窗无法正确退栈。 | 低通滤镜作为单向节点串接于 `[gains.music] -> [filterNode] -> [gains.master]`；SFX/UI 直连 master 永不闷化；接线异常自动回退直连；`activeStack: Set<string>` 确保嵌套弹窗全部退出才释放 20kHz。 | [`src/gamefeel/AudioFilterTransition.ts`](file:///var/www/dachoupai/src/gamefeel/AudioFilterTransition.ts) |
| **7. 演示 reset 报错与无断言假 PASS** | 旧版演示中 `cardSprings.reset(0)` 抛出 `s.reset is not a function`；测试仅截图即 push PASS。 | 给 `SpringCardTransform` 补齐 `reset(x, y, scale, rotation)`；测试改为全量显式布尔/数值断言，汇总于 `report.json`，存在任何假结果或报错立即退出非零。 | [`src/gamefeel/SpringMotion.ts`](file:///var/www/dachoupai/src/gamefeel/SpringMotion.ts)<br>[`harness/gamefeel-orchestration-verify.mjs`](file:///var/www/dachoupai/harness/gamefeel-orchestration-verify.mjs) |

---

## 二、 11 项最小验证集执行结果

| 序号 | 验证场景 | 验证事实与断言 | Vitest (单测) | Playwright (浏览器) | 证据对应产物 |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | **普通计分** | 打出两对，严格消费 `scoreR2Hand` 生成的 `ScoreTrace`；卡牌从左到右弹射并奏响五音阶，最终得分与 `trace.finalScore` 严格相等，无虚构事件。 | **PASS** | **PASS** | [`03-pc-phase1-windup-silence.png`](03-pc-phase1-windup-silence.png)<br>[`04-pc-phase2-strikes-pentatonic.png`](04-pc-phase2-strikes-pentatonic.png)<br>[`06-pc-phase4-resolution-victory.png`](06-pc-phase4-resolution-victory.png) |
| **2** | **连续乘倍率** | 打出葫芦带 `f06` (×2) 与 `f09` (×1.5)；触发 50ms Hit-Stop 表现冻结，解冻爆发大唐战鼓极重低音，倍率横幅弹出，屏幕震动。 | **PASS** | **PASS** | [`05-pc-phase3-climax-hitstop-freeze.png`](05-pc-phase3-climax-hitstop-freeze.png) |
| **3** | **无倍率** | 单出高牌，无任何 Joker 乘算倍率；连发结束后平滑直接进入收束，不虚构 ×2 爆点，不播放战鼓。 | **PASS** | **PASS** | 断言 `multOpsCount === 0`，平滑收束。 |
| **4** | **未通关** | 目标热度 9000，本手仅得几十点；收束阶段判定未通关（`isVictory === false`），**绝对不播放大捷编钟音效**。 | **PASS** | **PASS** | 断言 `isVictory === false`，编钟未触发。 |
| **5** | **六英雄技能收益** | 苏轼（助攻翻倍）、刘娥（顺延继承）、秦琼（踏破押注）、辛弃疾（挑灯看剑补牌）、文成公主（藏地充能）、花蕊夫人（凌风燃牌）全部由真实 `scoreR2Hand` 生成 Trace，编排器无异常顺畅推进。 | **PASS** | **PASS** | 6 英雄独立子断言全部一次性 PASS。 |
| **6** | **1× / 4× 播放速率** | 1× 下按 120ms/160ms/360ms 真实节奏推进；4× 快进下时钟与弹簧物理同倍率加速，1200ms 内完整走完整手演出。 | **PASS** | **PASS** | 断言 4× 在 1200ms 内完成，时钟推进加速 4 倍。 |
| **7** | **停顿中取消后立即重播** | 在 50ms 顿挫蓄力中点击取消，编排器立即返回 idle，所有卡牌弹簧位移/缩放 1 帧复位回 (0, 0, 1, 0)；紧接着立即重播，旧回调完全注销，新一手从第 0 步干爽启动。 | **PASS** | **PASS** | 断言 `phase === 'idle'`，位移全零，新局步数重置。 |
| **8** | **静音/音量变化** | 触发静音时通过 `cancelPresentation()` 即刻斩断全部残留音尾；调整音量即时线性生效；解除静音不发生音爆。 | **PASS** | **PASS** | 断言 AudioEngine 静音状态切换与音量响应。 |
| **9** | **后台恢复** | 模拟切后台或帧率突降（dt=10s），稳定分步积分强制截断至 0.1s，数值绝无 NaN、Infinity 或爆炸超调。 | **PASS** | **PASS** | 断言 `Number.isFinite(value)` 且 `abs(value) < 500`。 |
| **10** | **卡牌拖拽与倾斜** | 鼠标触点移入卡面角落，innerVisual 产生透视倾角与高光偏移；Container 本身 x/y 完全不变，hitArea 不受干扰；调用 `reset()` 姿态优雅复位。 | **PASS** | **PASS** | [`02-pc-card-tilt-inner-visual.png`](02-pc-card-tilt-inner-visual.png) |
| **11** | **嵌套弹窗低通栈** | 打开商店（深度 1，音乐滤闷至 450Hz，计分/UI 保持全频清脆）；再展开卡牌详情（深度 2）；关闭卡牌详情（深度 1，仍维持滤闷）；关闭商店（深度 0，音乐完全恢复 20kHz 透彻）。 | **PASS** | **PASS** | [`07-pc-audio-filter-nested-muffled.png`](07-pc-audio-filter-nested-muffled.png) |

---

## 三、 关键截图与连续录屏证据索引

所有证据文件均生成并持久化存储于本目录：

### 1. 桌面端 (PC Landscape 1040×780)
* [`01-pc-idle-phaser-ready.png`](01-pc-idle-phaser-ready.png)：Phaser 牌桌画布挂载就绪，苏轼/秦琼/辛弃疾/刘娥/文成 5 卡横向就坐。
* [`02-pc-card-tilt-inner-visual.png`](02-pc-card-tilt-inner-visual.png)：卡牌 2.5D 透视微倾与多层视差，仅作用于 `innerVisual`，父容器坐标稳定。
* [`03-pc-phase1-windup-silence.png`](03-pc-phase1-windup-silence.png)：阶段一【起势】，选牌上浮 18px 聚焦，视听留白 120ms 蓄势。
* [`04-pc-phase2-strikes-pentatonic.png`](04-pc-phase2-strikes-pentatonic.png)：阶段二【连发】，按宫商角徵羽阶梯冲刺打击，筹码飞入总分。
* [`05-pc-phase3-climax-hitstop-freeze.png`](05-pc-phase3-climax-hitstop-freeze.png)：阶段三【爆点】，触发 50ms 冻结顿挫与大唐战鼓极重低音爆发，战鼓爆点横幅弹出。
* [`06-pc-phase4-resolution-victory.png`](06-pc-phase4-resolution-victory.png)：阶段四【收束】，编钟古刹大捷长鸣，卡牌柔和回落基准面。
* [`07-pc-audio-filter-nested-muffled.png`](07-pc-audio-filter-nested-muffled.png)：音乐低通滤波生效中（进出商店与多层嵌套弹窗深度栈）。

### 2. 手机竖屏端 (Mobile Portrait 390×740)
* [`08-mobile-portrait-table-view.png`](08-mobile-portrait-table-view.png)：竖屏自适应视口下，Phaser 牌桌完整铺开，布局居中无截断。
* [`09-mobile-portrait-climax-burst.png`](09-mobile-portrait-climax-burst.png)：竖屏端 50ms 冻结顿挫与倍率爆点冲击波。

### 3. 连续完整音画录屏
* **兼容 MP4 格式**：[`gamefeel-sequence.mp4`](gamefeel-sequence.mp4) (641 KB)
* **WebM 高保真格式**：[`gamefeel-sequence.webm`](gamefeel-sequence.webm) (2.0 MB)
* **包含过程**：从牌桌就绪、卡牌倾斜、普通手 5 连发、高倍率手 50ms 顿挫爆点与战鼓、顿挫中即刻取消与重播、嵌套弹窗低通切入与退出恢复全流程。

---

## 四、 审查与复现指引

```bash
# 1. 确认处于 RFC 独立分支
git checkout feat/gamefeel-audio-elevation-rfc

# 2. 运行 11 项领域物理与节奏编排单元测试 (Vitest)
npx vitest run tests/gamefeel-elevation.test.ts

# 3. 运行 Playwright 真实浏览器全量断言与录屏生成脚本
node harness/gamefeel-orchestration-verify.mjs

# 4. 本地启动开发服务器自由交互体验
npx vite --port 5589
# 访问：http://localhost:5589/harness/gamefeel-demo.html
```
