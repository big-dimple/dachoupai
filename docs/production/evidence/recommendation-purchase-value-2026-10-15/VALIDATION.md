# 五机制推荐价值：实际验证回执

产品提交：`208aebbbb6db3792555aa77d3a4d052dd8aabc7f`。基线合同：`00b1d7285b310e24752ad65d6fb68a3cb1eda6de`。开发分支：`dev/recommendation-cost-lifetime-contract-20261015`。本次恢复只完成证据归档、补拍原未完成的分差可见性和开发分支推送，不重跑已完成测试或双端矩阵。

## 已有检查及源码对应

| 检查 | 原执行结果与证据 | 实际边界 |
| --- | --- | --- |
| 定向单测 | [tests.txt](tests.txt)：19文件／203项通过；[逐文件结果](selected-test-results.json)保留19个文件名与状态 | 推荐、现金、指定出售延续、工具成本与使用预览、四轴投影；不是全库或全套测试 |
| 类型 | [typecheck.txt](typecheck.txt)：`tsc --noEmit`通过 | TypeScript静态检查 |
| 内容 | [content.txt](content.txt)：`verify:content`通过 | 既有内容结构与事件界限检查；不等于重新平衡72牌 |
| 构建 | [build.txt](build.txt)：`npm run build`通过 | 保留既有大chunk提示；没有部署 |
| 计划 | [plan.txt](plan.txt)：32工作包有效 | 结构检查，不签玩法／人类验收 |
| 保护对象 | [protected.json](protected.json)：13对象相等 | domain/content/cards/application/audio/public、四轴／布局／CSS、旧纯评估模型／runner／report／protected均保持 |
| 源码对应 | [source-sha256.json](source-sha256.json)的8项与`browser/report.json`、当前工作树和产品提交一致 | 原生矩阵开始于干净208aebbb，运行前后哈希断言相等；证据整理不改变产品 |

19个测试文件精确列表取自原Vitest结果缓存并归档；本回执不虚构当时未记录的CLI参数。复验可将这些文件名传入`npx vitest run`。恢复过程只读取已有203项日志，没有重新执行。

## 已完成的PC／手机视口原生矩阵

[browser/report.json](browser/report.json)为原始最终PASS报告；[browser-run.txt](browser-run.txt)为原终端回执。完整数据在[browser/full-state-journal-storage.json.gz](browser/full-state-journal-storage.json.gz)，不是只保存摘要或hash。

- PC1366×768、手机视口390×844各11项观察：f06、b03、c04、c06、两种e08现金；成熟c04／经营e01两种指定替换；S03／S04／S07购买与指定使用。
- 各端8笔实际保存指令：一次出售、一次买入、三笔工具购买、三笔工具使用。每步完整state按同一原始领域命令重算相等，journal精确追加，当前存档等同checkpoint；工具使用后刷新恢复相等。
- 查看／取消／选择和预览对完整state、journal、存档无写入。货架与详情星值同函数结果，五个SVG形状与推荐值一致；旧框／徽记和版次显示继续独立。
- 原生点击／手机tap经过实际导入、比较、管理、取消、确认出售、确认购买、工具选目标、手机“查看预览”、确认使用。无force点击，不用DOM伪造保存结果。
- 使用系统Chromium、低动态、受控当前身份导入；不是自然获取或自然连续经营，不是物理手机／真人理解／GPU或听感验收。没有给未测320／其它视口补签。

28张原始截图按报告文件名保存在`browser/`。原`*-replace-condition-scores.png`命名过宽，实际没有拍到条件分差，仅保留为原始观察，不作该行可见的证据。补拍脚本[capture-score-lines.mjs](capture-score-lines.mjs)只重开同一受控比较窗口，以跨数字span的文本Range定位该行，检查完整行落在固定候选下方可视区，截图前后完整state／journal／存档相等。补拍结果另列于`score-lines/`，不冒充重跑完整矩阵。

补拍[报告](score-lines/report.json)两端PASS，[390图](score-lines/390-replacement-score-line.png)与[PC图](score-lines/1366-replacement-score-line.png)均已实际查看：`保留2805→变更2722，分差−83`完整可见，底部动作保留。脚本前3次因对话框把数字分成独立span而错误按单个Text节点定位，观察器失败保留为`score-lines/*-capture-failure.json`；改成跨节点Range后通过，未改产品或DOM内容。

## 失败保留与未决

原旧星预期／售后基线冲突见[first-test-failure.txt](first-test-failure.txt)；补充四轴测试旧成长星预期见[additional-test-failure.txt](additional-test-failure.txt)。原浏览器手机预览页签未打开的观察器失败见[first-browser-failure.txt](first-browser-failure.txt)和[first-browser-report.json](first-browser-report.json)。没有删除FAIL或修改领域来迎合观察器。

本包只能签“原适配星＋五代表机制保守证据上限及真实交易账”。f06正常2星，新b03/c06初值0最多2星，c04即时本体可保3星，e08按真实购后门槛及当前利息档区分；成熟替换同时报同窗口分差和永久／经营损失。其余未校准规则和既有五星不代表已获本轮长期价值证明。

完整寿命与成长机会估计、跨路线五星公平性、S04整副染色的整体数值取舍、自然经营终态和玩家理解仍OPEN。没有自然试玩、全库重审、main合并、部署或重试Forbidden PR。
