# 结算布局与文字重绘：手机修复已验证，PC 性能回归未解决

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
