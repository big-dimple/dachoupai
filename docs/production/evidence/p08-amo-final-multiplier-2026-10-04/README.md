# 阿默单张终乘首批（review候选）

基线1eb6689000142781daa96d9033319b333bd4a362。只新规则阿默单张×3排在整手Joker/版次后、finalScore前；v10历史局保原时序。新hash明确包含政策；仅识别完整v10/v11身份对，未知/混搭拒绝。新建/导入读自身分区，模式继续优先活跃同模式，再查新旧两个已知分区，损坏current只用同profile备份。

`tests/fixtures/r2-v10-amo-checkpoints.json`于修改前从d1c072d真实生成并冻结：合法手牌/库存fixture，实际旧PlayHand，非自然购入。旧325/new525及225/375/675边界，持牌/版次/B08/Q01/B13/随机游标/多张/其他角色由对应测试覆盖；真实保存失败重试与duplicate没有再apply。两代身份沿普通过关/商店/ContinueEndless保留；旧trace/receipt/source/clear身份不迁移。

browser.json保留当时build身份和modified状态，不冒称main部署。390×740 CSS、DPR1、安全区0、Chromium软件Canvas；原生DOM导入/点牌/出牌、实际演出事件次序、旧回看credited/快进无重奖、刷新继续、再导入已提交局全state/journal/export不变。没有截图、录屏或FPS测量。OnePlus/真GPU/听感NOT_RUN；美术保持，六人平衡与自然策略胜率未验。

实现/技术验收最终状态及冻结身份见summary.json/freeze.json，精确review CI另报，父未放行不得main。六人后续缺口归同一WORK_PACKAGES.P08，不扩图鉴/教程/联网。

## 独立审查补证（2026-10-04/05 UTC）

原 fixture 的生成脚本 `.ts` 与 bundle `.mjs` 保留，脚本逐字节归档为 `original-legacy-fixture.ts.txt`，两者 SHA 在 `old-oracle-proof.json`。原 shell 调用及生成 stdout 日志没有保留，不能补造过去日志。旧隔离目录的117个生产源码逐字节匹配公开 d1c072d，逐文件 SHA 见 `old-source-files.json`。本次仅只读 oracle：读取既有冻结 before 与原 command，旧 applyCommand/makeCheckpoint 结果完整深度等于原 after；没有重新生成或改写 fixture。

原 `browser.json` 保留1eb dirty身份，缺当次源码树hash，因此不能独立绑定ad2，不修改该历史报告。本次另在精确 ad2eddff 的干净 detached 工作树运行一次既有有界 native harness；`browser-clean-ad2.json` 嵌入 revision=ad2eddff、sourceStatus=clean、modified=false，旧325/新525及已有回看/继续/导入路径全PASS。前后clean、源码git tree与输出JS SHA见 `clean-ad2-build-proof.json`。此次是现在的确定身份复验，不冒称旧运行日志；无全套2203重跑、截图、录屏或矩阵扩张。
