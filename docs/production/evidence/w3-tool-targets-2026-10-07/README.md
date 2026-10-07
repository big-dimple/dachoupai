# W3-P1 工具改牌目标选择：有界产品批次

2026-10-07。input main `576a7b60a4153d35d1479cfff9abb0d8cb6d61e6`（父确认PR39独审/精确CI/FF，fetch一致）。最终源码/harness `7db8630eda711d90474b659ef7ab225baa8a65e3`，report启动sourceStatus为空。仅draft父审，不预记合main、上线或玩家验收。

## 原任务、依赖与产品

原W3-P1工具使用闭环（U04/U06/U11），复用W2已备资产，继续原W0–W9。必要首章布局、公开目标/确认/保存合同已存在；ASSET_RECONCILIATION_2026-10-07.md已有J/Q/K及72 Joker映射。没有等待非阻断整批精修，也未越过角色/领域门槛。原整副目标按原序列出，寻找同点/同花改造目标不便；这次推进目标实际选择，不继续增长文案打磨。

ConsumableDialog既有扑克牌gallery加入点数/花色整理，只移动既有label DOM；选择、原实例序号、确认预览及实际命令顺序保持。商店有效牌组可整理，牌桌仍只提供当前公开手牌，不窥drawPile，不修改手牌顺序或保存state。排序按钮44px、14px；目标增强/版次说明提升至14px。名称/花色先于图像，短横第一屏可辨目标；court与Joker缩略使用已有稳定ID，缺图隐藏图像保留文字/选择。不改计分、经济、角色、RNG、存档、布局、资产或CI。

assets.json只对这次复用的j/q/k/b10四个输出核字节/hash与manifest一致。原生Q与b10 decode及源路径在report，未重新验全部81原画/165输出或宣称美术完成。

## 必要验证

- 相关typecheck＋69 tests/4 files通过。最终候选只跑一次完整默认npm run verify：2471 tests/137 files、typecheck/build通过；content、production-plan通过。复用已审main基础，不重复商店/成长全套矩阵。
- 最终原生1366×768、390×740、320×740、740×390，safe-bottom34，四案全过。两目标反原序选择，重复点数/花色整理后选中实例、预览与完整run保持；确认按原targetChoices顺序提交，完整状态除本次命令receipt身份外逐字段同真实applyCommand（含RNG），不是只验静态排序框。
- 红桃染实际改变所选两实例、只消费一次工具；reload完整state相同。S02切换大丑牌目标，显示当前持有b10既有缩略；选择/取消不消耗、不读随机结果。牌桌gallery实例集合严格等于当前handOrder，查看/整理/取消完整state不变。
- 390真实IndexedDB quota失败保原run/工具；重试同一候选只增加一次seq、保存两目标变化并消费工具。沿用原机制，失败关闭详情，未宣称失败后保留旧弹窗选择。
- 320阻断court图请求后，目标仍可读Q♥、可选择/取消，state不变。排序触点≥44px；最终390与740截图已实际查看，牌名在图像前，确认/取消入口保持。

首负例脚本用伪dispatch错误，却等待旧弹窗反馈，实际现有send会开新错误框；negative-script-failure.json保留。改为已有真实quota/候选重试路径。第二次脚本等待scroll到已隐藏失败图超时；art-script-failure.json保留，改scroll到仍可读label后核隐藏图。两者是测试路径错误，没有据此扩大产品或修改保存规则；最终同一完整四案重新冻结通过。

[390目标与现有图像](targets-390.png) · [短横先读牌名](targets-740.png)。复查：`node harness/w3-tool-targets.mjs`；有限尺寸可用W3_TARGET_WIDTH=390（或逗号列表）。fixtures明确受控导入，不称自然获取/新人迁移；无长录屏或软件FPS验收。玩家经营理解、用户PC/手机实机、审美和完整W3/W6仍待验收。
