# 批量玩家文字出口保障

基线 `e389ea2c4a7f6d49284546f91992d13055072655`，独立分支 `dev/tool-copy-boundary-audit-20261017`。用户明确要求批量统一全部可见旧名称，本批新增展示层兜底，不把用户现场报告签成已定位或归因缓存。

## 实现边界

`PlayerFacingText.ts` 统一调用既有 `Brand.playerText`：

- 在 `main.ts` 创建游戏前安装 Phaser Text 的 `setText` 适配，覆盖创建和后续更新，包括场景直接 `add.text` 的文字。
- 观察本页 DOM 的新节点、正文变化和 `title` / `alt` / `placeholder` / ARIA 展示属性，覆盖购买、工具包、目标选择、确认、结果、图鉴、摘要及延迟追加的说明。
- 只改渲染字符串，不写规则对象、存档、实例 ID、协议键、URL、表单值。`script/style`、原始导出/代码文本 `textarea/pre/code`、可编辑输入和显式保留原文区不做正文替换；它们是技术原文，不是卡牌说明出口。

没有改 ShopScene、GameScene、DetailDialog、音频、资源清单或图片。`r2PublishedContent.json` 及其 hash 输入保持原字节；保存工具只含 `instanceId/definitionId`，没有描述字段，见 `checkpoint.ts:774`。旧局描述在显示时重新投影，使用结果由 `SavedToolResult` 根据前后状态重新生成。

## 线上版本与递归命中

本机只读 GET `https://pai.hp666.cc/` 与版本文件均 HTTP 200：revision 为上述 e389，builtAt `2026-10-17T11:49:27.743Z`，dirty 仅 `package-lock.json`。首页实际引用 `assets/index-Jf_Uhwhc.js`，SHA256 `0f8cf0957c88b3ed01f0605c7bafa2d7d5621663f22d65cf01f0ca8aa743b3d1`。这是本次实读的线上脚本，不代表已拿到用户那一页的运行脚本。

递归 `src/public` 共 **7 文件、37 行、40 处**旧词命中：

| 分类 | 文件 | 处数 | 处理 |
| --- | --- | ---: | --- |
| 冻结规则输入 | `r2PublishedContent.json` | 16 | 保字节和 hash；显示出口替换 |
| 冻结牌定义 | `r2-jokers.json` | 3 | 同上，JokerPlayerCopy 已投影并由新出口兜底 |
| 冻结 Boss / 挑战 | `r2Chapter.ts` / `r2Modes.ts` | 11 / 2 | 同上 |
| 更名匹配表达式 | `Brand.ts` | 2 | 必须保留才能识别旧词，不显示给玩家 |
| 源码注释 | `src/run/shop.ts` | 1 | 无运行时文字出口 |
| 资产用途元信息 | `asset-pack-v1.json` | 5 | 无工具文案渲染消费者，不盲改来源记录 |

线上 bundle AST 的 **15 个**含旧词字符串节点全部对应冻结数据：2 个内嵌 JSON、13 个已知冻结规则字符串；未分类节点 0。S06/S07 的奖励、受赠、槽位及库存说明实际节点已是“唐宋牌”。完整字段路径、偏移与正向新词证据见 [source-and-live-bundle.json](source-and-live-bundle.json)。不能把 bundle 中存在冻结旧词直接判成可见文案缺陷，也不能据本次检查否认用户报告。

## 实际渲染聚合与存档

[summary.json](summary.json) 汇总 **189 个展示视图，正文旧词 0、展示属性旧词 0**：

- PC1366 / 触屏390 × 孤注S06、谢幕镀彩S07，4 条真实菜单导入→购买详情→购买后说明→工具包→选目标/确认→使用结果→冷恢复路径。确认前完整 state/journal/存储槽不变；确认后与领域命令结果一致，冷恢复不复活工具。不是自然供给或物理手机验收。
- 39 件工具及 20 个有效旧规则身份 × S06/S07，共 79 组生产详情组件；S07 还选择牺牲牌和受益牌后检查。含展开规则、HTML 与 ARIA。[逐项报告](native-and-components.json)
- 39 件工具＋12 件长期物品的 51 个真实图鉴详情，以及 12 件长期物品详情，含采购证 U10。[逐项报告](dom-aggregate.json)
- 强制把冻结旧描述和采购证/孤注/谢幕镀彩旧词追加到已打开弹窗，正文和提示属性均被统一为“唐宋牌”，原始 JS 数据、JSON 原文、输入值保持不变。另在真正 Phaser Text 上验证初建和数组 `setText` 更新均正名。这是明确的出口回归注入，不伪称用户现场复现。

实际图片：[S07 PC购买](1366-S07-purchase.png)、[S07手机确认](390-S07-confirm.png)、[S07实际结果](1366-S07-result.png)、[S06手机结果](390-S06-result.png)、[采购证详情](1366-U10-item.png)。原始布局/字体问题没有在此批修订。

## 窄验证与剩余定位

4 文件 **30 项通过**：`player-facing-text`、`tangsong-player-terms`、`c01-tool-info`、`saved-tool-result`；生产 build 通过。两处旧名称测试预期同步当前正名，机制断言未放宽。所有源指纹与聚合数字见 summary；没有重跑长局或无关全量测试。

用户实际旧词的原始运行版本仍未取得。本批完成批量出口保障，仍不宣称已找到其具体触发源；后续可对照该页菜单版本号与脚本 URL 精确定位。没有 main / CI / 部署操作。
