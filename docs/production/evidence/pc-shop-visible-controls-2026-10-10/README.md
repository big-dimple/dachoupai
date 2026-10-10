# PC商店透明商品与常驻外框

输入main `485b750217717e539806909ff7150f6476ec1a90`；产品 `c5145ebea6fec4a731866c3a20d817248cc7a36a`。有限软件候选，父独审／用户PC验收待核。6.1 Medium串行，无新依赖／图／音／规则。

## 实际复现与修正

1366×768原生阿默首店固定seed group-natural-17；对已有真实商店做一次受控scene restart，立刻用真实鼠标移入基础自选命中区，在入场淡入完成前触发hover。淡入先把商品容器alpha设0；hover取消同容器动画但未恢复alpha，900ms后仍为0，内部文字alpha1且visible=true。命中矩形独立于商品画面，透明时仍能打开基础自选详情；取消后完整state／journal／storage不变。不是新存档或网络缺图猜测。未证明用户那次具体鼠标时间；本复现为同源可重复机制。

上一main1b258bc与当前485b750的hoverCard原文SHA256均为 `40356ad1512aa6179b3263a5c2827cc78cd08126c7559ff5227a07fb0ed90e5f`。当前main受控重入[透明原图](before-alpha/390-shop.png)，694318e同源保存[透明仍能打开详情](before-hit/invisible-hit-opens-dialog.png)。这两份旧capture继承的inputMain字段仍写1b258bc，实际运行根分别485b750及694318e，在此勘误，原报告未篡改；图片文件390-shop命名同样来自旧capture，实际视口均1366×768。

修正仅在hover进入／离开取消动画时恢复alpha1，保留原位移、悬停、详情、命中和销毁语义。[修后重入图](after/390-shop.png)与[同一入口打开详情](after/invisible-hit-opens-dialog.png)。基础自选及长期道具原纸底无常驻描边，只有hover亮框；现在PC工具／长期商品加1px静态墨线，[1280第二页](after/1280-lifecycle.png)、[1920](after/1920-lifecycle.png)。手机沿已认可轻层级，描边参数只在PC商品调用。

## 有限生命周期与失败保全

[原生完整报告](after/report.json.gz)9个记录：真实首店后受控重入早hover；基础详情开／关；1920×1080→1280×720→1366×768→390×740必要缩放；1280实际道具页1→2→1→2；手机三货架切换及各尺寸详情开／关。商品容器alpha1、visible/active=true；实际基础自选标题存在，PC工具／长期商品边界存在；各检查完整state／journal／storage同首店保存。没有购买或奖励重放，没有改成本／供给。未测用户物理PC、GPU/FPS、音频或后期所有商店。

首轮观察器错误把1280第一页没有基础自选标题判作FAIL，实际纸面清楚显示1/2，该商品在第二页。保留[原FAIL](observer-page-assumption-FAIL/report.json.gz)及[图](observer-page-assumption-FAIL/FAIL.png)，补为实际翻页，不把正常分页当透明故障；未改领域／页数／布局去迁就断言。

50相关定向（shop-layout/basic-tool-choice/tool-inventory-entry）、typecheck、计划检查通过；日志在本目录。重跑本目录check.mjs须从仓库根，沿既有Vite／Playwright／harness，不录屏。最终精确HEAD标准CI另核，旧PR107绿色不签此候选。

恢复中的选角／路线样板保全于独立本地review/opening-visible-play-resume，整合01f34f2、底部预算WIP cf17df1，未推送／未验收；原9123aef、Rex未启用与文化暂停保持。不混入PC商店修复。
