# 当前交付：方案 A，保留既有五星，仅修指定替换来源

2026-10-13 父任务明确采用方案 A：恢复 a06/b06/a11 三处原五星规则与对应测试，撤销全卡四星上限；保留已验证的指定替换来源修复、逐槽成本与组合说明。**罕见五星仍可出现；跨路线五星覆盖和成本校准尚未完成，不是本批已解决的问题。** 不加类型缺口分、不设每局配额，不修改其他需求。最新受影响测试、移动端五星截图及源码追溯见[方案 A 增量回执](OPTION_A.md)。

下方是 `9b9d3aa7cf1929ec3b5ada946c2b7ecef084fccd` 及产品 `8e844d830c883c2d462d298160ebf1044d3fad75` 的**历史候选记录**。其中“暂不输出五星”“全卡四星上限”的取舍已撤回；不作为当前规则或最终诉求。原图、原测试及原SHA保留，不改写历史证据。其7对替换来源/逐槽成本/组合说明检查按原版本复用，方案 A 只补受影响的五星规则与显示边界。

---

# 推荐指数：证据、指定替换与五星覆盖修正（候选）

输入 main：`f23c1fc2389242bacbb8f5d35733f1c344610727`，2026-10-13 fetch 后 HEAD/origin/main 相同，工作区干净。按本次用户授权创建独立 `fix/recommendation-evidence-2026-10-13`，只交草稿 PR，不合并/部署。总计划由父任务整合，本文件不另建主线。

已读 AGENTS、[DELIVERY_PLAN 当前段](../../DELIVERY_PLAN.md#当前统一执行计划)、PRODUCT、CONTENT、ART、[18局自然复盘](../natural-18-runs-2026-10-12/REVIEW.md)、[72牌审查](../shop-full-slot-value-review-2026-10-11/CARD_AUDIT.md)、[购后现金修正](../shop-post-purchase-condition-2026-10-12/README.md)及当前实现/测试。`/workspace/.agents`为空，仓库没有 `.agents/skills`，未使用不存在的技能。此前计划/AGENTS的仅文档暂停由此次明确的开发委托覆盖，其他范围保持。

## 先锁判断规则与边界

1. 唯一名称为**推荐指数**；仍画五颗完整的实心/空心星，不改字号、卡宽、画风或稀有度样式。路线标签表示用途条件，稀有度表示牌的固有类别，两者均不作为加星项。
2. 现有一至四星是有界启发式，不是收益率/最优排序：一星有已知条件不足、封禁或容量收益已满等负证据；二星通常需补条件、晚到/限次/风险用途；三星为普通条件用途；四星有当前公开构筑/已有来源或成长窗口支持。**本批不声称已重校准全72牌的二/三/四档阈值**；同星可以有不同寿命、触发条件与实际价值。
3. 五星应要求跨路线相同的证据强度：真实可触发的有界对照、可重复的边际收益、购入/使用/卖出总成本、失去的成长与版次、有限寿命及风险，且相对保留/其他可执行选择仍有明确优势。缺项保留未知，不能由“类型缺口+路线契合+有搭档”、单手峰值或卡牌稀有度推导五星；不承诺每局2–3张。本批不发明数值门槛。
4. 已确认旧五星只有 a06、b06、a11 同点相关路径；同花与顺子没有对等判定，也未比较上述成本。最小纠偏是把这三处分支回到四星，**本候选暂没有可输出五星的规则**，保留五档显示结构。不是靠给另两路线补分实现表面公平；不是宣称最终五星系统完成。这项保守取舍在编码前已向父会话同步，交草稿待父审。
5. 满槽只表示需指定替换，不能把全部新牌降为一星。未选对象保留构筑评价/“需替换”；选择对象后用原领域纯函数的克隆出售结果重算所有推荐的保留来源、条件和静态修饰。之前只有 e08 这样处理，d09 会把即将卖掉的唯一重触来源继续计入四星，这是本批修复的可复现错误。
6. 比较首层逐槽显示真实返款、售后实付、买后现金、失去的成长/版次和新牌推荐；不自动选对象/出售/购买。四星不表示换掉该槽净更强。原现金门槛、售购联动、容量拒绝仍由既有领域命令判定；出售不可执行时返回“替换不可执行/待核”，不能假设售后状态存在。
7. **组合潜力**只说明公开条件/已有来源可配合，仍需实际触发。**组合记录**只列上手已保存 trace 中、当前仍持有的共同计分来源；只取计分阶段的实际累加器变化或有效重触，不把结算后成长当计分贡献。不把共同出现解释为因果连锁、额外组合奖励或下手保证，新现货不冒称加入上手组合。正式“组合已成型”还需实际后续兑现，本批不发明隐藏组合体系。

| 受控边界 | 本批预期/处理 |
|---|---|
| 成组/顺子/同花均持三拍，买 d09；满槽未选对象 | 四星、需替换，不一刀切一星 |
| 同一输入指定卖三拍（唯一重触来源） | 四星→二星，说明尚缺可用重触来源；不能保留卖前配合 |
| 同一输入指定卖 e01，三拍仍在 | 保持四星；三路线同一规则 |
| 指定卖已养成 e11 | 明示失去实例系数×1.6，资金按实际交易；本局路线资历仍保留 |
| 已有上手真实共同计分/没有 trace/卖掉其中一张 | 分别显示真实留存来源/无共同记录/剔除已售来源；新现货从未算进已发生记录 |
| 四次寿命 f06、随机 f08、晚到成长 | 不补类型缺口、不抬五星；保原寿命/风险/新实例初值说明；其旧章节星级不冒充新价值校准 |
| e08 26→18 / 28→20、售后优惠消失及现金联动 | 复用已合现金事实，原回归继续覆盖 |
| 扩容牌出售后道具超容量 | 明确不可执行，不给假定售后评价 |
| 普通高推荐/稀有低推荐、三路线巨分夹具 | 独立于稀有度和总分；均不自动升五星 |
| 永久损失工具 | 既有选目标/损失确认保持；本批不触碰工具规则、不将其成本伪造为可回收净收益 |

## 分批与文件窗口

- **本批最小候选**：上述五星覆盖纠偏、指定替换后来源正确性、比较页按槽评价、潜力/上手记录可读性。产品仅 `ShopRecommendation.ts` 和 `ShopScene.ts` 的购买摘要/比较方法；不改结算方法、样式或资产。
- **下一批待父审合同**：五代表机制 f06寿命、晚到成长、已养成替换、现金门槛、永久损失工具，逐一给真实可执行成本和有界收益反例；同点/顺子/同花使用同一证据门。只有证据足够才定义可到五星的门槛，不能把本批“暂停五星”当最终整改交付。
- **父 dot 自然验证**：三路线各一自然经营路径，记录买/不买、保留/替换与后续真实兑现；不刷满意种子、不强买强用，不用本受控夹具代签。具体安排与 DELIVERY_PLAN 主文件由父统一维护。

不修改 domain/content/application、结算展示/时钟、倍率、关卡目标、价格/供给/RNG/存档规则或手绘素材；保留并行任务窗口。只读比较调用原纯领域命令，没有 runController dispatch/save；实际观察调用记录和全量 state/journal/IDB/localStorage 比对另列。

## 实际验证与剩余验收

验证状态、冻结源码 SHA、截图及最终 CI 在后续证据提交追加。所有本批浏览器样例均为 **受控夹具**；域命令确实生成并保存了一次合法计分 trace，但不是自然获取、自然经营或自然通关。物理手机、触感/听感、玩家理解、三路线自然经营、总体平衡和最终五星校准未验收。

### 冻结回执

产品与观察器冻结：`8e844d830c883c2d462d298160ebf1044d3fad75`，src树 `871a95b256f3d0d9ec3062b5800c69b4d85fa6e5`。最终追加仅证据文档，不能把先前 main 的 CI 当候选通过。

- [96项定向/11文件](logs/targeted.log)通过；[typecheck＋生产build](logs/build.log)通过，Vite已有大chunk提示保留。未在本地重跑无关全库/18局。涵盖旧/新身份、三路线来源剔除、现金门槛与售购联动、禁用来源、晚到/限次、公开普通牌型见证、不可出售容量边界、潜力/真实记录分层及五完整字符。
- [计划门](logs/plan.log)通过，32工作包；[validator自测](logs/plan-self.log)1有效/13无效样例通过。这不是玩法验收。
- 同一最终观察器：基线精确 main 与候选冻结源码，PC1366×768、390×844各三路线，320×640仅成组窄屏边界，共7对/14次观察。[基线](baseline/report.json)、[候选](candidate/report.json)、[逐对核验](paired-verification.json)。最终两侧 sourceChanges 为空，baseline只借入同一测试fixture文件和node_modules符号链接，不改产品。
- 成组/顺子/同花均实证：原main指定卖唯一重触来源仍四星；候选二星，保留来源的另一槽仍四星。比较页新增的每槽推荐没有自动卖买；真实send调用均0。
- 每行查看货架→原生点击比较→滚动至已养成槽→返回详情→取消；完整 state（包括RNG/receipts/身份/真实trace）、journal、IDB所有槽位与localStorage逐行且两版本间deepEqual。原始全量分别在[基线压缩记录](baseline/full-state-journal-storage.json.gz)与[候选压缩记录](candidate/full-state-journal-storage.json.gz)。这是只读回归，不冒称本轮实际完成替换保存或后续自然兑现。
- 货架每件5个14px完整实空星、字形bounds均在本件区域内；手绘/字号/框线/价格没有改。浏览器页面错误为0。截图为软件Chromium viewport/鼠标或触摸模拟，不是物理手机。
- 源码差异只有ShopRecommendation和ShopScene购买摘要/比较两处；domain/content/application/platform/core/public/art/GameScene及DELIVERY_PLAN/plan.json与基线无diff。计分倍率、目标域、结算展示无改动。

已实际看图的代表证据：

- [PC逐槽2/4星比较](candidate/1366-straight-compare.png)、[390逐槽比较](candidate/390-group-compare.png)、[320完整五星与窄屏比较](candidate/320-group-compare.png)、[320原货架五星](candidate/320-group-shelf.png)。
- [390已养成实例×1.6损失](candidate/390-group-growth-cost.png)。
- [390潜力/已发生记录/新牌未参与](candidate/390-flush-detail-summary.png)、[PC同说明](candidate/1366-straight-detail.png)。手机详情正文需自然滚动，固定取消/比较按钮可达；不称所有文本首屏全露。
- 初轮[偏长的手机解释](first-verbose/390-flush-detail.png)保留；看图后只缩短首层，完整限定移至细则。该轮为未提交工作区，不冒称冻结SHA截图，原[报告](first-verbose/report.json)与[全量记录](first-verbose/full-state-journal-storage.json.gz)保留。没有测试断言FAIL；这是本代理发现的可读性待改，不是用户拒收记录。
- 全部原图/报告/日志[SHA256清单](sha256.json)。65张截图包含初轮1张及两版本各32张，不以截图数量证明整屏美学。

复现命令：

```sh
npx vitest run tests/shop-recommendation-evidence.test.ts tests/shop-recommendation.test.ts tests/shop-recommendation-c2.test.ts tests/shop-recommendation-c07.test.ts tests/shop-post-purchase-condition.test.ts tests/shop-offer-guidance.test.ts tests/shop-route-relations.test.ts tests/shop-current-decisions.test.ts tests/shop-sale-continuation.test.ts tests/build-journey.test.ts tests/build-journey-dialog.test.ts
npm run build
node scripts/check-production-plan.mjs
node scripts/check-production-plan.mjs --self-test
RECOMMENDATION_OUTPUT=/tmp/recommendation-frozen node harness/recommendation-evidence.mjs
RECOMMENDATION_ROOT=/tmp/dachoupai-recommendation-baseline RECOMMENDATION_BASELINE=1 RECOMMENDATION_PORT=5487 RECOMMENDATION_OUTPUT=/tmp/recommendation-baseline node harness/recommendation-evidence.mjs
```

剩余：父独审、玩家是否理解/偏好此保守五星方案、可发五星的统一成本门槛、f06等五机制的完整价值校准、真实替换后的经营收益、dot三路线自然试玩、物理设备和整体美学均OPEN。本批只修证据正确性和局部可读性，不标推荐指数整体完成。最终HEAD、draft PR和精确CI由提交后工具回执交付，不合并。
