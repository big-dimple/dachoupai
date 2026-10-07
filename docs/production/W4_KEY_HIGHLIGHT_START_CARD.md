# W4 关键发动样板启动卡

2026-10-07；基线 main d141f81e280a18371d70aecd465bbd925bb84bed。串行 6.1 Medium；仅候选交付，不预记真人、设备、听感或 W4/W6 验收。

范围：U07/U08/U10/U11、SG10 的受控 P2。消费成功保存的真实事件，每手至多一次关键大丑牌卡面特写；普通来源保留短反馈；成长明确结算后保存、下手读取；胜利页承接本手真实来源。复用现有卡面和音效，保留快速、低动态、跳过和中断合同。领域计分、奖励、规则、身份、存档与 W0–W9 依赖及 plan.json 状态保持。

允许文件：src/game/JokerKeyHighlight.ts、src/game/JokerKeyHighlightView.ts、src/game/GameScene.ts、src/game/IntermissionScene.ts；tests/joker-key-highlight.test.ts；harness/w4-key-highlight.mjs 和其明确受控 fixture；本启动卡、JOKER_TRIGGER_HIGHLIGHT.md、DELIVERY_PLAN.md 与本批 evidence/w4-key-highlight-2026-10-07/。其余变更需先说明具体必要性。

验证：编辑中定向检查，固定真实 trace 与正常规则有界路线分开注明；PC 1280/1366/1920 与手机 390/320/740 短横，检查实际卡面、数字、来源与控制区域，跳过/快速/低动态/后台/重复输入/缩放后保存结果一致。一次最终必要聚合与精确 draft PR CI；父任务独立审查并协调 main。截图和测试不能替代用户实机通过，不长录屏，不做软件 GPU 帧率签收。
