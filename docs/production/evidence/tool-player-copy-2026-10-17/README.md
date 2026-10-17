# 长期物品持续范围与孤注显示审查

基线：`179e17414aa9dbae67dfa33dc991c2a298895223`；独立分支 `dev/guzhu-player-copy-20261017`。产品只改 `src/game/r2ToolInfo.ts` 的长期物品展示文案，不改领域规则、冻结内容、存档、场景布局或共享弹窗接口。

## 加演许可的真实规则与修正

U03 购买后留在本局 `longTermItems`，每次入场重新计算出牌预算，没有单次消耗。原首层“下一场入场出牌次数+1”没有表达后续场次仍生效，现为：**从下一场起，本局每场出牌次数+1；当前场次数不变。**

真实代码依据：

- [U03 定义](../../../../src/content/r2-tools.json#L2158)：`hands-limit: 1`，`readAt: stage-entry`，`lifetime: run`，不可重复、不可出售。
- [购买加入持有列表](../../../../src/domain/r2Run.ts#L687)。
- [持有物品增益和出牌预算](../../../../src/domain/r2Resources.ts#L12)：每次根据当前持有 U03 加 1。
- [实际入场](../../../../src/domain/r2Run.ts#L320)：读取预算后写入本场 `initialHands` / `handsLeft`，当前场固定。
- [连续两次入场回归](../../../../tests/c01-economy.test.ts#L133)：真实购买、入场、过关、开店、再次入场，U03 仍持有且两场初始出牌均为 5。

另将其余长期物品首层写清本局范围：U01/U02 从下一场起每场生效，U07 购入即生效，其他保留每次结算、后续开店/刷新、每店首次、每章一次等真实触发条件与次数。未改机制或分类。

| 画面 | 修改前 | 修改后 |
| --- | --- | --- |
| PC 1366×768 | [before](before-1366-U03.png) | [after](after-1366-U03.png) |
| 手机 390×844 | [before](before-390-U03.png) | [after](after-390-U03.png) |

## 孤注仍开放，未签成已修复

用户 11:32 所见旧词未在本地基线复现，原因未定位，不归因于缓存。`4b0de064` 与本基线的 `r2ToolInfo.ts`、`ConsumableDialog.ts`、`ShopScene.ts`、`Catalog.ts`、`DetailDialog.ts` 内容 SHA256 分别相同。

已实际打开 PC / 390 手机道具箱的 S06 使用页及展开细则、动态稀有池、图鉴；PC 另打开购买详情。所有文本均为“唐宋牌”，无“大丑牌”。另逐一渲染全部 **39 件**生产工具详情组件并展开规则，均无旧词。范围和逐项 DOM 文本保存在 [before.json](before.json) / [after.json](after.json)。这是显示审查，不代表自然获得、实际消耗或物理手机验收。

实际画面：[基线孤注使用页](before-1366-guzhu-use.png)、[PC 购买详情](after-1366-guzhu-purchase.png)、[PC 图鉴](after-1366-guzhu-catalog.png)、[390 手机使用页](after-390-guzhu-use.png)。本批未为未复现问题虚构修复。

## 验证与边界

`npx vitest run tests/c01-tool-info.test.ts tests/c01-economy.test.ts tests/tangsong-player-terms.test.ts tests/c01-spectral.test.ts`：**4 文件 / 105 项通过**；`npm run build` 通过。两处旧名称预期同步为当前名称，未放宽规则断言。旧规则集的显示投影及存档兼容检查通过。

按需显示审查：`node harness/tool-player-copy.mjs --before` / `node harness/tool-player-copy.mjs`。前者仅在 Vite 加载 `r2ToolInfo.ts` 时使用上述基线原文件，其余仍是同一分支源码；后者使用当前文件。全部操作经菜单导入受控合法存档、真实鼠标/触摸点击；查看/返回前后完整 state、journal、存储槽一致，未确认购买或使用。

冻结 `src/domain/r2PublishedContent.json` SHA256 仍为 `47d2b0b0abcc923dc3495bd9059948bf3b8bf279a3da9f11b91696504421dc5f`。`src/content/r2-tools.json`、`r2Resources.ts`、`r2Run.ts` 无改动。未操作 main、CI、域名或部署。
