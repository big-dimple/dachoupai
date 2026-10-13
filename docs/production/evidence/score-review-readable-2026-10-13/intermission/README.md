# 结果页最后一手：同一显示formatter的最小接线

本轮输入/旧批次最终SHA `bf3944a26747ab8a1a830e098ae5857fb7f5dded`；父明确把 `IntermissionScene.inspectLastHand` 的文本接线授权给本线程，原结算恢复线程不活动。旧SHA的CI38426584762及production-docs38426585599本轮已核completed/success，不拿旧绿结果代签新接线。

产品源码 `cb8cce35`，观察器修正后局部截图 `4cb5d9dbfac2a6d5f05c9ab6e7d8bf8a32ca32a0`。截图时dirty只有本目录尚未归档的证据，没有src/tests/harness改动，不称整个工作树洁净。后续提交仅归档证据，产品/观察器树等同性见manifest及PR的新精确HEAD。

## 改动

只保留原保存trace guard，调用既有 `formatScoreReview(run, trace)`；以同一summary、真实来源cards、默认关闭的完整精确诊断替换旧长分数明细。原“最后一手 · 已保存的结算”标题和“查看培养路线／前往筹备商店继续培养／关闭”原文、顺序、可用判断与回调均保留；非成功场仍只有关闭。本包不改独立formatter，不扩结果页其它代码。

仅删除该方法不再使用的导入。观察器把整个文件去除该方法及imports后与bf394逐字节比较，结果相同；原按钮三元表达式及两个回调也逐字节相同。其它结果布局、动画、下一场/重试/无尽、保存域、得分域、GameScene、RunMenu、图片声音及唯一主计划均未改。

## 有限核验

[55项定向](score-review-intermission-tests.txt)（formatter、DetailDialog、stageOutcome、resultStage、savedBossImpact）与[typecheck](score-review-intermission-typecheck.txt)通过，运行后源码未再改。首轮观察器误认失败场入口，原报告和图保留在[FAILURES](FAILURES.md)。

`SCORE_INTERMISSION_OUTPUT=/tmp/score-review-intermission-complete node harness/score-review-intermission.mjs`：分别在PC1366×768与手机390×844，以既有PR134谢幕28404分成功保存和合法旧身份25分失败保存，走当前真正的浏览器入口。

- 成功场：原“回看上手”→目标方法；另原“本场详情”→“回看最后一手”。
- 失败场：原“巡演留影”→“回看最后一手”；另原留影→“本场详情”→“回看最后一手”。没改导航、没冒称失败场有成功场继续按钮。
- 四行全部对照bf394源码归档基线：结果页canvas PNG字节完全相同；命名元素与文字的完整位置/大小/visible/alpha完全相同；默认回看按钮文字、disabled、primary与顺序完全相同。
- 默认内容与共享formatter逐字相同，无原始英文事件键/精确倍率长串；精确JSON及公式默认折叠，展开正文逐字相同。展开/默认无横向溢出，正文≥14px、按钮≥44px并在可见底部。
- 四行查看/关闭与第二入口检查前后完整state/journal/storage相等，刷新→正常继续后仍完整相等。旧存档只按现有验证器读取，没迁移或清档。

[完整报告](native/report.json)含实际源行、输入/保存、旧新按钮和场景几何、PNG哈希、冷恢复哈希与相等断言。基线由bf394的src/scripts/index/package/config归档到/tmp，以相同已保护的public及依赖只读链接运行；不是另一套资产或新玩法。

已实际看原尺寸[390成功回看](native/390-clear-current-default.png)、[PC成功回看](native/1366-clear-current-default.png)、[390失败回看](native/390-loss-current-default.png)、[390精确诊断](native/390-clear-current-diagnostic.png)。数字、中文来源/实际次数和两个原继续操作清楚；失败场关闭可达。背景结果画面本身与基线像素相同，未用测试数量签整体美学、设备、动画听感或自然体验。本批没有打一整局、发PlayHand/Next/重试等新游戏命令。

原主README提到的 `IntermissionScene.inspectLastHand` 未接入，是bf394时的历史边界；本轮已完成该点，没有剩余相邻回看入口阻塞。仍只更新Draft PR160，不合main、不部署。
