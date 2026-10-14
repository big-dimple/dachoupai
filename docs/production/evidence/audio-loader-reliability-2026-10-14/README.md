# 录音样本加载可靠性：有限软件证据

## 开工卡与边界

- requirementId：audio-sample-loading-reliability-20261014，承接既有 W4/W6 音路维护，唯一总排程仍是 `docs/production/DELIVERY_PLAN.md`。
- inputSHA：最新远端 main `c08a77ee573a291b7c05ed4787d27ae5299ea103`，独立分支 `dev/audio-loader-reliability-20261014`。已读根 AGENTS、唯一计划的当前调度/音路/工程与执行合同；工作区与仓库未提供 `.agents/skills` 文件。
- dependencies：已有 AudioEngine、23 件录音和 sampleBody；保原手势入口、静音、后台暂停、漏音不补播合同。
- allowedFiles：`src/audio/AudioEngine.ts`、`tests/audio-sample-loading.test.ts`，本证据目录的确切文件列于 [files.txt](files.txt)。产品写入只有 AudioEngine 的加载字段/常量、触发与两个加载方法。
- nonGoals：新音效/BGM、音量/混音配方、规则、场景、高光、结算、素材、依赖、配置、唯一计划。只读查询 PR171 全部文件，改动集合不相交；不合 main、不部署、不 force/delete、不改权限。
- outputs：失败复现、最小产品修复、专项测试/浏览器脚本与报告、正常 commit/push 和 Draft PR；精确最终 HEAD/CI 由 PR 回执另核，不用旧绿 CI 代签。
- acceptance：卡住请求释放后续槽位，暂时失败恢复，永久失败有限退出，成功/在途去重，超时/关闭/过时 context 结果不发布；原生命周期及漏音消费保持。
- stopConditions：越出该文件窗口、碰到 PR171 文件、测试显示生命周期/漏音合同回退、外部写入拒绝即停相关行动并留证；用户离线不停止已授权独立开发。

## 核码与实际失败

基线 `AudioEngine.ts:236–241` 的 Promise.all 首次解锁立刻发出全部 23 个 fetch/decode。没有请求/响应体/解码截止、并发上限或重试；单个失败被吞，scoreSampleTask 永久保留。原路径只在建立 gains 时调用加载，因此失败样本不能在本会话重新加载。

产品修改前已运行 [baseline-FAIL.log](baseline-FAIL.log)：14 项全部红。可归因的产品失败包括首波 23 而非 3 请求、暂时 network/HTTP/body/decode 失败仅缓存 22/23、永久失败只尝试一次、卡住任务不结束，关闭/更换 context 后仍发布 23 个结果。

该首轮也包含一个测试夹具问题：缺音时已有普通 cue 节流时间，后续 fresh cue 与其同一模拟时刻，被原有节流正确吞掉。只推进该 fresh cue 的模拟时钟 100ms，**产品修改前**该控制项 [baseline-cue-control-PASS.log](baseline-cue-control-PASS.log) 已通过，故不把它记成产品缺陷。首次 loader-tests.log 的 14 项与后续增加的专项覆盖分开读。

## 最小修复

三 worker 从同一队列取样本，槽位覆盖 fetch、响应体读取与 decode；每次尝试共用 5,000ms 截止。超时主动 abort，同时 Promise.race 保证忽略 AbortSignal 的 transport/解码不会卡住加载任务。失败排到未尝试样本之后，每样本本会话最多三次尝试；预算不因重复 unlock 或前后台恢复重置。

成功 AudioBuffer 与 SampleBody 一起发布并缓存。重复加载共享同一在途任务，成功缓存不会重下；完成后释放 task。已有 gains 的 unlock 也可检查尚未处理且仍有预算的样本。每次尝试私有 active 标记和 context 身份/closed 检查，使超时迟到 fetch/body 不再启动解码，迟到 decode 不覆盖成功缓存；加载过程不创建声音或排队补播。

预算耗尽后该样本在本 AudioEngine 实例中保持静默；重新载入页面才有新预算。这是有限退出策略，不宣称任意长断网都能恢复。浏览器原生 decodeAudioData 已开始后无法物理取消；三路上限指有效加载流水线，已超时的底层解码可能仍完成，结果丢弃且总尝试数有界。主线程 sampleBody 的同步计算不能被 timer 抢占，本批沿用原短录音算法/素材，未扩展大文件预算。

## 实际通过

- [targeted-tests.log](targeted-tests.log)：6 文件 / 58 项通过，其中加载器 19 项。覆盖首波/解码槽位、在途去重、三路暂时失败与 HTTP/decode、三阶段超时、永久失败三次预算/重复调用、迟到三阶段、closed/replaced context、真实入口的 context 创建模拟、静音/隐藏/后台门与漏音不补播。无 timer 残留。
- [typecheck.log](typecheck.log)、[build.log](build.log)：通过；构建原有大包警告保留。build-info 标识测试时 base + dirty，不称已发布的洁净构建。
- [browser-check.mjs](browser-check.mjs) 与 [browser-report.json](browser-report.json)：系统 Chromium 151.0.7922.173、真实 pointerdown/AudioContext/现有 OGG 解码，音频独立夹具，未启动游戏旅程。手势前无 context/请求，解锁后 running；故障案例实际峰值 fetch=3、共 29 次请求，网络暂时失败和损坏 OGG 各第二次恢复，卡住请求/永久404各恰三次，缓存及 body 21/23，其余样本各一次；重复 unlock 后仍29次。
- 第二浏览器案例刻意使首个 fetch 忽略 abort、6秒晚回有效响应：超时重试后23/23缓存、24次调用，旧结果未改变 buffer/body 身份。明确缺首个录音的 flight cue 被消费，静音/后台事件不补播，fresh cue 创建一件真实录音 source，后台清至零 voices。该案例听感 `heard:false`。
- 初次浏览器通过的 [browser-report-first-pass.json](browser-report-first-pass.json) 另存；最终脚本加强为明确缺首个 clip 的 flight cue，重复两案例后仍通过。未改产品或放宽断言。
- [protection.json](protection.json)：src/game/domain/content/application/platform、public、art、依赖/lock、CI、AGENTS 与唯一计划逐路径同 inputSHA；PR171 文件零交集。最终产品、19项专项与浏览器脚本 SHA256 固定在该报告，[SHA256SUMS](SHA256SUMS) 绑定本批证据。

复核命令：`npm test -- tests/audio-sample-loading.test.ts tests/audio-preferences.test.ts tests/score-recorded-audio.test.ts tests/fire-audio.test.ts tests/failure-audio.test.ts tests/sample-body.test.ts`；`npm run typecheck`；`npm run build`。浏览器先 `npm run dev -- --host 127.0.0.1 --port 4173 --strictPort`，再 `node docs/production/evidence/audio-loader-reliability-2026-10-14/browser-check.mjs`。

## 未验边界

未真人试听，未测物理手机/宿主后台计时节流/GPU/FPS、主观层次与 BGM 遮盖，没有全游戏自然旅程或声效资产听感签收。加载可靠性与声音好听分签；这批保持既有配方、音乐和全部录音字节。最终 HEAD 的标准多浏览器 CI 由 PR 另核，不能从本地系统 Chromium 推称 Firefox/WebKit 已通过。
