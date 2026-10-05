# 跨后续普通手的副组持续消费修复

独立审查指出 `cfc8169a970fcb7213621c936bf6366e8105818d` 只验证最后 trace 的副组牌区。已在该源码复现：[before-fix.json](before-fix.json)。合法助攻后再普通出牌，保留真实 journal/receipts，将 `spades-12` 从 playedPile 挪回 drawPile 尾并重算 checksum，原解析接受，下一合法普通手实际抽回该副牌。这个 FAIL 是本轮保存漏洞，不能由此前 CI PASS 覆盖。

最小修复：在已有 journal 扫描中累计已提交助攻的实例 ID，与最后 trace 的副组共同验证：必须仍在 playedPile 或 destroyedIds。真正 EnterStage 会重建牌区，因此清空累计集合；普通手/商店不清空。SkipStage 只重置新跳场记录的资格字段，没有洗牌或清已用区，因而不恢复这些实例；直到后续 EnterStage 才解除约束。无 journal 证据时不推造历史、不恢复 assistUsed，继续使用严格保存的原字段及能证实的最后 trace。

测试 `tests/amo-assist-consumption-save.test.ts` 共 11 项：

- 助攻→普通手后回 drawPile / handOrder / discardPile 全部拒绝；合法状态原样读回且不会抽回副组。
- 店内 T02 销毁进入 destroyedIds、T08 改点、T03 染色、T07 复制新实例均合法，不误判旧 trace 与当前牌属性不同。
- 过关→商店→准备进场不恢复已用牌，真正 EnterStage 重建牌区后允许重新流通。
- 合法跳场保留已用区，随后真实进场允许重建；未知/截断 journal 不恢复本场助攻资格。

修复前窄专项 **4 FAIL / 7 PASS**；修复后 11 专项及其他关联旧身份/保存测试合计 **102 tests / 4 files PASS**，typecheck PASS。原日志 SHA256 和计数见 [checks.json](checks.json)。原大矩阵证据保持自身 cfc/0d3b 来源，不复用为这次修复的全矩阵结果。正常 review PR CI 对新 head 另核；不 main、不混后续七张卡适配、不改 sharedRuntimeHash。
