# 商店星级与拟替换现金事实一致（2026-10-11）

本批仅修已确认的事实冲突，不实现净收益评估器或4/5星。唯一执行方向与剩余依赖在 [DELIVERY_PLAN 当前段](../../DELIVERY_PLAN.md#当前有界高优先商店建议的交易事实一致与15星方向2026-10-11)，不另立星级计划。输入main `6d2d954d1b41cddf632dfdce86fb75374e8f7e54`，产品 `3ea36faba88bf74ae5405e32b26c668322a17511`；后续提交仅收口观察器/文档，src树 `04923fd3fa1c5d4c83371d0894f7c95c4ed5bf0a` 相同。最终PR HEAD与CI在PR描述按SHA登记，本代理不合并。

复现：21金、练对子4金、满五槽、少一级已付8金→基础卖价4金。原路线建议compare，原货架却1星“先留金币”，理由按另一笔直接购买21→17判包场20金资格失效。11:53:41原单测实际红：13项中1失败（期望2星先比替换，实际1星先留金币）；不是据其fixture代签游戏。下表及before账是原代码、当前basic-suit-choice身份通过真实导入、原生mouse/touch读到的实际展示。

修复：`ShopRouteRelations` 返回本次已经核过的条件损失，`ShopOfferGuidance` 复用；已核空列表不再回退为直接买。保守2星“先比替换”与路线compare一致；退款仅1金的同方案21→18，1星留金和精确练对子理由一致。出售/买入仍各自确认，不自动交易、不承诺净更强。没有改领域、价格、折扣、概率、英雄、Boss、内容身份或其他交互文件。未知评估不发4/5星。

| 真实尺寸 | main前：1星 | 产品后：2星 | 原生替换入口 | 原生命令已保存 |
|---|---|---|---|---|
| PC1366×768 | [货架](before/1366x768-full-slot-shelf.png) | [货架](after/1366x768-full-slot-shelf.png) | [具体槽与失去来源](after/1366x768-route-replacement.png) | [卖后25金](after/1366x768-saved-sale.png) / [买后21金](after/1366x768-saved-purchase.png) |
| 手机390×844 | [货架](before/390x844-full-slot-shelf.png) | [星、用途、一句效果](after/390x844-full-slot-shelf.png) | [具体槽与失去来源](after/390x844-route-replacement.png) | [卖后25金](after/390x844-saved-sale.png) / [买后21金](after/390x844-saved-purchase.png) |

[手机退款1金负例货架](after/390x844-net-cash-loss.png)保1星；[培养首层](after/390x844-net-cash-loss-first-layer.png)仍可能显示另一笔基础工具2金的21→19风险，这是不同商品的真实成本；[既有展开区的练对子理由](after/390x844-net-cash-loss-reason.png)明确21→18。本批没有把2金工具的数字当作4金Joker替换，也没有改培养首层的信息架构。购买详情原直接BuyOffer的支付/槽满禁用仍是该按钮自己的事实，不能把未确认出售的退款当成现有金币；星级比较方案不据此虚假降级。更完整首层比较与4/5星判断仍按唯一计划依赖推进。

每端先经真实选角→路线→联合确认进入正常首店，原随机现货不替换，买当前3星可补组件；完整state/journal/IndexedDB逐字等于实际BuyOffer（[PC正常入口](after/1366x768-normal-first-shop.png)、[手机](after/390x844-normal-first-shop.png)）。满五槽/公开持有/21金为明确受控导入，非自然获得；检查取消出售不消费、只读建议不变、实际SellJoker返4金与BuyOffer扣4金各仅一笔、IDB current/previous/revision与原checkpoint完全相等、刷新完整恢复，pageerror为空。未跑18局、不扫种子，不签自然取得率、未来得分、物理设备或真人理解。

[before摘要](before/report.json)与[原始完整账](before/full-state-journal-idb.json.gz)绑定main6d2d954、源树2b89e04、src/test/harness无本地改动；[after摘要](after/report.json)与[完整state/journal/IndexedDB账](after/full-state-journal-idb.json.gz)绑定实际验收HEAD及无源改动。各自记录执行观察器SHA256。54项必要回归/7文件、type通过，唯一计划静态32包通过；这些不是体验或平衡签收。前后双端整屏与手机替换/损失实图已实际查看。

保留失败及观察边界：

- [观察器1](observer-failure-1/report.json)：把副货f10错填4金，当前身份真实目录价8金；checkpoint拒绝invalid-save-offer-price，未导入/消费。只修观察器读r2Price，不改价格。
- [观察器2](observer-failure-2/report.json)：取消确认已关当前弹窗，却又等不存在的关闭按钮超时；修正观察器生命周期，产品不变。
- [观察器3](observer-failure-3/report.json)：错误假设培养第一层必显示练对子风险，实际为另一笔基础工具2金风险；改为展开既有精确商品理由，原内容/算法不改。
- [入场动画视觉FAIL](entry-animation-visual-FAIL/report.json)：程序通过时首张手机图仍透明、PC仍在入场，不签画面；原[PC](entry-animation-visual-FAIL/1366x768-full-slot-shelf.png)/[手机](entry-animation-visual-FAIL/390x844-full-slot-shelf.png)保留。最终按原动画完成、实际文字有效alpha=1后拍，未取消/缩短产品动画。
- [原金币滚动中间帧](intermediate-cash-roll/390x844-saved-purchase.png)：实际state/IDB已21，UI滚动当帧22；这是原反馈中间帧，非扣款错误。最终保存画面等待真实金币文本达到保存值再拍，不改变反馈。

[保护树与历史段证明](protected-trees.json)：只有两个建议模块改产品；ShopScene、道具/拖拽、BuildJourney/BuildFallback、领域/保存/内容/资产逐树同main，唯一计划既有规格及历史段字节相同。PR115/117/116已由父合并，父main精确CI38134016502成功、线上dot读6d2d954据父报告；6/18终态、第7仍打，C1仅在C2收口的数值候选，Astra PR113冻结，均不写成全局已验收。
