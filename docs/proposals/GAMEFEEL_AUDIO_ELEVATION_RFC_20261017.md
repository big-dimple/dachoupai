# 《唐宋牌》视听美学、打击感与游戏心流跃升提案（RFC）
> **分支名称**：`feat/gamefeel-audio-elevation-rfc`  
> **状态**：独立提案与原型验证分支（供高级 AI 审查与合并评估）  
> **核心目标**：打破防御性修补瓶颈，从“规则计算器”升阶为“视听震撼、多巴胺爆发的商业级 Roguelike 神作”

---

## 目录
1. [背景与现状诊断：为什么防御性修补达到了上限？](#一-背景与现状诊断为什么防御性修补达到了上限)
2. [商业标杆深度解构：顶级卡牌的“爽感”来自哪里？](#二-商业标杆深度解构顶级卡牌的爽感来自哪里)
   - 2.1 《小丑牌》（Balatro）：阶梯音调、火焰计数与 2.5D 物理触感
   - 2.2 《怪奇物语》（Stranger Things）：80s 模拟合成器琶音的催眠张力
   - 2.3 《杀戮尖塔》与《邪恶冥刻》：打击顿挫（Hit Stop）与拟物案几质感
3. [《唐宋牌》四大跃升台阶方案](#三-唐宋牌四大跃升台阶方案)
   - 台阶一：听觉革命——国风赛博音轨与“宫商角徵羽”实时演奏
   - 台阶二：物理打击感——弹簧力学模型（Spring Physics）与微顿挫（Hit Stop）
   - 台阶三：材质与视差——2.5D 微倾角跟随与国风泥金流光
   - 台阶四：心流连续性——消除阻断性遮罩，打造书斋案几沉浸感
4. [本分支交付的音频素材与原型代码清单](#四-本分支交付的音频素材与原型代码清单)
5. [供接手高级 AI 的渐进式接入建议与优先级路线](#五-供接手高级-ai-的渐进式接入建议与优先级路线)

---

## 一、 背景与现状诊断：为什么防御性修补达到了上限？

在经过全天 120 余个 commit 的拉网式排查后，底层系统的稳定性、内存安全、字段映射与安全边界均已牢固建立。但玩家与制作人在实际游玩时，依然能明显感到：**“游戏虽然不出错了，但玩起来就是不够过瘾、没有上头感、视听体验缺乏灵魂。”**

造成这一瓶颈的深层根因在于：
1. **音乐风格严重错位**：原本使用的 19 世纪欧式舒伯特小夜曲（Schubert Piano Serenade）和阿根廷探戈（Tango de Manzana），与《唐宋牌》的文人英雄底蕴完全背道而驰；而 Boss 战使用的 32 秒合成片段也并未传达出《怪奇物语》那种标志性的 80 年代模拟合成器冷峻张力。
2. **计分如同“打字机打印”，缺乏多巴胺阶梯**：计分跳字只是一串固定声调的平铺直叙，没有节奏起伏；打出一手大牌和打出一手废牌的视听震荡毫无区别。
3. **视觉交互平面死板**：72 张唐宋精美手绘卡面被禁锢在静态平面矩形框内，没有触控视差微倾角，缺乏如真卡在手的物理分量。
4. **弹窗打断心流**：频繁的全屏/半屏模态窗口打断了玩家视线，缺乏连贯的案几操作空间感。

---

## 二、 商业标杆深度解构：顶级卡牌的“爽感”来自哪里？

### 2.1 《小丑牌》（Balatro）：阶梯音调、火焰计数与 2.5D 物理触感
* **半音阶递增（Chromatic Pitch Escalation）**：
  打出一手牌后，从左到右结算每张计分牌时，音效严格按照半音阶（Pitch 上浮 +10%~+15%）递增。每一张牌的爆点不仅是加分，更是在演奏一段激昂的上升乐句。
* **高倍率时的低频重击（Sub-bass Thump）与火焰点燃**：
  普通点数加算（Chips）为清脆的高音；一旦触发乘法小丑牌（X Mult），音效瞬间下潜为深沉的低音炮轰鸣（30~60Hz Sub-bass），倍率框瞬间点燃火焰（Fire Shader），数字伴随高频微抖动（Camera Shake），达到目标阈值时爆发爆刷入库。
* **2.5D 鼠标/触控倾斜（Tilt Parallax）**：
  卡牌不是静态平面的，当指针或手指触碰卡面时，卡牌会根据触摸点位置发生 2~4 度的三维倾角微转动，光斑随之流动，给玩家带来把玩实体纸牌的极其强烈的解压触感。
* **低通滤波器平滑过渡（BiquadFilter Low-pass）**：
  进商店或暂停时，背景音乐从不硬切，而是瞬间接入低通滤波器（Low-pass Filter），高频被过滤为朦胧的俱乐部隔墙电音；回到牌桌瞬间打开，心流持续无缝。

### 2.2 《怪奇物语》（Stranger Things）：80s 模拟合成器琶音的催眠张力
* 《怪奇物语》主题曲（Kyle Dixon & Michael Stein）的核心魅力在于：
  * **80 年代模拟合成器脉冲琶音**：经典的 C3 - E3 - G3 - B3 - C4 - B3 - G3 - E3 琶音（Roland Juno / Prophet 模拟质感），带有动态低通滤波器开合（Filter Sweep）；
  * **极重低音（Sub-Bass Drone）与节奏脉冲**：深邃的低音垫底营造不可名状的压迫感与神秘未知氛围；
  * **与 Roguelike 牌局的完美化学反应**：这种冷峻、未知、带有脉冲催眠感的暗色合成器波（Dark Synthwave），正是现代 Roguelike 牌局对抗不可名状 Boss 压制的最佳氛围催化剂。

### 2.3 《杀戮尖塔》与《邪恶冥刻》：打击顿挫（Hit Stop）与拟物案几质感
* **打击微冻结（Hit Stop）**：
  格斗游戏的核心技术迁移：当大牌或致命伤害打出时，画面**刻意冻结 40~60 毫秒**。这一瞬间的极短停滞会在大脑中建立“受击物具有巨大惯性阻力”的错觉，随后伴随粒子和震屏爆发，打击感直接翻倍。
* **木质案几实录声学（Foley Realism）**：
  摸牌纸张沙沙声、落牌入台的红木闷响、铜质砝码在天平上的撞击，为冷冰冰的数字游戏赋予了温润的实物仪式感。

---

## 三、 《唐宋牌》四大跃升台阶方案

### 台阶一：听觉革命——国风赛博音轨与“宫商角徵羽”实时演奏
1. **替换欧式小夜曲与探戈，引入正统风格 BGM**：
   - **首领战 / 高压局**：引入正统《怪奇物语》风格 80s 模拟合成器琶音长循环音轨 [`boss-stranger-things-theme.mp3`](file:///var/www/dachoupai/public/assets/audio/gamefeel-rfc/boss-stranger-things-theme.mp3)（标准 C-E-G-B-C 琶音 + 80s 鼓组 + 浑厚低音炮）；
   - **常规桌案对局**：引入《唐宋赛博》（Tang-Song Cyber Groove）[`table-tangsong-cyber-groove.mp3`](file:///var/www/dachoupai/public/assets/audio/gamefeel-rfc/table-tangsong-cyber-groove.mp3)（古筝/琵琶五声旋律融合 80s 暖色模拟贝斯与 Lo-fi 极度抓耳节奏），既有唐宋风骨，又具现代卡牌的催眠沉浸感。
2. **计分音效乐器化（五声音阶实时合成器）**：
   - 彻底摒弃杂乱 sample，使用 Web Audio API 原生模块 [`PentatonicSynth.ts`](file:///var/www/dachoupai/src/gamefeel/PentatonicSynth.ts) 实时合成中国传统**五声音阶（宫 C5、商 D5、角 E5、徵 G5、羽 A5）**；
   - 连续打出 5 张牌时，卡牌跳字自动依次演奏“宫商角徵羽”，音高阶梯上行；
   - 触发英雄乘倍率时，切入唐代天策战鼓轰鸣（[`sfx-wardrum-mult-hit.ogg`](file:///var/www/dachoupai/public/assets/audio/gamefeel-rfc/sfx-wardrum-mult-hit.ogg)）；
   - 冲破关卡目标线的瞬间，爆发悠远空灵的编钟铜磬共鸣（[`sfx-temple-bell-victory.ogg`](file:///var/www/dachoupai/public/assets/audio/gamefeel-rfc/sfx-temple-bell-victory.ogg)）。

### 台阶二：物理打击感——弹簧力学模型（Spring Physics）与微顿挫（Hit Stop）
1. **弹簧模型代替硬直 Tween**：
   - 使用 [`SpringMotion.ts`](file:///var/www/dachoupai/src/gamefeel/SpringMotion.ts) 接管卡牌的位移、抬起、缩放与旋转；
   - 卡牌被选中时，带有能量感的轻微回弹（Snappy Preset: stiffness=260, damping=20）；落位时如同硬宣纸轻扣桌案般微微沉降（Gentle Preset）。
2. **微顿挫（Hit-Stop 40~60ms）**：
   - 使用 [`HitStopManager.ts`](file:///var/www/dachoupai/src/gamefeel/HitStopManager.ts)，在英雄大招或乘数达到极值瞬间，逻辑帧微冻结 50ms，数字短暂蓄力，随后猛烈膨胀 1.25 倍并附带阻尼抖屏释放。

### 台阶三：材质与视差——2.5D 微倾角跟随与国风泥金流光
1. **卡牌 2.5D 视差触感**：
   - 使用 [`CardTiltEffect.ts`](file:///var/www/dachoupai/src/gamefeel/CardTiltEffect.ts)，玩家在移动端触摸或 PC 鼠标悬停卡牌时，卡牌跟随触点产生 ±14° 的 3D 透视倾斜矩阵变化；
   - 配合动态高光层（`card-glare-overlay`），随着卡牌倾斜角度实时反射微妙的暗金光晕。
2. **国风材质流光（替代死板灰色与半透明框）**：
   - **闪箔（Foil）**：工笔画泥金工艺（金粉在卡边纤维隐隐流转）；
   - **多彩（Polychrome）**：宋代青绿山水与汝窑釉光渐变流动；
   - **技能附着**：书法飞白般的淡金烟气环绕，而非机械矩形红框。

### 台阶四：心流连续性——消除阻断性遮罩，打造书斋案几沉浸感
1. **背景音乐低通滤波（Low-pass BiquadFilter）**：
   - 使用 [`AudioFilterTransition.ts`](file:///var/www/dachoupai/src/gamefeel/AudioFilterTransition.ts)，进商店或看规则时，音乐平滑截止至 420Hz，营造静谧思考空间，退回对局立即通透打开，音乐永不突兀中断。
2. **案几空间恒定**：
   - 商店进出采用类似掀开书斋帷幕或展卷的景深推拉（Dolly Zoom），底层牌桌不卸载不黑屏，强化“文人坐镇案几运筹帷幄”的宿命感。

---

## 四、 本分支交付的音频素材与原型代码清单

本分支所有素材与代码均为全新独立研发/生成，零依赖、完全类型安全、零构建报错：

### 1. 音频资源（位于 [`public/assets/audio/gamefeel-rfc/`](file:///var/www/dachoupai/public/assets/audio/gamefeel-rfc/)）
| 文件名 | 格式/大小 | 风格与用途 | 试听说明 |
| :--- | :--- | :--- | :--- |
| `boss-stranger-things-theme.mp3` | MP3 / 1.1MB / 45s | 正统《怪奇物语》80s 模拟合成器暗色琶音主题曲（C-E-G-B-C 循环、模拟贝斯、80s 鼓组） | 专为 Boss 关卡与高压对决设计，彻底消除 32 秒硬切短板 |
| `table-tangsong-cyber-groove.mp3` | MP3 / 980KB / 42s | 国风赛博古筝/琵琶 Lo-fi Chill 循环音轨（五声旋律融合暖色模拟低音） | 专为常规对局设计，契合唐宋文化并兼具 Balatro 式催眠沉浸感 |
| `sfx-penta-1-gong.ogg` | OGG / 8.4KB | 宫调（C5 523Hz）青瓷/编钟清脆敲击音 | 计分第 1 张牌触发 |
| `sfx-penta-2-shang.ogg` | OGG / 8.3KB | 商调（D5 587Hz）青瓷/编钟清脆敲击音 | 计分第 2 张牌触发 |
| `sfx-penta-3-jiao.ogg` | OGG / 8.4KB | 角调（E5 659Hz）青瓷/编钟清脆敲击音 | 计分第 3 张牌触发 |
| `sfx-penta-4-zhi.ogg` | OGG / 8.2KB | 徵调（G5 784Hz）青瓷/编钟清脆敲击音 | 计分第 4 张牌触发 |
| `sfx-penta-5-yu.ogg` | OGG / 8.0KB | 羽调（A5 880Hz）青瓷/编钟清脆敲击音 | 计分第 5 张牌触发 |
| `sfx-wardrum-mult-hit.ogg` | OGG / 14KB | 唐代大唐战鼓下潜低音炮撞击（120Hz 下潜至 38Hz） | 英雄大招、乘倍率（X Mult）爆发瞬间 |
| `sfx-temple-bell-victory.ogg` | OGG / 23KB | 空灵悠扬古刹铜磬/编钟 432Hz 神圣长鸣（2.5 秒延音） | 冲破关卡目标阈值、终局大捷瞬间 |

### 2. 原型代码模块（位于 [`src/gamefeel/`](file:///var/www/dachoupai/src/gamefeel/)）
| 模块名称 | 导出类 / 接口 | 核心价值与返工解决的硬伤 |
| :--- | :--- | :--- |
| [`PhaserCardTilt.ts`](file:///var/www/dachoupai/src/gamefeel/PhaserCardTilt.ts) | `PhaserCardTilt`, `PhaserCardTiltConfig` | **专为 Phaser.GameObjects.Container 研发**：直接接牌桌容器，保留完整 hitArea、点击、选牌和拖拽手感；多层内部视差（art vs frame）；`destroy()` 严格清理 6 类事件监听器。 |
| [`PentatonicSynth.ts`](file:///var/www/dachoupai/src/gamefeel/PentatonicSynth.ts) | `PentatonicSynth` | **接 AudioEngine SFX 支路**：遵循游戏静音与音量滑块；限制 261Hz~1318Hz (E6) 频率安全上限；6 声部复音上限与自动防爆音窃取；支持快进与 `cancelAll()` 瞬间清理。 |
| [`HitStopPresentationTimeline.ts`](file:///var/www/dachoupai/src/gamefeel/HitStopPresentationTimeline.ts) | `HitStopPresentationTimeline` | **可取消的表现微顿挫**：解耦表现时钟与领域时钟，只停动画表现，不冻结操作、规则或存档；支持 `AbortSignal` 与计时器代际安全防踩。 |
| [`SpringMotion.ts`](file:///var/www/dachoupai/src/gamefeel/SpringMotion.ts) | `Spring1D`, `SpringCardTransform`, `SPRING_PRESETS` | **稳定分步积分（<=8ms 子步）**：输入帧间隔钳制（<=0.1s），防切后台爆炸；参数下限兜底（mass>=0.01），彻底消除数值发散。 |
| [`AudioFilterTransition.ts`](file:///var/www/dachoupai/src/gamefeel/AudioFilterTransition.ts) | `AudioFilterTransition` | **接入 AudioEngine 音乐支路**：仅过滤音乐，计分音效与 UI 维持清脆；多层弹窗深度栈（Depth Stack），保证嵌套弹窗退净后平滑恢复 20kHz。 |
| [`ScoringRhythmOrchestrator.ts`](file:///var/www/dachoupai/src/gamefeel/ScoringRhythmOrchestrator.ts) | `ScoringRhythmOrchestrator` | **4 阶段音画共奏编排**：明确起势（120ms 留白蓄力）、连发（五声音阶 170ms 爬升）、爆点（50ms 冻结 + 大唐战鼓重拍）、收束（大捷编钟 + 柔和落定）。 |

---

## 五、 真实 Chromium 运行与多帧录屏证据

已通过 Playwright 无头 Chromium 运行独立测试床（[`harness/gamefeel-orchestration-verify.mjs`](file:///var/www/dachoupai/harness/gamefeel-orchestration-verify.mjs)），**8 项测试全通（8/8 PASS），0 Page Error**。

证据文件位于 [`docs/production/evidence/gamefeel-elevation-2026-10-17/`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/)：
* **关键时点连续截图**：
  1. [`01-idle-table-ready.png`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/01-idle-table-ready.png)（初始桌案）
  2. [`02-card-tilt-interaction.png`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/02-card-tilt-interaction.png)（2.5D 透视微倾角与暗金高光）
  3. [`03-phase1-windup-pause.png`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/03-phase1-windup-pause.png)（起势 120ms 蓄力留白）
  4. [`04-phase2-strikes-pentatonic.png`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/04-phase2-strikes-pentatonic.png)（连发 宫商角徵羽阶梯）
  5. [`05-phase3-climax-hitstop-freeze.png`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/05-phase3-climax-hitstop-freeze.png)（爆点 50ms 冻结顿挫）
  6. [`06-phase4-resolution-victory.png`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/06-phase4-resolution-victory.png)（收束 编钟共鸣）
  7. [`07-audio-filter-muffled.png`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/07-audio-filter-muffled.png)（进出商店音乐低通）
* **连续录屏视频**：
  - WebM 格式：[`gamefeel-sequence.webm`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/gamefeel-sequence.webm)
  - MP4 格式：[`gamefeel-sequence.mp4`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/gamefeel-sequence.mp4)
* **详细检验报告**：[`README.md`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/README.md) 与 [`report.json`](file:///var/www/dachoupai/docs/production/evidence/gamefeel-elevation-2026-10-17/report.json)

---

## 六、 本地交互体验指南

审查人员可在本地一键启动可交互页面进行手动把玩：
```bash
git checkout feat/gamefeel-audio-elevation-rfc
npx vite --port 5493
# 打开浏览器：http://localhost:5493/harness/gamefeel-demo.html
```
