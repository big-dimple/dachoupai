# 手机货架满槽价格/比较字串有限修复

基线 main `8f036827dde4ca5b88ba89fceb0fbdf0f32b2970`（PR137已合）；产品源码冻结 `9a24ed04605f6d96845febc653cd06f371dddad5`，**只改 ShopScene.ts:187 的手机货架字串一行**：`4 金 · 比较替换`→`4金 · 比较`，未满保`4金 · 查看`，已购保`已收入`。字号16px、货架/点击几何、颜色/状态判断、完整详情/比较入口/交易不变；非portrait和PC格式不改。领域、推荐、价格、存档、拖拽绑定/方法、PR138资产均未改。独立分支，不改已合分支历史，不推main；父唯一Ready/merge。

## 原FAIL与同状态整屏

已实际下载并view_image查看父[PR138满五槽320原图](https://github.com/big-dimple/dachoupai/blob/1fcec442d8d5785ae91986e0d69ed4214de64766/docs/production/evidence/owned-joker-drag-feedback-2026-10-12/main-final/320x740-slow-dropped.png)，本地保[parent原图](parent-320x740-slow-dropped.png)。本次在main重新复现：320首列原16px字串实际宽108px，超过本列约14px，相邻三列叠字；[原报告](before/report.json)不以视口内可见代替列内界限。

| 宽度×740高 | main满五FAIL | 修后满五 | 12/100只读绘制 |
|---|---|---|---|
| 320 | [整屏](before/320-full5-enough-shop.png) | [整屏](after/320-full5-enough-shop.png) | [整屏](after/320-full5-enough-readonly-12-100.png) |
| 360 | [整屏](before/360-full5-enough-shop.png) | [整屏](after/360-full5-enough-shop.png) | [整屏](after/360-full5-enough-readonly-12-100.png) |
| 390 | [整屏](before/390-full5-enough-shop.png) | [整屏](after/390-full5-enough-shop.png) | [整屏](after/390-full5-enough-readonly-12-100.png) |
| 412 | [整屏](before/412-full5-enough-shop.png) | [整屏](after/412-full5-enough-shop.png) | [整屏](after/412-full5-enough-readonly-12-100.png) |

覆盖每宽满5/未满2 × 足额/缺金/同名/已购；“已购”由原BuyOffer生成合法fixture，其他现货继续保比较/查看。每组before/after完整初始state相同，原main观测与最终源文件hash保在报告。代理实际看上述宽度、320多位/未满、360缺金、390同名、412已购及详情整屏，未裁局部掩盖叠字。

## 实际输入与保存边界

所有普通fixture经原checkpoint校验，从真实菜单导入；实际点击价格字串中心：满五打开原五槽比较→返回购买详情，未满打开详情→原“比较替换”→返回详情，再取消。缺金/同名/满槽的邀请按钮仍按原判断禁用；已购点选仍不打开购买。原整卡点击矩形均≥44×44，价格16px未缩小。全文/原判断不短化，只手机首层动作短为“比较”。[320缺金详情](after/320-full5-short-details.png)、[390未满同名详情](after/390-under2-same-details.png)。

[最终报告](after/report.json)、[完整state/journal/IDB](after/full-state-journal-storage.json.gz)：全部查看/比较/取消与投影前后完整保存相等，无新增命令或扣款。局部控制数据不是自然整局、正式域名、物理Android/真实触摸验收；不扩大为整体手机布局完成。typecheck通过；最终精确HEAD CI以新draft检查回执为准。

## 12/100的准确口径与失败保全

这组商品目录报价4/6/6，原保存校验及Run invariant要求报价等于目录；12/100不能伪造为该商品的合法保存。因此仅把private scene读取副本的第二/三价设为12/100，ready=false禁止交易，controller、journal、IDB保真实数据。生产render绘出16px价格/动作且逐列完整；320投影`100金 · 比较`实际89px，落在本列内；未满同样验`100金 · 查看`。完成后恢复真实scene，完整保存未变。

曾额外尝试把100投影送进比较模拟，原`Run invariant: joker shelf prices/edition`拒绝，保[原失败报告](projection-rule-fail/report.json)及图/完整账。停止这一不合法的模拟，不改或绕过invariant，不声称100合法交易/详情通过；合法报价的八类操作均另实走。100只签字串绘制边界。

复现：`SHOP_PRICE_OUTPUT=/tmp/price-after node harness/mobile-shop-price.mjs`；在main8f036827用同harness运行`--before`留观测。父负责最终像素复审/Ready/merge；PR138拖拽批独立串行整合。
