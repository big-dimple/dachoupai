# 原型版次例外导入窄修复

父独立审查复现：无版次a03原事件改错目标或+35，本应被七卡校验拒绝；再伪造reasonKey为edition.foil.add-heat，重算checksum即可绕过。这里保留实际失败，不回写七卡原报告。

基线 `73e1de057ca1f9c9a514a7014e5180bc7b6f6f60`；本地复现提交 `66d392efbaf5d20869506b4ba2d42e977691c189` 只有新测试、产品逐字节同基线。before-fix.json为19项中的15失败、4合法对照通过。复现测试代码与最终相同，可将当前tests/amo-assist-edition-save.test.ts放入基线直接运行。

修复源码：GitHub `4ad2005e84017020d41b80243e0cca16f3d79169`，完整tree `8bb2192da8c4731ba2c05c19c0c92987dfc42794` 等于冻结本地 `3b3f87accac61083ea49035f443ade36c2210e36`。产品只改checkpoint.ts：reason前缀仅表示待验证声明，例外必须匹配保存实例实际edition和现有R2_TOOL_CATALOG版次合同；合法整手Joker阶段、always条件、无目标/资源元数据、深度0、独立事件根、准确操作/值/热度倍率增量、唯一且完整触发、在自身整手hook之后。原停用来源检查继续生效。

after-fix.json：19/19通过，包括无版次伪前缀、错误目标/值、真实foil的错阶段/效果/条件/深度/根/元数据、重复/遗漏/顺序，以及真实foil/holographic/polychrome在本体命中与未命中时的合法对照、扑克牌版次独立对照和实际v10/v11原fixture完整重放。相关312tests/8files、typecheck和plan通过，frozen-checks.json记录源码/index/HEAD不变。

新原型hash仍 `json-fnv-v1:843f02356211cb91`。domain/content/game/platform与旧fixtures逐树同73e，七卡数值、resolver/copy接口和B的UI文件未改。未增加本地全池矩阵、原生UI、录屏、FPS或策略模拟。通过现有授权GitHub connector正常传输，当前修复精确review CI另报；main仍待父串行放行。
