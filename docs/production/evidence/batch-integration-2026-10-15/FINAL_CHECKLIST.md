# 全部head齐后的同版验证入口（尚未执行/非当前验收）

前置：父给定PR186精确修订SHA后正常merge，确认四个指定成果均为HEAD祖先，检查冲突/保护树/唯一计划；提交必要修复与观察器。记录冻结HEAD、src tree、index，后续运行中不得改产品/harness；失败保留并修复后换新冻结提交，不拼接不同源码的PASS。

1. `npm run verify:ci -- --scope=all`（本机`SMOKE_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium SMOKE_BROWSERS=chromium`，三引擎在远端CI核），记录完整输出和shots/ci报告；包含全量单元、content、typecheck/build、compiled smoke、唯一计划。
2. `npm exec vite build -- --mode e2e --outDir shots/shop-integration-build`，冻结编译信息。
3. `INTEGRATION_OUT=/tmp/shop-integration-final/continuation node harness/shop-integration-continuation.mjs`：同一编译版六英雄正常首局，分配三路线/PC390320，各只读三方向后仅开一局，原生购买故障重试/培养互转/首手/冷恢复，非18长局。
4. `JOURNEY_OUTPUT=/tmp/shop-integration-final/four-axis node harness/shop-four-axis-journey.mjs`：PC/390/320/390短屏货架、四轴、五持牌、出售与购买、存用/取消、quota固定候选重试、冷恢复。脚本动态SSR仅用于权威比对/读取及故障封装，不改冻结文件。
5. `BUILD_PRACTICE_OUTPUT=/tmp/shop-integration-final/practice node harness/build-journey-practice.mjs`：同源三路线四视窗，12条培养取舍与真实PracticeHand/返回/额度/刷新链。
6. `FAILURE_QA_OUT=/tmp/shop-integration-final/failure node harness/failure-retry-guidance.mjs`；另`FAILURE_QA_SCROLL_ONLY=1 FAILURE_QA_OUT=/tmp/shop-integration-final/failure-reading node harness/failure-retry-guidance.mjs`：终态建议、view/cancel、重试故障与换角、短屏每行真实滚动/标题父容器。
7. `B05_OUTPUT=/tmp/shop-integration-final/b05 node harness/b05-opponent.mjs` 与 `RESIZE_OUTPUT=/tmp/shop-integration-final/resize node harness/shop-comparison-resize.mjs`：组合加载下B05真实来源/保存、父容器/短屏和比较窗口实时缩放。
8. 每族记录实际同HEAD/source tree，完整run/RNG/journal/checkpoint/IDB对比；选择并实看PC390320整屏/正文底部/存储重试/冷恢复，裁切判定包括真正父容器，不按图名/OCR签全文。
9. 检查src/content/domain/application/audio/public/art与应保持的来源对象、全部输入祖先、HEAD/index无漂移；证据与说明独立提交后push此fix开发分支，只核新精确CI。不创建PR、合main或部署。

以上为执行清单而非已完成记录。最终报告必须区分工程、软件检查、有限原生截图/操作与仍OPEN的素材高光美术/真人/设备/听感/自然三路线整体经营/全部游戏交付。
