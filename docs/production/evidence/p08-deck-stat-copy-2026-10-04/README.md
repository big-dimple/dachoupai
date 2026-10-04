# P08 点数计数文案补正

实际源码 60641fb2ef131f7d9dd984de79b6f5df3753ee08，基于 review 8f606ec217620d9ec661ac9ac44b9220c747f884。仅把“4 4”样式改成“A：4张 · 10：4张”；每项独立 inline-block／nowrap，保持15px，320可多行随正文滚动。统计／筛选逻辑、固定关闭、菜单和场景所有权不改。

五项既有统计测试、typecheck、一次 clean e2e 构建通过。四个原生查看案例（Game320／390／短横，Shop390）21筛选组合通过；每个13单元实际只有一个文本rect，字体15px，溢出正文wheel到底／回顶，关闭>=44px并固定。开筛关完整run／seq／RNG／两牌选中不变。

三张最终完整页均 actual view：[320完整13项](320-rank-count-units.png)、[390商店](390-shop-rank-count-units.png)、[844短横](844-short-rank-count-units.png)。320只补滚动构图，复用同一构建，不改产品；首次21项验证在 initial-bounded-checks.json 原样保留，补图检查在320-frame-followup.json。

样板直接消费原 review 的验证存档，通过原生导入；不重跑工具使用／自然流程矩阵。前批 [原报告与FAIL](../p08-deck-inspector-2026-10-04/README.md) 全目录逐树保持，图片不改身份。新文件 browser.json 是四案例加最新320构图的集合，source／build与freeze均为本批身份。

checker.mjs 是最终实际检查器；复制到 clean 60641fb2ef131f7d9dd984de79b6f5df3753ee08 下 shots/p08-deck-stat-copy/verify.mjs 后运行。默认四案例；STAT_SKIP_BUILD=1 STAT_WIDTHS=320 是同构建补图路线。只读DOM／Phaser观察，所有操作为原生输入。

仅review，新精确CI另报；未push main或部署。P08整体／真机／GPU／听感未通过，C04暂停及V01/L01保持。
