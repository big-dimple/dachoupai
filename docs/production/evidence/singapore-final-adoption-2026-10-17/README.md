# 新加坡最终来源采用回执（2026-10-17）

基线 `e9a8036d0cba3513ef39bc78db1be81bfb142f94`；实际来源尖端 `fbb614a84087060c99e8973c118a473771448984`。此前报告的另一条 fbb614a8 完整 SHA 不存在，已按普通 fetch 得到的真实提交核正。15 项逐条采用/部分采用/排程/保留历史记录纳入[当前统一执行计划](../../DELIVERY_PLAN.md#新加坡最终来源逐项采用2026-10-17)，不另建研发清单。

本批仅将稳定 SpringMotion、实际 owned-card tiltLayer/baseArt 分层、缺少整个录音家族时的受控合成回退、复合 voice 统一释放、现有撞分时钟 40–60ms 短停接入当前运行时。现有有理数精确显示、有序 trace/phrase/队列、六英雄真实目标附着、原命中/拖拽、采样/总线/静音/预算/取消继续由主线实现负责；GameScene 仅新增既有 mountOwnedJokerIdle 的 canTilt 回调。低通/嵌套、常驻牌桌/镜头、材质强化及其听感/美术/设备验收按统一计划保持开放。

来源七份 OGG 与基线 public 同 blob；两首 BGM 的来源原始 blob 分别为 `1560f55391d19acf55e815dd3e02168dfead0589`、`3733a8087d7d209decb559e664a529fd95c5e9ab`，与基线 art/sources/audio-gamefeel-rfc-20261017 中的原始素材一致。当前 public BGM 已是主线采用版本，本批不重复复制或覆盖，全部 public/art 资源字节保持。

验证仅新增三项定向回归，原始[运行日志](targeted.txt)为 1 文件 / 3 项通过：复合声音自然结束与取消、录音优先不叠播；真实保存 trace 顺序及 1.5/超安全整数有理数；多层姿态零有效 delta、取消/重放/低动态/销毁。执行时 HEAD 为基线加未提交工作区；[status.json](status.json)逐文件 SHA-256 绑定最终提交源码，单独 typecheck 已通过。来源旧证据保留其原版范围，不将原型断言当作本次运行时或体验验收。最终生产构建及来源历史/发布/分支清理实绩见下文和同一 status.json。

本批将选取的产品先提交，再以保留当前树的 merge 记录来源祖先；核对产品树完全相同且来源提交可从发布 main 到达。原型 src/gamefeel、ScoringRhythmOrchestrator、HitStopPresentationTimeline、PentatonicSynth、AudioFilterTransition、DOM CardTiltEffect 与测试床不复制到发布树。已于发布核实后删除 feat/gamefeel-audio-elevation-rfc 的远端分支，并确认同名本地引用不存在；不删除资源、其他分支或原始提交历史。

P08 仍为 in_progress；计分爽感、商店联动、Boss 压制仍体验未达标／重新整改。本回执不签听感、美术、真人理解、自然长局、真机或 V01/L01 正式门，不查 CI/域名、不部署。

最终产品 `08ed04633ca0b30b5275c9aabc787542a415ac16`，来源历史合并 `cd85ac5bf1acb6a35fb16ac40b89ab65db682099`；后者完整树与产品树相同，来源 fbb 为祖先。最终运行时范围仅 status.json 的六条白名单，public/art、领域/核心规则和六英雄附着/c12/phrase/queue 保护区均无差异。生产构建在 cd85ac5b 执行，[完整日志](build.txt)：类型检查及 358 模块构建通过；dist 397 文件 / 37160409B，20,000,000B 总预算仍 FAIL，不将它写成通过。

普通发布 `02ce7700fed218ef2405e230cdb381d82a5aa5dd` 后，ls-remote 核实 main/eyes/adoption 三头一致，且 fbb 为该 main 祖先；再普通 push --delete 唯一授权分支，exit 0 且服务端回执 deleted，复核远端分支为空、同名 local head/remote-tracking 均不存在。[原始清理回执](branch-cleanup.json)。此后仅补本记录；本次没有删除资源/其他分支，没有强推或部署。
