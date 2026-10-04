# P08 工具包入口 review

最新仅smoke合同修正 bb62c1f6e28cd8315493f0161eaed032e2e9e369。原精确CI37223525814的失败是真实的旧四动作列表断言，实际新增已授权工具包；原FAIL与[日志摘录](ci37223525814-failure-excerpt.txt)保留。严格列表改为五动作，增加库存开/关全存档及选牌保持，未改其他断言或timeout；src/tests/assets/art全部同父已批准bd3840d。本地原smoke Chromium桌面/手机通过且source/index/HEAD未变，三引擎新精确CI仍需单独报告。

[失败定位与处置](ci-failure-resolution.json)

最新main对齐源码 db00121942e191112d6b8e0268ca0e5503e9df9f，正常合入 2d999cd938e5c19253daa8ddbd1cf25facf2d9e4。保持已发布朱砂火、头像锚点和跨档消费，仅把工具包按钮加入保护mask。46专项/type及一次320原生计分、工具包命中/关闭、命名通过；未重跑设备矩阵或14牌。

[当前整合证明](ink-main-alignment.json) · [当前原生记录](aligned320-browser.json)

[计分与入口完整页](aligned320-ink.png) · [商店](aligned320-shop.png) · [牌桌](aligned320-game.png) · [空态](aligned320-empty.png)

以下保留前轮字面与原始入口证据：

最新字面修正源码 9c8e22d8d364b6c4de3a3137996aa7e1a8ef8ddc。两场景库存入口、弹窗标题与空态统一叫“工具包”；商店商品分类仍“工具”。不改布局或颜色。

16 项相关单测、typecheck 与单次320px原生流程通过。文字实测71×17px，完整落在商店88×44及牌桌112×44入口内；按钮/字体/商品/预览/整页逻辑几何同旧版1354。新图均actual view：

[copy320-shop.png](copy320-shop.png)
[copy320-game.png](copy320-game.png)
[copy320-empty.png](copy320-empty.png)

[修正记录](copy-clarification.json) · [原生记录](copy320-browser.json)

父已实际看旧版 game320/shop390/game844 bottom34，入口位置和手牌空间通过；因商店分类与库存同名，提出本次字面修正。新320图供父检查；CI由父跟进，main未推。

首次入口实现0d21cd4，正常合入main7d44后的实测源码1354a808ae98e04ec21482f96c8587c4d9ee394c。其93单测/type、四视口原生流程和8场景完整页＋1空态图继续留作原始证据，不称本次四视口重测。

14牌竖屏必要待出牌视觉避让仍只有单测；safe34短横进度线上移4px的旧限界保留。合法导入样板；非自然连续获取、真机/GPU/听感验收。

[原始验证](browser.json) · [摘要](summary.json) · [保留失败](retained-failures.json)
