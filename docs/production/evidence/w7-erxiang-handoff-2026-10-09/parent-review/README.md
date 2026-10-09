# 父审跳场保存阻塞补正

输入 `9a44fabd3f58b9ee148161411ed7d163b581263b`，2026-10-09；该head的CI成功没有覆盖本次真实阻塞，不足以合并。

新增一项真实SavedRun事务检查：成功交棒过关→OpenShop→SkipStage→严格读取当前保存→恢复完整状态及journal→重复Skip不再保存或奖励；跳场后的错误used标记仍拒绝。修复前该检查实际报invalid-save-erxiang-journal-state，保留regression-before-FAIL.log。原因是领域SkipStage创建新stage并将erxiangHandoffUsed设false，但journal只在EnterStage重置。

修复只把交棒journal重置对齐EnterStage/SkipStage；不改领域规则、身份、UI或放宽篡改验证。修复后交棒文件13项通过（包括原12项），typecheck与计划检查通过。原普通88 UI及8张图仍仅对应4014173，不重跑、不升级为新head或真人设备验收。精确修复提交由git及PR82提供，最终该head一次PR CI另核，父协调main。

同时将原误放W0下的合同原文移至W7执行段，新增唯一“二响交棒锁定实施合同”标题，更新证据/CHARACTER_PLAY_PLAN入口；没有重排全计划、改变W6依赖或历史状态。
