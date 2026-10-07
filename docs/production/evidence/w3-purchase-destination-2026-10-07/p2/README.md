# PR37 P2：按提交后真实持有清理购物记录

2026-10-07。输入PR37 head `616b0b4ae05ad7ab6f9c1c17434b950bddae7fa7`；父独审发现S07牺牲新购牌时，action.instanceId为工具ID，原清理判断漏掉真正删除的牌，留下失效“查看新牌”入口。

产品修复 `0d627466a4be93b015adf3f3cd570fa22bcfaa04`：成功持久提交、非duplicate结果后，根据receipt.kind检查真实最新state中的大丑牌实例、工具实例或长期道具是否仍存在。不存在才清理。取消/失败不执行该判断，不提前清；其他仍存在所得保留。只改视图判断、相关单测及既有有界harness，领域、数值、存档/RNG、布局和素材不改。

## 定向结果

`report.json`是clean 0d62746构建、系统Chromium151/DPR1/原生鼠标输入、减少动态的五例：

1. 1366×768：实际购入新b10；S07选择它牺牲、已有b03受益。取消保持完整state与购物记录；确认成功只commandSeq+1，新b10删除、S07消耗、受益者多彩，金币/RNG保持，购物记录清除，按钮恢复构筑详情。
2. 390×740：新b10为受益者、旧c11牺牲，新购实例仍存在，购物记录及查看新牌入口保留可用。
3. 390×740：最新所得是T06，S07牺牲已有c11、b03受益；新工具仍在库存，记录及工具包入口保留可用。
4. 390×740：最新所得是U11，S07牺牲已有c11、b03受益；长期道具仍持有，记录及物品入口保留可用。
5. 390×740：牺牲新b10时注入IndexedDB quota失败，完整state及购物记录保持；恢复存储后点重试保存，只提交一次，删除后记录清除。

各例确认前均原生选择后取消并复核完整state和原记录；成功检查真实领域删除/版次、机会序号与金币/RNG。受控fixture沿用本批输入，只把已有工具改为S07并通过既有makeCheckpoint验证封套，非自然获取路线。

`purchase-regression.json`：同一clean修复源码再查原三类购买18例（PC1280×720/1366×768/1920×1080，手机320×740/390×740/740×390及bottom34），取消、工具使用、保存失败及入口/安全触点保持。未改GameScene/ShopLayout/CSS，原九牌与811/812等布局证据继续保留原SHA，不重跑不受影响的大矩阵。

定向31 tests/3 files及typecheck通过；最终2463 tests/136 files、typecheck/build/content/production-plan通过。见本目录日志。复查：`W3_RECEIPT_SACRIFICE=1 node harness/w3-purchase-destination.mjs`，普通回归：`node harness/w3-purchase-destination.mjs`。

[删除新购牌后构筑入口恢复](removed-new-card.png)是有限软件截图，不是用户PC、审美或FPS验收，无长录屏。

## CI与待复核

旧616b0b4已核：[CI37612348543](https://github.com/big-dimple/dachoupai/actions/runs/37612348543)全部成功；[browser job112762380495](https://github.com/big-dimple/dachoupai/actions/runs/37612348543/job/112762380495)及全部步骤成功，未卡住。旧production-docs37612348499也成功；原始状态摘录见old-head-ci.json。后续只按推送后的新head CI报告，不用旧绿替代。

本P2待父复核、新headCI和原真机共同验收，不合main、不扩大玩法，不宣布完整W3完成。
