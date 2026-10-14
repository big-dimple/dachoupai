# 纸牌声音体验整包：可审查候选

在 main `f651a04ef5eb68c29a413acf8b4d8a0e9bbcde09` 上统一43个配方。产品仅 AudioEngine、foley 和新增 mixPolicy；原已合 PR172 的23录音预加载、三路流水线、5秒共同截止、每录音三次会话预算、去重与迟到保护原文保持。未改结算/商店/其它场景UI、规则、数值、保存、用户偏好、默认音乐30/音效80或已有小夜曲；独立分支供父审，不合main或部署。开工范围见[SCOPE](SCOPE.md)，逐文件保护见[protection](protection.json)。

## 直接试听

先 `npm run dev -- --host 127.0.0.1 --port 4173 --strictPort`，打开：

`http://127.0.0.1:4173/docs/production/evidence/tactile-audio-pack-2026-10-14/audition.html`

点击“启用声音与预载”，可对比 A 原版 / B 新版约18秒序列，也可逐事件、逐声部试听，调整原音乐/音效、静音或停止。原版快照只调整本目录进口路径；A/B共享解码原录音和未改的最终压缩/软限幅图，只有一份BGM、一个context，前后设置相同。A的源码按基线保留，不用新配方冒充旧声音。

可下载固定实际输出：[A 原版 WAV](before.wav)、[B 新版 WAV](after.wav)，原始 [A WebM](before.webm) / [B WebM](after.webm)。录音来自实际 Chromium 的最终 WebAudio ceiling 节点，包含同一既有小夜曲、音乐30/音效80。它们是固定事件试听夹具，不是自然百万/亿/万亿游戏成绩或整局录屏。完整脚本与每次样本调用见[render-and-check](render-and-check.mjs)、[render报告](render-report.json)。

## 事件对应与取舍

| 实际入口 | 新配方 / 节奏 | 运行时事实 |
|---|---|---|
| 选牌、牌局拖拽保存 `select()` | 纸面滑动＋22ms后轻触，三个纸样本/两个触样本轮换，55ms最小间隔 | 两者目前共用既有select入口；本包同时改善该触感，不声称新接了独立拖拽事件 |
| 出牌落位 `cardLand()` | 短纸牌落桌＋25ms后木触 | 沿已有主手落位消费点 |
| 买入 `purchase()` / 卖出 / 刷新 | 筹码身体＋75ms确认＋纸面；卖出先收牌再筹码，刷新先整理后落桌 | 仍只消费已有成功交易，不新增付款或奖励 |
| 改牌 `toolUse(family)` | 献纸：拆包→木触→纸尾；整理：洗牌→落位→轻触；升型：纸→柔铃→木触；秘术：低身体→布空气→柔铃 | Game/Shop既有真实使用入口不变，四类音色可逐件试听 |
| 普通计分 `add`、held、roll | 1ms木身体保留，普通降到.029配方增益；短滚动录音替换前一声、无持续循环 | 原三旋转纸/木变体与每事件消费保护，声音不改变计分 |
| 连锁 `multiply` / `retrigger` / `key` | 低身体、过滤空气、柔化尾；连乘音高有界递增至1.1，重触85ms二拍，关键四层 | 真实链index、kind/tier仍由原表现入口提供，不改事件/时槽 |
| 普通最终落地 | 三层，45/90ms筹码与尾音 | `scoreImpact(presentation,'award','award',...)`消费已保存结果 |
| 百万 `≥1,000,000` | 四层，0/45/120/200ms，短收束 | 只读 `presentation.score.finalScore`，不拿累计热度/目标比例当金额 |
| 亿 `≥100,000,000` | 五层，0/55/150/210/300ms，二次木拍后空气/尾 | 内部名awardHundredMillion；亿元档而非10亿阈值 |
| 万亿 `≥1,000,000,000,000` | 六层，0/70/170/290/360/450ms，三拍递进与宽尾 | 仅最终award选绝对分档；前面的key/multiply不预告未来最终分数 |
| 成功 / 失败 | 成功木落→筹码→双柔尾；失败低落身体→收纸→暗落位 | failure仍消费瞬态已提交cue，一次结束/恢复回看不补播 |
| 标题、出弃、资源、概率、玻璃、揭示等 | 同一纸/木/筹码/低身体/柔铃材料语言；完整43配方在试听页展开 | 不叠新BGM、不补振荡器或合成哔声 |

这次自主取舍是复用已经可核许可的成熟录音，统一全部配方/混音，而不是继续增加一套重复资源。所有原始OGG与BGM字节保持。43是配方覆盖数，不是43件新素材或听感通过数。

跨事件设置0–4优先级：纹理/轻触→来源交易→连锁关键→最终奖/结束。保留每语义节流及上限，并对相交时间范围保守控制16个效果声部；32个保留node仍为后备边界，预排未来发牌不能把先前可听拍点提前切掉。强音用15ms把较弱尾音压低到原身体上限的38%，不改滑块/总线；空间不足仅在整套可用层能进入后才回收弱声，无法进入时不伤已有声音。缺首选变体即时取已解码同类，缺整个家族静默，加载完成绝不重放旧事件。录音上声部增益有界，最大单层.047，强音相对tier只作3.5%轻变化，主要区别由音色/拍点/尾长承担。

## 来源与许可

[source audit](sources-audit.json)对23原始录音/220,438B全部逐件核SHA256、大小与既有CC0标注：22件Kenney Casino Audio/Impact Sounds，加原cloth2。官方[Casino Audio](https://kenney.nl/assets/casino-audio)、[Impact Sounds](https://kenney.nl/assets/impact-sounds)页面本次实读均明确CC0；固定镜像声明与RPG副本[cloth2=miss及CC0声明](https://github.com/jarlah/dungeon-haskell/blob/master/assets/CREDITS.md)本次实际取得200响应、保正文哈希及必要许可摘录。保全部现有 sources.json / License.txt / Inkwave MIT通知；没有新下载、购买、收费API或新BGM。

录音里沿用的BGM另受 **Pixabay Content License，非CC0**：Franz Schubert《Serenade / Ständchen》，录音 Jérôme Chauvel / Abydos Music；[原曲](https://pixabay.com/music/solo-piano-serenade-schubert-216755/)、[许可摘要](https://pixabay.com/service/license-summary/)、[原登记](../../../../public/assets/audio/p06/recording.json)。这批只作短游戏音效事件组合比较，不提供单独原曲或音乐素材包；本次实读许可摘要允许创作性改编，禁止无创作改动的独立分发。BGM运行文件哈希保持原登记；技术复用不等于用户音乐/听感签收。

参考Inkwave已有[固定版本/MIT及实际适配记录](../../../../third-party/inkwave/README.md)已核，原minGap/voice cap、75ms配对和body/air/tail结构已有复用，不重复导入。当前参考仓库公开查询404，试玩HTML可达但这批未签完整参考站试玩或听感；不把代码MIT推及所有媒体权利，不下载未经确认音频。

## 实际验证与限制

- [定向日志](targeted-tests.txt)：7文件73项，包括原加载18项全保持；边界金额/非数字/无金额/旧tier降级、最终才选绝对分档、跨事件预算/强弱优先级/拒绝不能破坏已有尾音、已解码同类降级、偏好与瞬态事件消费均有具体验证。测试说明行为，不能证明好听。
- [typecheck](typecheck.txt) / [build](build.txt)通过，原大包警告保留。测试/构建时HEAD为基线＋本候选dirty，并非已上线洁净构建；最终PR精确CI由PR回执另核。
- [浏览器报告](browser-report.json)：系统Chromium151，390×844 touch viewport真正触控启用与OGG解码；150ms响应、暂时网络失败第二次恢复、永久首纸录音404三次后22/23缓存，峰值fetch3。同类替代实际产生source，静音/后台事件消费不补播，fresh万亿产生六层，取消归零，原自定义7/100精确保持、零音效无source。全部语义饱和播放同时≤16、保留≤32、静音清零；另验无WebAudio API不建context/不发音频请求/不崩溃。
- [音轨指标](audio-metrics.json)记录最终输出峰值、RMS与近削波数；前后均无≥.98样本，新混音保留明显头间。它包含BGM/尾音，分段窗口只按夹具名义墙钟时序，浏览器捕获/设备调度会漂移，不是孤立事件或样本级对齐测量；不将峰值/RMS代签轻重、舒服或好听。原始音轨供独立听审。
- 初轮[旧配方期待及边界FAIL](first-tests-FAIL.txt)保留；新策略夹具[饱和时间窗误判FAIL](first-policy-test-FAIL.txt)只修其输入，覆盖相交的高优先级饱和另验拒绝不偷走现有声音。原[试听import失败](first-render-FAIL.json)、[同因浏览器失败](first-browser-FAIL.json)、[A基线重复加载夹具FAIL](second-browser-FAIL.json)保留。修路径/夹具后重跑通过；没有用放宽产品加载上限消红。

**实际听过：无。** 本云环境没有真人耳朵或可签收的主观听音结果，23源清单与所有派生片段均保heard:false。已实际生成/捕获WebAudio、核波形指标及软件解码/行为；用户/父可用试听页和WAV审音。**未验：** 物理Android/iOS扬声器/耳机、宿主后台计时节流、长局耳疲劳、自然全流程/BGM遮盖听感与吸引力、Firefox/WebKit本地声音。不能把touch viewport、自动测试或音轨存在称作这些通过，整体W4/W6听感仍OPEN。

复核：先启动上述dev服务，运行 `node docs/production/evidence/tactile-audio-pack-2026-10-14/browser-check.mjs`、`node docs/production/evidence/tactile-audio-pack-2026-10-14/render-and-check.mjs`；定向命令完整在targeted-tests日志首行。PR合并/部署与真正听验由父协调，本候选不代签。
