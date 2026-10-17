# 手机牌桌空间样例

基线main `e9a8036d0cba3513ef39bc78db1be81bfb142f94`，独立分支 `dev/mobile-table-density-20261017`。只调整牌桌布局；规则、音频、商店、获胜页、已有撞分时钟不改。P08仍in_progress。

- 390：[修复前](before/390x740-selected.png) → [待选](after/390x740-selected.png)、[未选](after/390x740-idle.png)、[超选五张警告](after/390x740-limit-message.png)。
- 360×640：[前](before/360x640-selected.png) → [后](after/360x640-selected.png)。
- [390×600短屏](after/390x600-selected.png)、[320×568](after/320x568-selected.png)、[390×844安全区](after/390x844-selected.png)、[844×390短横屏](after/844x390-selected.png)、[PC](after/1366x768-selected.png)。
- [逐区域几何](geometry.json)、[基线原报告](before-report.json.gz)、[新布局原报告](after-report.json.gz)、[104项测试](tests.log)、[typecheck](typecheck.log)。截图DPR2，真实编译应用、同一受控库存及原生导入/选牌，非物理手机。

旧手机待出牌居中放在223px高的区域内，完整英雄小图独立挤在中间，帮助占待出区域顶部。新布局给原画、数字、正式落牌、技能/道具/帮助、手牌、底部操作独立区域。待选预览复用隐藏数字的空间；正式结算恢复独立数字与落牌区，正常390数字区保108px。英雄全图缩略归入技能入口，只保一个技能边框；帮助和道具箱同带，窄道具刷新后仍保持双行。说明进入既有帮助，必要警告占标题栏并临时隐藏标题。

| 390×740逻辑区域 | y | 高度 |
| --- | ---: | ---: |
| 顶部唐宋牌 | 68 | 89 |
| 正式数字区 | 165 | 108 |
| 待选五张实际牌框 | 237.6 | 86.8 |
| 正式落牌区 | 295 | 112 |
| 技能/道具/帮助带 | 449.6 | 52 |
| 手牌 | 509.6 | 156.4 |
| 弃牌/理牌/出牌 | 674 | 58 |

待选与正式落牌互斥。390标题底部至待出标签153→11px，360为91→约11px；390普通八张牌面宽64→96px。小屏保36px暴露命中列，320宽九张沿用30px合同；10–14张优先两行、至少52px牌面，更短时沿用可翻页窗口。PC同案4,196,352像素与几何完全一致，短横屏几何一致。

最终几何检查覆盖上述尺寸，验证动作/工具命中区互不重叠、牌命中避开按钮、帮助避开标签、英雄图在技能入口内。旋转后原生触摸取消/重选、超选五张警告、帮助/Escape均通过，保存状态与journal精确不变。104定向/type通过。首轮2个命中宽度失败（32.5796/33.0143小于36）通过修正八张与翻页列距解决，原36px断言保留；手牌固定223.2px断言改为两行至少52px牌面及完整预览预算。

首个基线观察脚本使用旧菜单入口超时，保留[原失败报告](first-menu-observer-FAIL.json.gz)，随后使用现main的原生折叠菜单入口。一次候选因执行器连接中断未获完整回执，不用于签收；最终报告独立通过。

产品 bdafa60443b4a20cb1b95950facb10e8da45597e。随后的一次同版相关回归已通过：PC、390、4×各5笔真实H/M撞击、旧字/新值顺序、清理及领域oracle；PC hover/键盘、PC与手机长按调序、手机点按通过。数据与几何全部核对到该提交源码。

实际canvas与同一WebAudio连续音画：[PC](strike-pc/av-continuous.webm)、[390](strike-phone/av-continuous.webm)、[4×](strike-fast/av-continuous.webm)。[手机命中](strike-phone/ordinary-hit.png)、[手机新值/回撤](strike-phone/multiply-pop.png)、[回归汇总](strike-summary.json)、[原始报告](strike-report.json.gz)，各目录附逐帧记录。WebM含实际VP8+Opus，未试听。

不重跑六人、长局、CI或部署；本批未重跑取消/后台/销毁，它们保留各自先前证据范围。物理设备、主观视觉和听感仍待验。
