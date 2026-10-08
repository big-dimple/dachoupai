# 最终入口保护补正

产品补正 `36822a48755f4c3551321ef28a4b3aa9fab01085`；原产品2e8a562、原文档2da0490的证据不改来源。

原精确head的最终标准CI暴露 `ai-hand-action-cancellation` 一项失败：新核心草稿的默认参数在角色身份判断前读取上下文，导致原有失败后恢复AI用例报 incompatible-version。将读取移到新角色身份且有目标之后；同时纠正 StartRun 所需字段列表，核心字段只允许新二响的 PlayHand。没有调整测试预期、C数值或其它角色。

[原失败](initial-domain-failure.txt)保留。17项定向（原AI取消/失败恢复6＋当前核心11）及typecheck通过。有限[正常入口记录](current-native.json.gz)按补正精确SHA复核同一group-natural-17：指定/取消、PC/390窗口变化、两次AI切、两次排序清选、226首手保存、刷新恢复点数，再换5的1290葫芦过场；零pageerror，没有新增种子或成熟库存。

[PC](target-1366.png)、[390](target-390.png)、[真实过场](second-clear.png)与[哈希](sha256.json)。只是当前软件检查，不是设备/GPU/听感/三线均衡或真人通过。最终标准CI仍按最终文档head另核，不套用原失败head的通过项。
