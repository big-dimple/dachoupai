# 商店与卡牌完整链路开工卡

- requirementId: W3/W5-shop-card-journey
- inputSHA: `f651a04ef5eb68c29a413acf8b4d8a0e9bbcde09`（远端 main，已合 PR170/172–176）
- dependencies: 复用已合交易、推荐、持牌拖拽、工具工作区与成熟手绘；PR145 仅未验原型，不直接吸收。原触感候选保留在独立本地分支，不混入本包。
- allowedFiles: `src/game/ShopScene.ts`、`src/game/ShopComparisonDialog.ts`、`src/game/ShopJokerPresentation.ts`、`src/game/MakeCardsDialog.ts`、`src/game/ShopServiceDialog.ts`（最新核心升级服务的展示接口，不实现报价/领域）、`src/style.css`、`tests/shop-card-journey.test.ts`、`tests/shop-sale-continuation.test.ts`（原保存所有权和售后事实断言保持，更新展示mock）、`harness/shop-card-journey.mjs`、`harness/shop-make-cards.mjs`（仅提示检查接到新的固定短提示、随机现货按真实offerId及现有家族标签定位；完整支付回执在原收起说明中）、本证据目录中的 `README.md`、`SCOPE.md`、`checks.txt`、前后受控报告、完整状态 gzip 与原尺寸 PNG。
- nonGoals: 不改价格、推荐算法、计分、交易/保存、结算模块、AudioEngine、通用英雄能力、拖拽或资产；不开展旧档兼容，不合/推 main。
- outputs: 完整购买/五槽比较/售后买入/道具存放与快用/目标选择/返回现货的共享展示层级与上下文；独立开发分支 push、ready PR。
- acceptance: 320/390/PC真实受控全链，五实空星及人物原画可见，实际价格、次数、成长/版次损失与组合条件按原事实显示；取消/返回恢复比较位置与所选现货，道具存放/目标取消/使用结果可回原现货；每笔真实交易完整state/journal/IDB与原applyCommand相等，保存失败/重试和窄屏滚动保护。
- stopConditions: 真正可见缺口不存在则报告实图，不凭数量造改动；跨入领域/结算/音频窗口则停止该部分；真实事务或触点/滚动回归必须修复并保留失败。

先前只读观察器的旧全一星期待与“PC所有工具首屏容纳”期待在当前main已失败，作为观察器历史限制保留；它们不证明当前推荐算法或交易有错。本包新观察器按当前事实验证。

2026-10-14 父追加升级牌型服务接口依赖：核心线程 `01a13abc-29a0-72a7-a785-356002286036` 拥有权威报价、共享每店一次额度与原子升级命令。此包预留可选服务条目和确认组件；在核心接口未提供前不在实际商店展示虚假服务，也不复制算法、改旧T01或生成库存。其他独立链路先交付。
