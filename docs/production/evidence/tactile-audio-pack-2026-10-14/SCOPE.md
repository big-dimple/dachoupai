# 声音体验整包开工卡

- requirementId：U07/U08/U10/U11，原 W4/W6 声音体验，最新用户要求大批量完整体验，自主取舍。
- inputSHA：f651a04e（本地完整SHA由报告记录），分支 dev/tactile-audio-pack-20261014。PR172已合429bb21d，保三worker/5秒/三次有限加载、预加载去重与迟到保护。
- dependencies：既有实际保存的音频消费点、22 Kenney CC0录音＋既有cloth2、Inkwave已有MIT节流/分层适配。已读根AGENTS、DELIVERY_PLAN当前统一排程/逐任务执行/W4合同、来源manifest与许可。未提供额外.agents技能文件。
- owner：本执行线程，串行；独立验收者：父线程审查PR与实际试听。软件证据不签真人/物理设备/主观听感。
- allowedFiles：src/audio/AudioEngine.ts、src/audio/foley.ts、src/audio/mixPolicy.ts（新增）、tests/audio-mix-policy.test.ts（新增）、tests/score-recorded-audio.test.ts、tests/fire-audio.test.ts；本目录SCOPE.md、README.md、audition.html、audition.ts、render-and-check.mjs、browser-check.mjs、sources-audit.mjs、sources-audit.json、before-engine.ts、before-foley.ts、before.webm、after.webm、before.wav、after.wav、audio-metrics.json、browser-report.json、render-report.json、targeted-tests.txt、typecheck.txt、build.txt、first-tests-FAIL.txt、first-policy-test-FAIL.txt、first-render-FAIL.json、first-browser-FAIL.json、second-browser-FAIL.json、files.txt、protection.json、SHA256SUMS、ci-status.json、pr-receipt.json。需要新增证据先补列。
- nonGoals：结算/商店/其它场景UI、domain/application/content/platform、规则/数值/价格/存档、用户音量/默认30/80、新BGM、依赖/CI/AGENTS/唯一总计划、部署/合main。无购买、收费API或不明权利下载；不把参考代码MIT推及其素材。
- outputs：全语义配方统一纸牌/木质/筹码层次，按真实最终单手分数选择百万/亿/万亿节奏，跨事件优先级与同时声部预算、强音让出弱尾、动态范围/duck；可重复试听/前后真实WebAudio录音、事件映射、移动viewport触控解锁/弱网/缺音/后台验证；正常commit/push/ready PR供审，主线由父处理。
- acceptance：轻触短、交易确认明确、普通结算不堆音、连锁节奏递进、大分差异靠节奏/音色而非加响；静音/设置/解锁/后台/重入/缺录音不补播，PR172加载保持；记录软件实际通过范围与未听项目。
- stopConditions：声音无限累积、规则状态/用户偏好变化、要求把测试数冒充听感、来源不明、越过UI写入窗口。被拒写入停该行动，继续独立工作并保留原因。
- 回退：本分支未合main，可整包撤回音路两个文件与新增策略；原始OGG/BGM字节保持基线。
