# 《唐宋牌》视听打击感、音画共奏与物理交互返工验证报告 (第三轮整改收口)
> **分支**：`feat/gamefeel-audio-elevation-rfc` (独立审查与原型分支，严禁合入 main)  
> **基线**：`ccb21d4c93d50e7d67b1d6eb14fed23926ab1e3a`  
> **验证时间**：2026-10-17 23:34 (UTC+8)  
> **运行环境**：Chromium 123.0 (Headless, 1040×780 & 390×740 Mobile, Web Audio API, Vite 7.3.6)  
> **审查机制声明**：由单一 Agent 独立完成代码审查、调用链追溯与真实断言执行，如实记录，无多模型交叉审查虚构。  
> **断言汇总**：**33/33 真实断言 PASS，0 Page Errors，11/11 Vitest 领域单测全部通过**  
> **产物证据**：PC 与手机竖屏 9 帧关键截屏、连续 WebM/MP4 录屏、结构化断言日志 `report.json`

---

## 一、 三类确认缺陷修复对照表 (第三轮专项)

| 缺陷类别 | 根本原因定位 | 修复前表现与风险 | 最终修复方案与实现代码 |
| :--- | :--- | :--- | :--- |
| **1. 音频生命周期与声部泄漏** | `playPentatonicNote` 在 `retain(voice)` 之后直接覆盖 `osc.onended`，抹除了引擎原有的声部释放回调；副振荡器（`oscHarmonic`）未纳入 Voice 节点树。 | 播放自然结束后 voice 无法自动 release，已停止的节点滞留在 `this.voices`，导致超出 32 声部预算后被异常淘汰或残留内存。 | 在 `Voice` 接口拓展 `secondarySources?: AudioScheduledSourceNode[]`；在 `release(voice)` 中统一安全清理主/辅振荡器、增益与滤波器；在 `playPentatonicNote` 注册辅源并移除非法 `osc.onended` 覆盖，保留引擎完整 release 链路。暴露 `getActiveVoiceCount()` 供断言声部归零。<br>文件：[`src/audio/AudioEngine.ts`](file:///var/www/dachoupai/src/audio/AudioEngine.ts) |
| **2. 计分事件顺序与显示精度** | `ScoringRhythmOrchestrator` 将 `cardEvents` 与 `multEvents` 人为分批，改变了事件原本时序；唐宋牌与英雄加算被遗漏；分数显示使用整数强制转换将 1.5x 显示为 1。 | 乘法事件在手牌打击之前提前播放或重复播放；`event.after` 出现数值倒退；非整数倍率精度丢失。 | 重构为**严格原序消费模式**：直接遍历领域原版 `trace.events` 数组；按事件分类仅调节单步节奏强弱（普通 160ms、英雄 220ms、加算 180ms、连乘爆点 320ms+50ms 冻结），绝不重排事件；导出 `formatRational()` 保持 Rational 分数/小数显示精度（1.5 显示为 "1.5"），数值严格递增。<br>文件：[`src/gamefeel/ScoringRhythmOrchestrator.ts`](file:///var/www/dachoupai/src/gamefeel/ScoringRhythmOrchestrator.ts) |
| **3. 视觉变换组合冲突与倾斜隔离** | 弹簧、倾斜与外层容器争写同个 `scale/rotation`；`baseArtX/Y` 丢失；Container 原有的 `(-width/2, -height/2)` hitArea 导致 Phaser 的 `displayOrigin` 偏移将触控判定区整体向左偏移半个卡位。 | 弹簧跳跃覆盖倾斜姿态；Hit-Stop 冻结时因时钟未挂接导致变量虽然冻结但画面仍在位移；鼠标悬浮左移误触邻卡。 | 严格落实**3 层独立嵌套容器架构**：Layer 1 `container` (排版与拖拽) → Layer 2 `springLayer` (物理弹簧与跳跃) → Layer 3 `tiltLayer` (2.5D 微倾、视差底图、高光)；`PhaserCardTilt` 保存并相对 `baseArt` 进行偏移；修正 HitArea 为 `(0, 0, width, height)` 完美消除 Phaser displayOrigin 偏置；HitStop 期间 `effectiveDt=0` 时多层物理完全冻结。<br>文件：[`src/gamefeel/PhaserCardTilt.ts`](file:///var/www/dachoupai/src/gamefeel/PhaserCardTilt.ts)<br>[`harness/gamefeel-demo.ts`](file:///var/www/dachoupai/harness/gamefeel-demo.ts) |

---

## 二、 最小验证集执行结果明细 (33 项断言汇总)

所有用例均由真实断言判断，一旦失败立即抛出异常并返回非零退出码（Non-zero exit code）：

| 验证场景 | 断言项 | 断言条件 | 结果 | 状态 |
| :--- | :--- | :--- | :---: | :---: |
| **环境就绪** | Phaser Canvas 挂载 | 画布存在且宽 960、高 520 | PASS | ✓ |
| **Scenario 8 [触控解锁]** | 触控激活音频引擎 | 真实用户手势后 AudioContext.state === 'running' | PASS | ✓ |
| **Scenario 8 [声部清理]** | 初始声部预算 | `getActiveVoiceCount() === 0` | PASS | ✓ |
| **Scenario 10 [姿态复位]** | reset() 幂等复位 | 全部卡牌 3 层 y=0, scale=1, rot=0，无报错抛出 | PASS | ✓ |
| **Scenario 10 [倾斜隔离]** | 父容器坐标隔离 | 鼠标悬浮倾斜时外层 container.x/y 绝对不变 | PASS | ✓ |
| **Scenario 10 [倾斜生效]** | 2.5D 透视旋转 | 鼠标悬浮卡面时 `abs(tiltLayer.rotation) > 0.001` | PASS | ✓ |
| **Scenario 1 [起势阶段]** | Phase 1 起势留白 | 编排器经历 `windup` 状态，120ms 视听留白聚焦 | PASS | ✓ |
| **Scenario 1 [连发阶段]** | Phase 2 宫商角徵羽 | 经历 `striking` 状态，卡牌阶梯弹跳打击 | PASS | ✓ |
| **Scenario 1 [普通计分]** | 终值严格一致 | `readout.finalScore === trace.finalScore` | PASS | ✓ |
| **Scenario 1 [普通计分]** | 通关大捷判定 | 达到目标分数判定 `isVictory === true` | PASS | ✓ |
| **Scenario 3 [事件全量]** | 事件全量处理 | 处理事件数 === 领域 ScoreTrace 事件总数 (无漏播重复) | PASS | ✓ |
| **Scenario 3 [严格原序]** | 严格原始时序 | 处理事件 eventId 顺序与 trace.events 完全逐项一致 | PASS | ✓ |
| **Scenario 3 [小数精度]** | 1.5x 小数精度 | 准确保留 "1.5" 倍率字符串，无截断取整为 1 | PASS | ✓ |
| **Scenario 2 [多帧顿挫冻结]** | Hit-Stop 物理冻结 | 冻结期间按代际采样连续多帧，y/scale/rot 100% 相同 | PASS | ✓ |
| **Scenario 7 [顿挫取消]** | 冻结中取消状态 | 取消后编排器立返 `idle`，弹簧 1 帧复位为 0 | PASS | ✓ |
| **Scenario 7 [立即重播]** | 取消后即刻重播 | 新一手从第 0 步干爽启动，旧回调无残留污染 | PASS | ✓ |
| **Scenario 4 [未通关]** | 失败不放胜利音 | finalScore < goalScore 时 `isVictory === false`，绝不奏响大捷编钟 | PASS | ✓ |
| **Scenario 5 [六英-sushi]** | 苏轼技能触发 | 产出真实 `characterScore: multiply-multiplier` (x3) | PASS | ✓ |
| **Scenario 5 [六英-liue]** | 刘娥技能触发 | 产出真实 `characterScore: add-multiplier` (+1.5) | PASS | ✓ |
| **Scenario 5 [六英-qinqiong]** | 秦琼技能触发 | 产出真实 `characterScore: multiply-multiplier` | PASS | ✓ |
| **Scenario 5 [六英-xinqiji]** | 辛弃疾技能触发 | 产出真实 `characterScore: add-heat` (+120) | PASS | ✓ |
| **Scenario 5 [六英-wencheng]** | 文成公主技能触发 | 产出真实 `characterScore: add-multiplier` (+1) | PASS | ✓ |
| **Scenario 5 [六英-huarui]** | 花蕊夫人技能触发 | 产出真实 `characterScore: multiply-multiplier` (x2) | PASS | ✓ |
| **Scenario 6 [1x/4x速率]** | 4x 快进加速 | 4x 模式在 1500ms 内完整执行完毕 (实测 771ms) | PASS | ✓ |
| **Scenario 11 [低通嵌套]** | 进商店深度 1 | 低通滤波开启，音乐降至 450Hz，UI 保持清脆 | PASS | ✓ |
| **Scenario 11 [低通嵌套]** | 弹窗堆叠深度 2 | 打开卡牌详情弹窗，低通深度递增至 2 | PASS | ✓ |
| **Scenario 11 [低通嵌套]** | 退弹窗深度 1 | 关闭卡牌详情，低通深度回落至 1，滤镜持续有效 | PASS | ✓ |
| **Scenario 11 [低通嵌套]** | 全部退出恢复 | 关闭商店深度降为 0，音乐恢复 20kHz 明亮 | PASS | ✓ |
| **Scenario 8 [静音切换]** | 统一静音生效 | `audioEngine.muted === true`，无声音泄漏 | PASS | ✓ |
| **Scenario 8 [静音切换]** | 解除静音恢复 | `audioEngine.muted === false`，恢复正常响度 | PASS | ✓ |
| **Mobile View [竖屏就绪]** | 手机竖屏自适应 | 390×740 竖屏下牌桌完整居中无截断 | PASS | ✓ |
| **Mobile View [竖屏爆点]** | 手机竖屏爆点 | 390×740 竖屏下爆点横幅与特效正常呈现 | PASS | ✓ |

---

## 三、 产物证据索引

### 1. 桌面端关键截图 (PC 1040×780)
* [`01-pc-idle-phaser-ready.png`](01-pc-idle-phaser-ready.png)：Phaser 牌桌画布挂载就绪，五英雄卡横向排列。
* [`02-pc-card-tilt-inner-visual.png`](02-pc-card-tilt-inner-visual.png)：苏轼卡 2.5D 透视倾角生效，高光流动，父容器排版坐标稳定。
* [`03-pc-phase1-windup-silence.png`](03-pc-phase1-windup-silence.png)：阶段一【起势】，选牌上浮 18px 聚焦，视听留白 120ms 蓄势。
* [`04-pc-phase2-strikes-pentatonic.png`](04-pc-phase2-strikes-pentatonic.png)：阶段二【连发】，按宫商角徵羽阶梯冲刺打击，筹码飞入总分。
* [`05-pc-phase3-climax-hitstop-freeze.png`](05-pc-phase3-climax-hitstop-freeze.png)：阶段三【爆点】，触发 50ms 冻结顿挫与战鼓爆点横幅弹出。
* [`06-pc-phase4-resolution-victory.png`](06-pc-phase4-resolution-victory.png)：阶段四【收束】，通关大捷长鸣，卡牌柔和回落基准面。
* [`07-pc-audio-filter-nested-muffled.png`](07-pc-audio-filter-nested-muffled.png)：音乐低通滤波生效中（进出商店与多层嵌套弹窗深度栈）。

### 2. 手机竖屏关键截图 (Mobile 390×740)
* [`08-mobile-portrait-table-view.png`](08-mobile-portrait-table-view.png)：390×740 竖屏自适应牌桌视口。
* [`09-mobile-portrait-climax-burst.png`](09-mobile-portrait-climax-burst.png)：390×740 竖屏端倍率爆点呈现。

### 3. 连续完整音画录屏
* **兼容 MP4 格式**：[`gamefeel-sequence.mp4`](gamefeel-sequence.mp4) (1.0 MB)
* **WebM 高保真格式**：[`gamefeel-sequence.webm`](gamefeel-sequence.webm) (2.8 MB)
* **录屏说明**：Playwright `recordVideo` 录制无头浏览器实际渲染画面，涵盖牌桌就绪、卡牌倾斜、普通手 5 连发、高倍率手 50ms 顿挫爆点与战鼓、顿挫中即刻取消与重播、嵌套弹窗低通切入与退出恢复全流程。注：Playwright 原生录屏仅捕获 Canvas 视频轨，音频由单测及浏览器内 `AudioContext.state` / `getActiveVoiceCount()` 接口完成代码与参数级别全量真实断言。

---

## 四、 测试床（Harness）与正式游戏（GameScene）的边界说明

为避免对正式牌局产生任何耦合与破坏，本分支的所有改动与验证代码均严格受限在可插拔模块与测试床中：

1. **测试床独占部分（不合入正式牌局）**：
   * `harness/gamefeel-demo.ts` / `harness/gamefeel-demo.html`：仅用于集成验证与可视化调参，正式牌局不引用。
   * `harness/gamefeel-orchestration-verify.mjs`：Playwright 自动化测试脚本，不进入打包发布物料。
2. **正式可复用模块（供高级 AI 评审合并）**：
   * [`src/audio/AudioEngine.ts`](file:///var/www/dachoupai/src/audio/AudioEngine.ts)：公共扩展方法，向下完全兼容既有播放逻辑。
   * [`src/gamefeel/PhaserCardTilt.ts`](file:///var/www/dachoupai/src/gamefeel/PhaserCardTilt.ts)：独立 Phaser 容器倾斜组件，仅依赖容器尺寸与 Phaser 输入。
   * [`src/gamefeel/ScoringRhythmOrchestrator.ts`](file:///var/www/dachoupai/src/gamefeel/ScoringRhythmOrchestrator.ts)：纯粹的编排时钟状态机，只消费领域 `ScoreTrace`。
   * [`src/gamefeel/SpringMotion.ts`](file:///var/www/dachoupai/src/gamefeel/SpringMotion.ts)：纯数学力学积分器，无外部框架依赖。
   * [`src/gamefeel/HitStopPresentationTimeline.ts`](file:///var/www/dachoupai/src/gamefeel/HitStopPresentationTimeline.ts)：可取消表现时钟控制器。
   * [`src/gamefeel/AudioFilterTransition.ts`](file:///var/www/dachoupai/src/gamefeel/AudioFilterTransition.ts)：独立低通状态深度栈。
