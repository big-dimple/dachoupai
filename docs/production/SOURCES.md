# 证据与外部参考

## 固定仓库基线

[审查提交](https://github.com/big-dimple/dachoupai/commit/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e)

[该提交CI及实际日志](https://github.com/big-dimple/dachoupai/actions/runs/36711575856/job/109874375123)：2026-09-30，Node22、npm install、typecheck、9文件45测试、build成功。没有完整浏览器流程/素材验收。日志不是本审查环境亲自重跑的结果。

以下均为不可变提交路径，复查时不要把main最新内容误当旧证据：

- [旧AGENTS](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/AGENTS.md)：权威层级和旧执行协议。
- [旧GDD](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/docs/GDD.md)、[旧handoff](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/docs/development-handoff.md)：原设计与宣称完成/下一步。
- [scoreHand](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/scoring/scoreHand.ts)、[handEvaluator](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/cards/handEvaluator.ts)、[JokerEngine](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/jokers/JokerEngine.ts)：分组计算、集合、默认装备与类型断言。
- [GameScene](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/game/GameScene.ts)、[main](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/main.ts)：状态/抽牌/生命周期、FIT硬布局。
- [RunState](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/run/runState.ts)、[shop](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/run/shop.ts)、[ShopScene](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/game/ShopScene.ts)：持久字段、池和经济入口。
- [EffectQueue](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/core/EffectQueue.ts)、[SeededRng](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/core/SeededRng.ts)：来源摘录探针和随机快照缺口。
- [balance.test](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/tests/balance.test.ts)、[scoreHand.test](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/tests/scoreHand.test.ts)：机器人差异和旧语义断言。
- [浏览器冒烟](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/harness/screenshot.mjs)、[旧CI](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/.github/workflows/ci.yml)、[旧发布脚本](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/scripts/release-checked.mjs)：覆盖范围与发布纪律。
- [角色定义](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/game/characters.ts)、[BootScene](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/game/BootScene.ts)、[portraits](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/src/game/portraits.ts)：原PNG加载路径与缩放约束。
- [资产检查器](https://github.com/big-dimple/dachoupai/blob/9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e/tools/blender/inspect_asset_pack.mjs)：技术校验、默认写manifest和预算。目录API元数据用于六原PNG字节合计，未据此推断图像美丑。

## 外部一手参考（2026-09-30查阅）

[Balatro官方Steam页面](https://store.steampowered.com/app/2379780/Balatro/)：扑克手牌、Joker协同、弃牌和关卡、重复游玩的官方产品定位；页面列150张Joker，仅作范围参照。本计划没有亲自跑Balatro的基准任务，不伪造体验测量。

[Balatro官网](https://www.playbalatro.com/)：产品与品牌参考。奖励数量不作为本审查判断依据，不必争论获奖多少才能确定好手感需要验证。

[Phaser官方Scale Manager文档](https://docs.phaser.io/phaser/concepts/scale-manager)：FIT保留宽高比并可能留空，RESIZE改变可用画布。更换模式不自动修复硬编码布局。

[Playwright官方Emulation文档](https://playwright.dev/docs/emulation)：viewport/UA/hasTouch等模拟参数。单纯设置模拟参数不能替代实际触控操作和目标真机验证。

这里的来源支持事实与工具行为。RULES数值、72牌设计、设备预算、样本量和工作包均为本次制定的项目方案，不假托外部官方背书。
