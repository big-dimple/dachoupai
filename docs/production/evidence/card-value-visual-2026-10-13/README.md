# 卡牌价值视觉小批接入

基线 `2ef9180c066308e06d7d09850983ea469aa67fd8`，产品/测试冻结 `0437e401`；最终交付 SHA 与 CI 在草稿 PR 中绑定。承接 PR145 第二轮的人物优先与信息分轴，不继续扩原型，也不把原型的展示星值搬进产品。

## 行为与范围

- 实空五颗星直接消费现有 `shopOfferGuidance().stars`；普通档青蓝，只有原算法给出5星时出现100×18px以内的旧金推荐小条。没有新星级、配额、保底或新判定。
- 货架外框只读取定义稀有度：普通薄墨、特别青蓝短角、稀有朱红短角；原稀有小签保留。原推荐指数不改变外框颜色。
- 货架路线从外框移到原画左上小签，取原 `routeFitCue`；没有改路线匹配算法。持有卡与其它商品的旧路线呈现保持。
- 连环读取现有 `recommendation.combination` 的“组合潜力”行：尚缺→缺源、需要核对→待核、其余潜力→可搭。具体原文保存在标记 fullText，原购买详情仍沿原推荐说明。“上手组合记录”不生成潜力标记；标记不声称已经触发或收益保证。
- 手机卡面推荐区54→24px，星行仍在本卡底部，人物区增30px；原卡位、价格、点击目标及菜单操作不动。无新按钮、新画像或大色块。

产品仅 `src/game/ShopCardValueVisual.ts` 与 `ShopScene.ts` 的货架画图调用、`drawOfferCard`/`drawOfferStars`/新增`drawOfferFaceMarks`/`markBuildOffer`。未改 `inspectOffer`/`inspectReplacement`/`inspectJoker`/`purchaseReason`/`send`。与并行交易任务共同文件的接点限以上绘制段。

原 `ShopRecommendation.ts`、`ShopOfferGuidance.ts`、路线关系、计分/价格/供给/RNG/正常保存、结算/选角、资产、依赖、工作流、DELIVERY_PLAN与plan.json均保持。没有添加旧存档兼容代码。`scope.json` 记录保护树与交易方法逐段哈希。

## 可复现检查

```sh
npm run typecheck
npx vitest run tests/shop-card-value-visual.test.ts tests/joker-rarity.test.ts tests/shop-recommendation-evidence.test.ts tests/shop-recommendation-c2.test.ts tests/shop-recommendation-c07.test.ts tests/shop-offer-guidance.test.ts
CARD_VALUE_OUTPUT=/tmp/card-value-product node harness/card-value-visual.mjs
```

需仓库现有依赖及 `/usr/bin/chromium`。脚本启动本地 Vite e2e，用正常菜单导入两个**受控、合法、当前身份**的公开状态，只看货架/详情/取消，不打整局。不在玩家界面放测试说明，不冒称自然获取。

- 普通练对子4星、稀有包场2星、回声越来越近2星且真实缺重触来源。
- 原受控20牌与已持来源使再说一遍/返个场/独家戏均为既有5星；这些星来自现有算法，不是PR145的假展示数据。
- 320×740、390×844、1366×900，各两状态。before/after 的每条推荐星数、条件与组合说明逐条相等。
- 五颗实空星完整留在本卡，颜色只分推荐档；稀有框与标记逐身份核验。
- 每件查看/取消、缩窗再恢复的完整state/journal/IDB/localStorage均与初始完全相等；send=0，原购买/比较按钮可达，无JS错误。只验证查看，不冒称新交易验收。
- 37项/6文件定向通过，typecheck通过。保护树与交易方法未改。原CI自动全库结果另按最终SHA报告，不把局部图审当完整游戏通过。

## 实际截图

| 尺寸 | 原main同输入 | 接入后三反例 | 接入后既有五星 |
| --- | --- | --- | --- |
| 320 | [原图](before/320-counterexamples-shelf.png) | [三反例](after/320-counterexamples-shelf.png) | [五星](after/320-five-shelf.png) |
| 390 | [原图](before/390-counterexamples-shelf.png) | [三反例](after/390-counterexamples-shelf.png) | [五星](after/390-five-shelf.png) |
| 1366 | [原图](before/1366-counterexamples-shelf.png) | [三反例](after/1366-counterexamples-shelf.png) | [五星](after/1366-five-shelf.png) |

另有各尺寸缺源/五星购买详情图。执行者实际查看了320三反例、390五星/缺源详情与PC两状态，核了人物、完整星星、小签、原价格/动作。`artifact-index.json` 固定截图哈希，`after/report.json` 绑定运行源码哈希与产品提交，完整状态在每组 `full-state-journal-storage.json.gz`；这些是受控软件截图，不是实体手机或自然局。

## 原失败与边界

`failures/` 保留首观察器误期待详情展示完整潜力原句（旧详情只展示短缺源理由）、满槽误找“取消”（应先返回购买详情）、对Graphics误调用getBounds，以及findLast超现有TS库/无效类型比较失败。后续改观察路径/读取Graphics声明边界、使用现有库方法；未改交易流、推荐算法或放宽星数/保存相等断言。

这只是一批商店货架视觉接入。持有卡/游戏内卡/整屏布局不在本批；五张图或绿CI不证明自然五星频率、推荐全局校准、所有卡都已有组合提示、玩家理解、实体设备、性能/听感或整体体验验收。不合main、不部署，交父审集成。
