# 商店道具连续操作：取消恢复与固定目标说明

基线为最新拉取 main `2ef9180c066308e06d7d09850983ea469aa67fd8`，独立分支 `fix/shop-tool-repeat-20261013`。产品及首版局部观察器提交 `14904f2dc21535be4314b9b11d6a51d7e18c201b`；观察器PC入口补正提交 `0259e65e40a365a7acd422767b3b298fb1e4aff5`，三产品文件字节保持14904f2d。本批不修改唯一执行计划，交父整合；不合并、不推 main、不强推。

## 已核现有实现

旧目标选牌跳动已修，当前两端选第31个目标均保持滚动和键盘焦点。手机实测为 `624→624`，PC为 `0→0`。现有买来存着、买来使用、常驻道具箱均继续复用，不重做它们，不修改交易、价格、工具效果、牌池、推荐外观、英雄或计分。无存档迁移或清空操作。

## 本批可复现缺陷与最小修复

- [基线报告](before/report.json)：390基础自选T11取消后列表滚动 `554→0`，触发卡焦点丢失；已有T08取消后 `owned→purchase`，触发卡焦点丢失。1366购买取消和已有工具取消也丢失卡片焦点。
- `MakeCardsDialog.ts` 保存当前列表分类、各分类滚动与触发卡ID；`ShopScene.ts` 持有仅本商店场景内的视图状态。取消、Escape、重开列表恢复可用的原卡焦点与可用滚动位置；卡已消费/售罄时不聚焦失效卡。新进入商店重置视图状态，保存格式不变。
- 根同版自然操作补报葫芦星顶部“选已发现牌型”，实际固定唯一葫芦目标。源码确认 `discovered-hand` 固定/可选共用这句。`ConsumableDialog.ts` 仅分清固定分支，改为“固定牌型 · 无需选择 → 确认使用”；练一招保留选牌型，小红包当前已经写“无需选牌”，不重复修无目标工具。

## 验证范围

观察器 [harness/shop-tool-repeat.mjs](../../../../harness/shop-tool-repeat.mjs) 使用原生菜单导入合法受控当前身份存档，软件Chromium、DPR1、390×740触控与1366×768鼠标/键盘；仅商店局部操作，不跑整局，不扫种子。

原始完整 state/journal/IndexedDB 记录保存在各目录 `full-state.json.gz`，简报不替代全账。每次查看、选择、取消比较完整保存；真实购买和使用按实际journal命令重算 `applyCommand`，比较完整state与当前checkpoint。买存后页面刷新从正常菜单继续，保留完整保存；常驻道具箱直接可见未消费工具。最终报告另包含买来使用后的取消保留工具、固定P07/无目标T16/可选T01的控件及步骤说明检查。产品源码在最终观察前后做SHA256相等检查。

最终有限验证结果：

| 范围 | 结果及原始记录 |
|---|---|
| 390手机局部链 | [原报告手机case PASS](pc-entry-observer-fail/report.json)，source14904f2d；该报告的汇总FAIL是随后PC观察器错找入口，原FAIL保持 |
| 1366 PC补正局部链 | [最终PC PASS](after-pc/report.json)，source0259e65e；产品SHA256与手机完全相同，前后源码不变 |
| 购买/目标取消与Escape | 手机基础自选 `554→554`、T11焦点保持；已有工具 `owned→owned`、T08焦点保持；PC两个原卡焦点及位置保持。完整保存均不变 |
| 实际支付与消费 | 两端30金→存随机工具26金（journal1），确认使用仍26金（journal2），基础买来使用24金（journal3）；快用取消保留未消费工具。每笔按原实际命令逐字段相等，无重复保存或消费 |
| 刷新继续/入口 | 两端买存后冷继续完整state/journal/storage相等；手机常驻道具箱直接进入，PC常驻道具·库存→固定道具箱按钮，工具完整可见，无须深层滚动 |
| 固定/无目标/可选说明 | 两端P07无select且明确固定，T16无select且明确无需选牌，T01有1个牌型select。查看与取消完整保存不变 |
| typecheck/定向 | [typecheck PASS](logs/typecheck.txt)；[53项/6文件原断言在本地30秒CLI限时PASS](logs/targeted-30s.txt)。默认5秒失败明确保留，未改仓库配置，不称默认限时本地PASS |

已实际查看手机[恢复位置](pc-entry-observer-fail/390-purchase-cancel.png)、[恢复已有工具](pc-entry-observer-fail/390-owned-cancel.png)、[冷库存](pc-entry-observer-fail/390-cold-inventory.png)、[固定P07](pc-entry-observer-fail/390-instruction-P07.png)、[无目标T16](pc-entry-observer-fail/390-instruction-T16.png)、[可选T01](pc-entry-observer-fail/390-instruction-T01.png)、[买来使用待确认](pc-entry-observer-fail/390-immediate-use-pending.png)，以及PC[取消恢复](after-pc/1366-owned-cancel.png)、[冷库存](after-pc/1366-cold-inventory.png)、[快用待确认](after-pc/1366-immediate-use-pending.png)、[固定P07](after-pc/1366-instruction-P07.png)实际像素。确认/取消可达、文案可读，沿原资产和布局。图像/浏览器检查不是物理设备、人类理解、自然获取、全部39工具、正式域名或整局体验验收。

## 原始失败与观察器修正

1. 首轮受控夹具在起手筹备时改库存，存档校验拒绝 `invalid-save-opening-state`。改为先执行原有 `RerollShop` 再构造受控库存；不放宽校验。抛错后出现esbuild退出栈，属观察器初始化失败，无产品操作。
2. [首次导航FAIL](navigation-fail/report.json)：`page.goto` 等待load超过15秒。后续只将资源导航改为domcontentloaded/120秒，原实际操作15秒等待及产品断言不变。
3. 一次启用软件WebGL的加载长期占用CPU，手动终止本观察器及其遗留浏览器，改用仓库已有的 `--disable-gpu --disable-software-rasterizer` Canvas方案。此轮未生成产品操作结果，不能算产品FAIL或PASS。
4. [首次冷刷新导航FAIL](reload-navigation-fail/report.json)：取消恢复与买存已通过后，`page.reload` 等load超15秒。保留原图、完整账与失败；刷新资源导航采用同样domcontentloaded/120秒，继续/交易/保存断言不变。
5. [PC入口观察器FAIL](pc-entry-observer-fail/report.json)：手机完整局部链PASS；PC取消恢复/买存/冷继续PASS后，观察器误找仅手机存在的 `action/tool-inventory`。按PC原生常驻 `action/make-cards` → 固定底部“道具箱与长期物品”补正观察器，产品文件不改；保留失败与手机PASS原身份，不把汇总FAIL抹成汇总PASS。
6. [原限时定向FAIL](logs/targeted-timeout.txt)与[单worker原限时FAIL](logs/targeted-single-worker-timeout.txt)：未修改的 `tool-inventory-entry` 桌面布局循环共1,728组（3宽×6高×4上安全区×4下安全区×3侧安全区×2持牌数）在本环境耗时约25.6/14.2秒，超过默认5秒；其他断言通过。后续仅本地CLI用30秒限时跑完整原断言；仓库测试/配置和CI的默认5秒合同不改，不能把本地30秒通过称原限时通过。

最终精确交付SHA及GitHub CI链接由本批Draft PR和交付回执绑定，不引用旧绿CI代签本批。
