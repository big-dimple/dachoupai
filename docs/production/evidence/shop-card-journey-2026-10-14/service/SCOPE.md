# 升级牌型服务接入开工卡

- requirementId: W3/W5-shop-practice-service-integration
- inputSHA: 商店已审 `231e1440eb76fce49156b7912145ff4892855cf7`，核心PR178 `0b41f87618e0fca3016a352d59af62353a2acafa`，正常merge保全双方历史。
- dependencies: 已读 PR180 comment6171547163 与核心 DOMAIN_INTERFACE.md，依赖已解除；r2PracticeQuotes/PracticeHand 与严格保存为唯一权威。
- allowedFiles: 原核心3提交仅正常集成，不自行修改；新增/修改 `src/game/ShopPracticeService.ts`、`ShopScene.ts`、`MakeCardsDialog.ts`、`ShopServiceDialog.ts`、`EndlessContinuationCopy.ts`（父最新明确追加权威reader显示接线）、`src/style.css`、`tests/shop-practice-service.test.ts`、`tests/make-cards-flow.test.ts`、`tests/endless-continuation-copy.test.ts`、`tests/shop-card-journey.test.ts`（原价格模型断言保留，新身份主入口不误写升级为2/4金）、`harness/shop-practice-service.mjs`，及本service证据目录和原README的当前追加状态。
- nonGoals: 不复制或修改领域价格/优惠/共享额度/升级/保存公式，不重做之前商店链路，不改计分/结算/音频/资产/安全设置，不推/合main。
- outputs: 服务条目→权威确认→原SavedRun命令→已保存结果→返回做牌，失败固定候选retry，更新同一PR180 ready。
- acceptance: 320/390/PC真实可见；查看/取消0命令、成功只扣一次、不入库存；延迟连点/失败重试、原优惠和命令序号；改牌/染色与服务共享一次且刷新不重置；未发现/30级无可购项；新局身份、原T01买存/快用保持；完整state/journal/IDB与原领域命令相等。
- stopConditions: 核心接口不匹配则准确报告并保留独立已完成部分；真实事务/滚动/操作回归必须修复或留阻塞；旧证据保持各自SHA，不借旧CI签新接线。

分支关系：PR180开发分支正常merge PR178完整head，最终180将包含178核心；领域树逐对象保178，由父安排串行集成。父最新明确纳入EndlessContinuationCopy读取r2TargetPolicyFor，不改Intermission或结算规则。
