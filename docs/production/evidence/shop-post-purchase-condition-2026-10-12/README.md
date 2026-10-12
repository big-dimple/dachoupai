# 包场购后现金条件：最小推荐修正

输入main：`f326a9b3a7a9be937c7c3cd4d286721f674a9409`。实现冻结：`6d9ad00ae2ba470f2589616409c4bc5349767b91`，src树 `6fc45452400b7df869db4e71b08e6f89119f8b17`。后续只归档此证据；最终PR HEAD/CI由父另核，不借产品旧SHA的绿灯代签。

当前唯一计划仍为[DELIVERY_PLAN](../../DELIVERY_PLAN.md#当前统一执行计划)；本小修按父明确授权执行。PR135只是后续整体推荐/价格校准合同候选，不是本缺陷核查依赖。AGENTS原暂停/串行历史按原时点保留，此次授权只释放这三处模块和最小检查，不另立计划。仓库及 `/workspace/.agents/skills` 无相关SKILL.md，也已查 `/home/agent/.agents`；没有套用不存在的目录技能。

## 根因及修正边界

- ShopRecommendation的包场（e08）原读买前gold≥20；ShopRouteRelations的现金风险原只遍历保留持牌，漏新买包场。
- ShopOfferGuidance原把路线建议自动拟换对象的退款当货架/详情现金基础。现在未指定对象就写余额待核；比较各槽使用该槽真实先售后买条件，不偷选其他低价值牌。
- 新共享现金事实用现有纯克隆SellJoker核退款、优惠消失与售后联动；不dispatch、不保存、不抽牌。新牌/旧牌警告与包场推荐共用此基础。现有比较仍用纯克隆Sell/Buy命令核真实售购成长，这些命令返回新state，未进runController或storage。
- 包场购后门槛不足沿原二星分支，成立且保留有效加倍率来源时仍四星。满槽包场未核对象沿原二星保守分支并明确“替换待核”，不是判任何替换都差。其他牌不因满槽或缺钱统一降星；保现有实心/空心五星、普通高推荐与稀有低推荐。
- 仅三产品文件：ShopRecommendation、ShopOfferGuidance、ShopRouteRelations。ShopScene、框线、样式不改。domain/application/content/platform/core/public与输入main逐文件无diff；价格、供给、计分、随机、身份、保存无改。不是72牌重评、价格研究、未来收益或最优替换承诺。

## 三类公开输入与指定满槽对象

| 输入 | 修前/修后公开结果 | 限定证据 |
|---|---|---|
| 26金，空槽，普通版次包场实付8，已持对上眼有效加倍率来源 | 买后18；修前四星且无新牌警告，修后二星、“买后18金，暂不触发” | 两端货架/详情/比较；定向权威scorer无包场×1.8事件 |
| 28金，相同现货/来源 | 买后20；四星保持，无失效警告 | 两端；定向权威scorer出现包场×1.8 |
| 23金，已持包场，购练对子实付4 | 买后19，包场失效；练对子仍四星，显示现金风险 | 两端；定向scorer无包场×1.8 |
| 满槽24金，1张减2券、首购；e02/e11/e06/e05/b02 | 指定第1槽熟客券（原实付2）返1、优惠牌移除后实付6、买后19：新包场失效；指定第2槽长期捧场（原实付8）返4、实付5、买后23：门槛满足。保留旧物新用售后+0.5、置办行头购后热+8；出售长期捧场失去×1.5，资历仍保留 | 两端五槽比较、两次实际点“管理这张→出售→取消→重新打开比较”，指定对象2/4星由共享函数另核；不是实际卖买 |

满槽未指定对象的货架/详情/比较摘要一致为二星“替换待核”；各比较卡写本槽真实返还、实付、购后余额及失效条件。直接买得起与当前效果满足是两回事。购后成立也只说明当前现金门槛，不保证下一手一直保20金。

## 原生有限检查

同一当前新身份，两端1366×768鼠标与390×844触摸，各4个受控公开商店导入，共8行。导入只作夹具准备；观察开始后的货架、详情、比较、指定槽出售确认取消、换槽、返回与取消中，scene.send调用均0。完整state（含所有RNG/receipts/identity）、journal、IndexedDB全部槽位和localStorage逐行deepEqual；完整前后保于压缩附件。

- [基线报告](baseline/report.json)、[基线完整state/journal/storage](baseline/full-state-journal-storage.json.gz)：精确main f326a9b，8行REPRODUCED/OBSERVED。
- [冻结候选报告](candidate/report.json)、[候选完整前后state/journal/storage](candidate/full-state-journal-storage.json.gz)：精确6d9ad00，changes为空，8行PASS。
- 两版同观察器SHA256 `8dee8e9574214e87720eca4e83079ad5c49aca175061816348eda513496592aa`；全部附件[SHA256清单](sha256.json)。

实际查看的可读截图：

- [修前390包场四星但买后18](baseline/390-negative-detail.png) → [修后PC货架](candidate/1366-negative-shelf.png)、[修后390货架](candidate/390-negative-shelf.png)、[修后390详情](candidate/390-negative-detail.png)。
- [28→20阳性](candidate/390-positive-detail.png)。
- [已持包场23→19警告，邀请按钮仍可点](candidate/390-retained-detail-cash-warning.png)。该截图有原生滚动，不以默认首屏截图冒称完整警告可见。
- [PC两槽19/23对照](candidate/1366-full-compare.png)、[390第1槽现金警告](candidate/390-full-compare.png)、[390滚到第2槽](candidate/390-full-second-slot-compare.png)。

这是软件viewport与受控原生操作，不是物理手机/玩家理解/美学整体签收。未跑自然整局、18局、价格收益、自然获得率或长期胜率，未Ready/merge/部署。

## 定向验证及原FAIL

冻结实现6d9ad00上10文件86项通过，typecheck通过；新增7项只核购后18/20、已持牌失效、真实指定对象/优惠/联动、不可售容量拒绝、满丑牌槽合法工具购买及五星不受全局降星。现有72ID枚举测试只回归既有合同，未重新制定全牌评级。

```
npx vitest run tests/shop-post-purchase-condition.test.ts tests/shop-offer-guidance.test.ts tests/shop-route-relations.test.ts tests/shop-current-decisions.test.ts tests/shop-recommendation.test.ts tests/shop-recommendation-c2.test.ts tests/shop-recommendation-c07.test.ts tests/shop-sale-continuation.test.ts tests/build-journey.test.ts tests/build-journey-dialog.test.ts
npm run typecheck
CONDITION_OUTPUT=/tmp/shop-post-purchase-condition-candidate-frozen node harness/shop-post-purchase-condition.mjs
CONDITION_ROOT=/tmp/dachoupai-bao-baseline CONDITION_BASELINE=1 CONDITION_PORT=5482 CONDITION_OUTPUT=/tmp/shop-post-purchase-condition-baseline-frozen node harness/shop-post-purchase-condition.mjs
```

首轮测试4 FAIL：旧20金买前评级与自动拟换现金期待被本修复正确推翻；另旧b06夹具错写4金，真实克隆出售不变量拒绝，夹具改读r2Price。新增scorer夹具首次缺r2ScoreContext报invalid-route-growth-snapshot，后补真实上下文；typecheck重复characterId移除。均未改领域规则，最终86/type通过。

首轮浏览器观察器在PC full取消出售后，错误期待旧持牌弹窗仍在并点“比较替换”，真实行为为关闭，所以30s超时。原[FAIL报告](observer-fail/report.json)、[完整当时保存](observer-fail/full-state-journal-storage.json.gz)、[原失败观察器](observer-fail/harness-failed.mjs)保留。修为取消后重新点真实货架，之后两版/两端均通过。最终冻结前首次8行PASS不是另一产品修复；最终观察器只追加必要滚动截图，已按冻结SHA重核。

GitHub CLI的环境GH_TOKEN登录失败，公开actions API读限流403；正常git push和已连接GitHub工具成功可用，不借此故障冒称CI通过。最终精确HEAD CI与draft链接在交付回执另列。
