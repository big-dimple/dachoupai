# f06有限四次推荐：最小产品修复

父明确裁定输入：新购f06正常条件统一2星，不因第6章起自动升3；章节计分停用／B16封禁仍1星，在现有短语位置直写“限4次”。本轮从当前main **ee59f1ed295c64b390de9f786c4ceca2ba40b715** 新建独立产品分支 `fix/f06-four-use-recommendation-2026-10-13`；PR147五机制分析保持独立，未混入它的文件。

产品只有 [ShopRecommendation](../../../../src/game/ShopRecommendation.ts) 一行变化：`temporary-multiply` 返回2星，reason为“限4次”，原第4次出牌后销毁条件保留。原章停用与B16判断仍优先返回1星。现有短语、五完整实空星、购买摘要自动读取它，不新增控件或长免责文案；未修改Scene/CSS/卡面、计分、价格、四次寿命、跨场计数、倍率、英雄、目标或总计划。其他四代表机制不改产品。

## 当前有限验证

- 新增9项专项；第1/2/5/6/8/13章分别检查当前C2与已审计旧身份。两套都2星＋“限4次”；Q11章停用在第5/6章仍1星，合法第8章B16仍1星；原a06/b06/a11五颗实星保持。
- 上述专项加原shop-recommendation-evidence、shop-recommendation、shop-recommendation-c2、c00-score、c03-boss-score：**119项／6文件PASS**。原计分回归核第四手本体×2仍有效、afterHand销毁、封禁不暂停计数；跨场计数所属领域树逐字节未变。typecheck、32工作包计划门、diff检查通过。
- 初次多补无尽第13章输入缺normalCompletion资格，118项通过／1项夹具FAIL，保留 [失败日志](first-failure.txt)。为明确标注的受控投影补齐最小普通八章资格与Boss账，未修改产品规则、未放宽不变量；随后全部PASS。这不是自然八章通关或自然无尽。
- 页面观察器正常菜单导入同一受控第6章checkpoint，实际鼠标／触屏打开现货→购买详情→取消。PC1366×768、390×844、320×640，main三例与候选三例共 **6/6 PASS**；每例完整state/journal/storage/localStorage前后相等、send=0、错误0；同viewport的main与候选四类完整保存亦相等。只读观察不是实际购买或自然经营。

产品／候选截图冻结 **fd69db9460c0ccd681dc4f6d1c58e6e07b44627b**，src树 **31230b234546c1965e1b68a2bbbcdf5550339a34**。基线截图用原main ee59，src树16a37d0fd8906c4f5660db124495432a0a38faf8。报告、观察器和夹具哈希及完整保存gzip分别位于 [baseline](baseline/report.json)、[candidate](candidate/report.json)，期间src未修改。最终交付SHA及对应CI写入草稿PR描述，最终提交只在冻结版之上增加证据。

## 实际截图

原始PNG共14张，全部按自身SHA归档；不覆写已合PR143或独立PR147证据。已人工核对候选七张与基线390购买图：

| 尺寸 | 当前候选货架 | 当前购买判断 | 对照／边界 |
|---|---|---|---|
| PC1366 | [两实三空＋限4次](candidate/1366-shelf.png) | [完整真实首屏](candidate/1366-purchase-first-screen.png) | [main三实二空](baseline/1366-shelf.png) |
| 390 | [五颗完整实空星](candidate/390-shelf.png) | [限4次真实首屏](candidate/390-purchase-first-screen.png) | [main购买首屏](baseline/390-purchase-first-screen.png) |
| 320 | [五颗完整实空星](candidate/320-shelf.png) | [滚动到摘要，星／限4次完整](candidate/320-purchase-summary-scroll.png) | [真实首屏](candidate/320-purchase-first-screen.png)摘要位于下方，保持既有滚动布局，不能把滚动图冒称首屏 |

货架星字14px、五个独立全实／全空字形保持，均在本卡区域内。手机窄货架原本不绘旁侧短语，购买判断显示“限4次”；不为短语挤星或改布局。成熟手绘与原稀有印签、路线说明保留。规则层已说明第4手仍加成、计分停用仍扣次数、换场不重置；本轮未改这些规则。

复现：`F06_OUTPUT=/tmp/f06-candidate node harness/f06-recommendation.mjs`；基线工作树使用同观察器／夹具，加 `F06_BASELINE=1`。运行记录及测试／类型／计划日志见本目录，文件SHA256见 [sha256.json](sha256.json)。

交父独审，保留draft、不合并／部署。自然试玩由父负责；本轮不签自然寿命收益、物理手机、整体平衡、其他四机制净推荐或全局五星覆盖。
