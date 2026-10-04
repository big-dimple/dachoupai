# P08 14牌竖屏验收与计数修复

当前合并源码 `a2a21079b0308e1423babe022383f9142be54558` 已正常无冲突合入 main `f10d2d0a6c1f80b199bfeef7272f60b5c962a7ca`。父已实际看以下两图并读最小diff，修正局部通过；320十四仍分页可逐张操作，390两行全14，普通九牌一页合同保持。59相关/type与有界几何检查通过；素材等于新main（工具15/39），两图保持原字节和源码身份，未重拍。

[本次正常合入证明](main-alignment.json)；新review精确CI待报，main不推。以下为原生图及检查的原始记录：

基线 `7b78777347dd854f5759870c7934b8c28279889e`，实际检查/构建源码 `fccddf7f9ecff3f61f9bc696ac93b92a6a68e554`（modified=false）。使用 validator-approved 原生存档导入的14张手牌、2/3工具容量 fixture，非自然获取。仅320×568与390×740，DPR1软件Canvas。

320原生选择J后，其点数与窗口计数重叠8px：[原FAIL](first-failure.json)保留。仅GameScene.updateHandCount把原计数/页码分为两行，移到已有工具包左侧空白；14px字体、卡位、命中、工具包、出弃和待出区几何不改。320初始layout逐值等于基线实际layout；未改ShopLayout。

修复后两档全部14张逐一原生选择/取消通过。320原窗口5张、10个起始页遍历全14，390两行全14；点数花色>=14px且完整无遮挡。选满5张后，工具包/待出区/出弃无相交；出弃实际touchStart命中其按钮，取消不提交。工具包真实开/关保持5张选择和完整run/RNG。55相关tests/type通过，一次构建及本有界检查期间source/index/HEAD一致。

两张完整页已实际view，父独立图审待接：

- [320×568完整页](320-fourteen.png)
- [390×740完整页](390-fourteen.png)

[摘要](summary.json) · [全部bounds与命中](browser.json)

可从仓库根执行 `node docs/production/evidence/p08-tools-fourteen-2026-10-04/reproduce.mjs` 复现，仅这两档。该检查器为现有harness/domain/checkpoint方法的有界组合；默认需要当前环境系统Chromium，无安装或新增依赖。

只推独立review并取新SHA精确CI，main待父串行放行。72/72 Joker、工具9/39、道具12/12及全部素材保持；六工具实际目标/确认/消耗验收排队为下一任务。本轮没有自然完整局、视频/FPS、GPU、真机或听感结论。
