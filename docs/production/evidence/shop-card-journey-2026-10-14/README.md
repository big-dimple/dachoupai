# 商店与卡牌整条移动链路

基于远端 main `f651a04ef5eb68c29a413acf8b4d8a0e9bbcde09`（已合 PR170/172–176）。原牌桌拖拽已完整接入共享商店组件，本包没有重复拖拽；先前触感候选仅保留在本地独立分支，未推送或混入。

玩家现在可以持续看着待买人物卡比较五槽；稀有、版次、推荐实空星、实际支付/退款、成长与版次损失分别显示。第5槽查看后返回仍在第5槽，取消出售回原持牌，售后买入仍由两笔原命令分别确认。PC1180/1366把真实报价的“做牌自选 · 1件”提升到主操作列，主线入场按钮保持。

道具买来存着后回原现货并显示真实已保存收据；买来使用继续原目标工作区。已持库存、目标取消、使用结果与返回现货共享原工作区与滚动位置，手机库存入口也进入同一工作区。即时购入/恢复后的目标页有固定短付款提示，完整付款说明仍在原收起说明中。没有强制立即使用。

## 实际画面与整链验证

| 路段 | 原 main | 本包 |
|---|---|---|
| 320比较：先看到待买卡与第一槽 | [原图](before/320-compare-first.png) | [新图](after/320-compare-first.png) |
| 390第五槽查看后返回 | [回到第一槽](before/390-compare-return.png) | [仍在第五槽](after/390-compare-return.png) |
| PC1180原入口与做牌层级 | [底部说明](before/1180-shop.png) | [主列自选入口](after/1180-shop.png) |
| PC1366完整五槽比较 | [原图](before/1366-compare-first.png) | [人物与分列代价](after/1366-compare-first.png) |
| 390售后再确认购买 | 原路径不改 | [真实新余额/实付](after/390-buy-after-sale.png) |
| 320买来存着 | 原购买事务保持 | [保存后返回现货](after/320-tool-stored.png) |
| 320快用与目标选择 | 原选择规则保持 | [目标页](after/320-quick-use-target.png) |
| 390失败后重试使用 | 原原子保存保持 | [已保存的真实前后牌](after/390-use-save-retried.png) |

在同一受控公开 fixture 上，main 的320×844、390×844、1180×757、1366×900先拍原图，只读查看/取消完整state/journal/IDB相等；报告为 OBSERVED，未伪造产品PASS。main产品树 `04097f7c7ece0d2297b787bfdf3c9c6031b4456b`，仅在隔离工作树复制了同一个观察器作为untracked脚本，产品未修改。

本包实际冻结运行于 `58ab68f834997c3db88101d068f21d73688fc773`，产品树 `d384e371c3599e677fb345228105aab875b33219`，tracked src/tests/harness clean。此后两次提交只修旧工具观察器的可见tile与手机库存tab定位，src tree保持。归档提交仅增证据，不代签未运行的产品版本。

[整链报告](after/report.json)和[完整状态gzip](after/full-state-journal-storage.json.gz)包含四个viewport各6笔真实事务：出售、购入新牌、现货工具买来存着、明确使用该工具、基础工具买来使用、故障后重试明确使用。24笔逐笔比较完整state、journal、IDB.current及revision与原applyCommand/makeCheckpoint，全部相等；4次冷恢复完整相等。两手机实际CDP纵向滚动比较列表，五槽返回位置精确相等；道具现货滚动位置在取消快用后精确保持。每端真实quota失败保原公布状态，原菜单重试固定候选并回原结果/工作区，无新增规则或保存实现。

全部PNG为浏览器原尺寸截图，无后处理。实际查看了320比较、390返回第五槽/售后买入/失败重试、1180主店和1366比较等最终像素；这是有限可见性/可达检查，不签整屏美学或真人理解。

## 软件门与保全

95项/11文件定向、build含typecheck、内容72项目录检查、32包生产计划检查通过，见[日志](checks.txt)。源树保护核对：domain/application/content/audio、GameScene/Intermission、OwnedJokerInput/OwnedJokerDragVisual、assets/art、依赖、安全设置、CI和唯一总计划均与main相同。

原工具全链观察器保留真实失败：旧PC首屏容纳期待、被原ConsumableDialog移入收起说明的完整付款回执、错误T10 definitionId定位、旧“现货”家族标签、隐藏的第一个tile、未切库存tab，见[失败目录](failures)。只把观察器接到当前真实短提示/offerId/家族标签/可见tile及库存tab，不改支付、状态断言、失败/只读/恢复门槛。另一次观察器结束冻结检查失败：证据归档改变仓库状态时该观察器仍运行，不能签该次来源不变；实际冻结后另跑。

新增夹具首轮tool offer ID缺/tool/0，被原checkpoint拒绝且未进入浏览器；新增纯展示测试尝试保留已用4次的f06，被原不变量拒绝。纠正为合法ID及0/3次真实可持状态，守卫保持。

## 核心升级服务依赖与未验范围

最新父指令的“升级牌型”服务由核心线程 `01a13abc-29a0-72a7-a785-356002286036` 提供权威报价/共享额度/原子命令。已预留 `ShopServiceEntry`、`ShopServiceQuote` 与 `showShopServiceConfirmation`，showMakeCards末参数接受可选服务条目，确认展示明确当场升级、不入库存、原共享本店一次。当前调用未提供条目，实际商店不展示未实现服务；报价与命令接口尚待核心提供，属于pending依赖，未签该服务可买/软件交易。现有随机T01及道具买存/快用保持。

受控fixture不是自然获得或真实玩家存档。未验实体设备/触感/听感、自然整局、全部72卡逐卡截图、全部39工具实用、短横屏与整体审美；本包不签这些，不部署或合main。最终精确PR HEAD与CI结果在PR另核，不借旧main或源PR绿灯。

工具全链在冻结 `2eaa31de34fc3acd423d7ad4a211e3b5ac8ee653`（精确值见报告sourceBefore.head）的PC1366×768/390×740复跑最终PASS，source/index/HEAD/branch前后完全相等；[摘要](tools-regression/report.json)、[完整state/journal/storage报告](tools-regression/full-state-report.json.gz)。两端额外核真实延迟/连点/购买失败重试、增强覆盖取消及确认、使用失败重试、滚动保持、实际lease失去后的禁购与只读预览。未改工具规则或保存。
