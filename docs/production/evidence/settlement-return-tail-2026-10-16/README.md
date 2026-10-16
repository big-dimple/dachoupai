# 低分结算返回牌桌：共有恢复开销，新增回归未确认

基于已交整合的 `8bf977e1`，在独立分支 `investigate/settlement-return-tail-20261016` 完成同机成对采样。**没有修改产品代码或原图，也没有把共有的旧开销当作本轮回归修复。** 本次仅补充 harness 采样与诊断证据；P08 保持 in_progress。

原采样在首个没有 presentation 的 postrender 中置 done，同时停止收集 Long Tasks；浏览器异步送达的最后任务会被丢弃，恢复重建帧也没有进入演出 frames。新诊断开关从 completePresentation 入口记录方法耗时，并延续到结束后400ms，包含完整任务送达。旧字段保留以便与历史对照，新字段 returnLongtasks / returnFrames 才覆盖恢复边界。

## 相同操作与结果

Windows Node22.20、Chromium153.0.8010.12、原生 Phaser Canvas、DPR1，无 CPU 限速。每次独立浏览器/context，固定种子 d43-fire-267，正式界面选择技术ID laohuan、group 路线，进首关只选 diamonds-11，真实出牌30分，目标400，返回 await-input。无 fixture 导入、无改状态。奇数组先基线后候选，偶数组反序；1366×900与390×740各六组、320×568三组，共30次。

| 宽 | 构建 | 次数 | 恢复函数中位数 ms（范围） | 其中 render 中位数 ms | 恢复帧间隔中位数 ms | 有恢复长任务 | 旧采样漏记次数 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1366 | baseline | 6 | 44.0 (42.3–47.7) | 43.3 | 66.9 | 6/6 | 5 |
| 1366 | optimized | 6 | 44.0 (41.9–44.7) | 43.3 | 65.0 | 6/6 | 2 |
| 390 | baseline | 6 | 42.1 (40.0–61.5) | 41.5 | 57.4 | 4/6 | 2 |
| 390 | optimized | 6 | 42.9 (41.6–77.6) | 42.3 | 59.9 | 6/6 | 2 |
| 320 | baseline | 3 | 37.3 (36.7–38.5) | 36.6 | 50.5 | 0/3 | 0 |
| 320 | optimized | 3 | 37.6 (37.4–37.6) | 36.9 | 50.2 | 0/3 | 0 |

PC 六组两版恢复函数中位数均44.05ms，render 中位数43.30/43.25ms，约占同步恢复函数98%。恢复长任务在两版均6/6出现；它是真实的共有恢复开销，原53/65ms记录不能据此归为本轮新增回归。共有路径为 completePresentation → render → SceneView.clear（销毁根节点子对象）后重建牌桌；整次浏览器任务还包括同一帧绘制，不能将任务总耗时全部归给 render。

390宽两版都出现慢样本；候选中位数稍高、最大值也更高，完整范围保留。主机其他活动未隔离，这些样本不能排除小幅布局开销，也不能把全部差异断言成噪声。320宽两版相近，无≥50ms任务，但约50ms帧间隔并不代表60fps。首个未配对诊断记录89ms恢复/117ms任务，单独保留在压缩报告，未混入预定成对统计。

30例页面无异常，演出 state/journal/存储/localStorage 稳定；15组成对的完整 final trace（含RNG）、阶段、目标与命令序号逐项相同。基线三份构建源码哈希逐一匹配 git show fa5b30ee 原字节；候选逐一匹配8bf977的当前源码。两份旧构建元数据都标 dirty，精确身份以 status.json.builds.sourceHashes 为准，未冒充干净构建。产品 src/public/art/lihui 相对8bf977无改动。

## 结论与复现

本地未确认新增 PC 恢复回归，确认两版共有重建开销与旧采样遗漏。没有进行推测性节点复用或拆帧改造；若将来专项优化共有重建，应另验输入、控件恢复、冷恢复与保存合同。当前采样不是物理设备或全平台无卡顿验收，也不覆盖用户原高分档。全部30次原始报告、慢样本和首次诊断见 browser-reports.json.gz；逐例指标、源码哈希及构建元数据见 status.json。

沿用既有 `harness/settlement-performance.mjs`，以e2e构建运行。原工作树保留两份冻结产物 `shots/settlement/build-baseline-timing` 与 `shots/settlement/build-optimized`；新环境需分别从fa5b30ee和8bf977构建，不能假设 git revision 等于脏树内容。单次 PowerShell 示例：

```powershell
$env:SETTLEMENT_SCENARIO='partial'
$env:SETTLEMENT_WIDTH='1366'
$env:SETTLEMENT_CAPTURE='0'
$env:SETTLEMENT_TRACE_RETURN='1'
$env:SETTLEMENT_BUILD_DIR='shots/settlement/build-optimized'
$env:SETTLEMENT_DIR='shots/settlement/return-tail/repro'
$env:SETTLEMENT_EXPECT_FIXED='1'
node harness/settlement-performance.mjs
```

切换基线产物时 EXPECT_FIXED=0；换宽390或320保持其余条件。诊断模式会有相同的函数包装开销，绝对时间只代表本机，须成对判断。未查询CI、域名或部署，也未合main。
