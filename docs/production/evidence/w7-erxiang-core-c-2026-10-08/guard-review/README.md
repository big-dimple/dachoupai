# 最终入口保护补正

产品补正 `36822a48755f4c3551321ef28a4b3aa9fab01085`；原产品2e8a562、原文档2da0490的证据不改来源。

原精确head的最终标准CI暴露 `ai-hand-action-cancellation` 一项失败：新核心草稿的默认参数在角色身份判断前读取上下文，导致原有失败后恢复AI用例报 incompatible-version。将读取移到新角色身份且有目标之后；同时纠正 StartRun 所需字段列表，核心字段只允许新二响的 PlayHand。没有调整测试预期、C数值或其它角色。

[原失败](initial-domain-failure.txt)保留。17项定向（原AI取消/失败恢复6＋当前核心11）及typecheck通过。有限[正常入口记录](current-native.json.gz)按补正精确SHA复核同一group-natural-17：指定/取消、PC/390窗口变化、两次AI切、两次排序清选、226首手保存、刷新恢复点数，再换5的1290葫芦过场；零pageerror，没有新增种子或成熟库存。

[PC](target-1366.png)、[390](target-390.png)、[真实过场](second-clear.png)与[哈希](sha256.json)。只是当前软件检查，不是设备/GPU/听感/三线均衡或真人通过。最终标准CI仍按最终文档head另核，不套用原失败head的通过项。

986f275最终CI：domain 165文件/2680检查与build已通过；smoke在正常阿默新局仍断言旧route-starter版本/hash，见[原身份断言失败](initial-browser-identity-failure.txt)。仅把两条正常新局断言改为本候选的精确共享版本/hash，保持取消、保存、行为与三浏览器检查；不放宽为“任意已知版本”或移除断言，不修改玩法/产品源码。新head标准CI另核。

[结束状态保存增量bc6cc51](terminal-save-review.md)只修验证实际phase，新增主动放弃/余次仍有但牌已空的当前保存用例；18项定向/type通过。原正常入口证据保36822a4，不冒称这两条终止命令是浏览器自然尝试。最新head标准CI另核。
