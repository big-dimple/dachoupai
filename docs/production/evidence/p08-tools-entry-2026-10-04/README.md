# P08 工具包入口 review

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
