# 结算布局与性能修复：本地复核通过

本次接续独立分支 `fix/settlement-layout-performance-20261016`，基于 `5a54a908`；精确构建源码见 `status.json.followup.sourceHashes`，最终提交号见交付回执。仅追加字号适配、必要回归测试和本证据；保留既有 HUD 分行、结算收起次要控件、结束恢复控制与逐帧字体缓存。没有改动机制、数值、原图、存档或首页/加载实现；未合 main、未查询 CI 或域名。P08 保持 in_progress。

根因是初版有界二分字号搜索：PC 190px 数字只差几像素即可容纳，却生成了 101、145、167…多个中间字号，每次触发同步字体测量及位图重绘。现根据当前真实文字边界估算比例，最多两次舍入校正，并保留最小字号兜底。追踪样本首次高光创建 80.8 → 33.8ms，文字更新 33 → 19 次；追踪与截屏不混入下面纯计时。

Windows Node22 / Chromium153 / Phaser 原生 Canvas，同一受控 checkpoint 经正式菜单导入，再以实际 PlayHand 得到 6,876,748 分。每组均使用新 browser context，1366×900、首个来源 f10 且 detailReady=true，关闭截图和字体明细追踪。

| 成对运行 | 对照首次创建 ms | 优化首次创建 ms | 整段文字重绘 | 优化长任务数 |
| --- | --- | --- | --- | --- |
| 1 | 31.2 | 27.8 | 16392 → 746 | 0 |
| 2 | 47.0 | 27.5 | 16651 → 746 | 0 |
| 3 | 31.1 | 29.1 | 17015 → 746 | 0 |

对照第二组本身出现 72/50ms 长任务，主机活动未完全隔离；保留所有原始帧/长任务，不据此宣称物理设备或全平台无卡顿。三组优化均未记录到 ≥50ms 长任务，原可复现的 PC 首次创建回归在本地检查中已消除。

104 项定向单测、typecheck、标准生产构建通过。更新构建在 320/390/1366 的自然 4509 分、自然 30 分回到选牌、受控 6,876,748 分共九例通过：数值 trace 与 domain 回放逐项一致；结算全过程 state、journal、存储与 localStorage 稳定；次要控件收起、HUD 容纳、结束恢复通过；每例在原出牌位置再点两次，未重复提交。另三例在结算期间刷新，通过正式继续入口恢复完全相同的已提交状态、journal 与存储，不复活演出。

`320/390/1366-optimized-hud.png` 是可还原的 UI Text 长字段探针（116,366 / 12,000，非改状态）；`*-optimized-landing.png` 是实际高光累计倍率落位；`*-cold-restored.png` 是结算中刷新后的正式继续结果。`followup-browser-reports.json.gz` 保存全部新报告及字体明细，旧报告与原始失败保留。未拿到用户原始高分档，受控 fixture 不冒充自然获得或真实用户存档。

复现沿用 `harness/settlement-performance.mjs`：e2e 构建后设置 `SETTLEMENT_BUILD_DIR`、`SETTLEMENT_EXPECT_FIXED=1`；`SETTLEMENT_SCENARIO=checkpoint|natural|partial`，`SETTLEMENT_WIDTH=1366` 可限单尺寸；纯计时 `SETTLEMENT_CAPTURE=0`，字体诊断 `SETTLEMENT_TRACE_MOUNTS=1`，重复点击 `SETTLEMENT_INTERACTIONS=1`，结算中冷恢复 `SETTLEMENT_COLD_DURING=1`。

低分返回牌桌的诊断边界仍保留：初版 `partial-after` 已有 PC54ms 长任务，本次功能批次出现 PC65ms、390宽53ms，均靠近结束恢复边界；随后纯 PC 复查无长任务、最大演出帧19ms，三档实际点击新手牌后出牌按钮正常启用。零星恢复边界长任务尚未归因，不把本次高分创建修复写成所有结算无卡顿。原始记录见新旧压缩报告及 `status.json.followup.returnTailDiagnostics`。

## 初版回执与原始回归证据（保留历史）

产品提交：`331db92d07338edf921a97d277f7f34693f9a190`；src tree：`95215c5f6518d8bd881d775ddb160d69804198a7`；基线：`fa5b30ee1ebf28d4ee71d676b231eab260172033`。本批仅开发分支，main 由父线程统一处理。P08 仍为 in_progress。

手机顶部原来把技能与目标数值放在同一行，六位数换行后压到五张功能牌。现在姓名与技能各用独立实测宽度，金币和当前/目标分数用下一行；数值保持单行。结算期间暂收排序、出牌/弃牌、资源计数、重复状态与技能字段，来源、高光、累计倍率/得分保留；正常完成和快进共用原完成路径恢复。

定位到 `fitScoreLine` 每次动效都从大字号逐1px缩小，同一个不变文本反复同步光栅化。修复复用未变的位图，变更内容/区域/字体时失效；初次字号搜索改为有界二分。没有修改数值、规则、存档、资源文件或原图。

## 纯计时结果与明确余项

Windows Node22 / Chromium153 / Phaser Canvas。以下测量不复制画面、不编码截图，直接记录真实高光创建函数和 Text.updateText。相同受控当前身份存档经原生产菜单导入，再真实出牌，实际6,876,748分，目标40,950。现有fixture控制库存、成长和牌面，**不是自然获取，也不是用户缺失的原存档**。

| 宽度 | 首次高光创建 前→后 | 文字重绘 前→后 | 最大帧间隔 前→后 |
| --- | --- | --- | --- |
| 390 | 153.4 → 37.0 ms | 6987 → 781 | 168.9 → 45.9 ms |
| 320 | 202.3 → 33.3 ms | 14664 → 993 | 218.2 → 40.6 ms |
| 1366 | 30.2 → 66.0 ms | 17077 → 871 | 45.9 → 84.0 ms |

390/320 的纯计时后测均无>50ms长任务。PC 后测仍有81ms长任务，因此没有“全平台无卡顿”的结论。按父线程要求只复用前后构建再做一次PC对照：首次创建30.9→58.9ms，后版70ms长任务仍在，原版无。第一来源同为f10，615×768 detailReady=true，人物/焦点/来源图就绪清单相同，均新浏览器context。**本机PC首次高光回归可复现，必须继续作为未解决项，不能把功能通过写成性能验收。** 全机其他活动未完全隔离，绝对时间不能推广到真机；这也不能抹去重复对照的风险。

## 已通过的保护

- 103项定向单测、typecheck、标准生产构建通过；原有大bundle提示保留。
- PC1366、390、320各验证正常4509分、受控大数6,876,748分、自然30分未过关恢复操作，共9例通过。
- 大数每一计分事件的phase/operation/value/before/after/source与原domain重放相等；动效全程state（含RNG）、journal、存储和localStorage稳定。隐藏次要操作贯穿结算；结束先恢复，再回到选牌或原过关流程。
- 六位数重叠复现是可还原的UI Text探针，未更改target/state/save；`320-before-hud.png` / `320-after-hud.png`保留前后像素。大数高光图另见`390-real-climax.png`。
- domain/application/content/audio/platform/public/art对fa5b无差异；lihui未触碰。

## 证据和重跑

`status.json`固定SHA、来源哈希、纯计时和PC余项；`browser-reports.json.gz`保留全部原始浏览器报告与真实存档/事件。`preserved-diagnostic-failures.json.gz`保留首次漏e2e构建标记、旧5589分假设、误用旧菜单名造成的诊断失败，以及回归测试发现缓存未写入、TypeScript union初次错误；这些均已修正，未覆盖旧失败。

浏览器脚本：`harness/settlement-performance.mjs`。先构建`node node_modules/vite/bin/vite.js build --mode e2e --outDir shots/settlement/build`；设置`SETTLEMENT_SCENARIO=checkpoint`、`SETTLEMENT_CAPTURE=0`、`SETTLEMENT_EXPECT_FIXED=1`后运行脚本。`SETTLEMENT_WIDTH=1366`限制单屏，`SETTLEMENT_BUILD_DIR`切换已存在的前后构建。默认natural为正常购买前开局出牌，partial为30分后返回选牌。脚本使用Playwright自带Chromium。

原构建重建前，三个修改文件已逐字节备份并验证读取，重建后逐字节恢复；本地`shots/settlement/source-snapshot`保留备份。第一批带画面复制的诊断报告保留，最终性能结论使用无画面复制的pure-before/pure-after及有界PC复测。未查询远端CI，没有强推或清理原图。
