# W3 安全商店管理：有界软件证据

更新：2026-10-07。仅修复分支、待独立复核与用户PC验收。不是main发布或玩家满意签收。

## 身份与范围

- 输入 main：`a6047dedbd89f24a90e9c07de27c82d47d6a9645`。
- 执行卡独立文档提交：`bbd9607b9f8bd9807a0f772b0c342410344fbdda`。
- 产品与首轮有界 harness：`79a4b000febe729a9465221b0763e1b2899b55f5`。
- 最短弹窗展开补检（只加 harness 模式，产品源码相同）：`f5ad8b970de678772b745f021db8114fe13e3015`。
- 单线执行，无并发工作者。未改领域、数值、内容、随机、存档、锁文件、CI、素材；未提前实现W4特效。

## 已复现与修复

`baseline-dialogs.json` 保留原44px构筑关闭、bottom34弹窗越过安全区5px、740短横折叠管理无入口。它早期读取异步状态过早，不能据其 heldTapChangesState=false 声称没有误扣款。后续只重查两例，`baseline-paid-hit.json` 在320×568 bottom12/34点击持有牌底边并等待350ms，真实金币6→4、commandSeq+1，明确复现付费换牌；`old-held-hit-320.png` 为该历史状态。

修复只压缩320短竖屏商品插画，保持5:7、原字体与触点，让五个可见持有槽停在换牌行上方4px。短横折叠管理在既有构筑详情正文中提供逐张入口，复用原左右移动和二次出售确认。共享详情在安全矩形中居中，主关闭至少48px，原56px购买取消不缩；长正文继续由既有滚动区域承载。

PC b10/b11/mantangcai文案及resolver保持。提取既有实际摘要供构筑详情的同店三货比较使用：b10本手读旧成长、成组手后+10/上限100/下手生效；b11匹配留牌按手牌顺序前3张各+0.5倍率；满堂彩指定五种牌型+90热度。详情保留完整规则。手机小货架仍为简短查看入口，完整比较通过构筑详情可读；不冒称全72卡货架摘要已改完。

## 软件验证

- `native-final.json`：clean源码79a4b00构建，11个商店尺寸/安全区案例通过（320×568 bottom12/34、360×640、390×740、740×390、844×300、1280×720、1366×768、1920×1080、811/812×390）。持有牌边缘点击、查看/取消均不改变完整state。
- 五张持有牌短横：首张左移禁用、末张右移禁用，实际右移再左移恢复顺序；出售取消完整state一致，确认出售commandSeq只+1、数量5→4、金币按实际命令增加。报告完整payload还显示移动只改变commandSeq/jokers/receipts，撤回顺序后只commandSeq/receipts变化；出售仅commandSeq/gold/jokers/shop/receipts变化，RNG保持。
- 九牌320/390×740与811/812×390：未选均九张可见、无窗口，点击第一张实际选择，不改领域state；未选/已选卡触点在画面内。
- `native-expanded.json`：clean源码f5ad8b9，仅补320×568 bottom34与844×300 bottom34展开完整规则。正文分别187/833px、97/662px（可见/总高），可滚到底且取消可达，弹窗离底安全区12px。构筑关闭48px，购买取消56px。
- 定向49 tests/3 files及typecheck通过。`w3-verify.log`：完整2457 tests/135 files、typecheck、production build通过（产品源码79a4b00，与f5ad8b9相同）；`w3-content.log`、`w3-plan.log`通过。未执行软件GPU帧率或长录屏验收；CI待PR精确head另报。
- `harness-whitespace-failure.json` 为保留的检查脚本误报：原摘要含“前 3 张 / 倍率 +0.5 / 热度 +90”空格，脚本后改按去空格文本核对；未改正确产品文案。

复查命令：`node harness/w3-shop-management.mjs`；最短规则展开：`W3_EXPAND_ONLY=1 node harness/w3-shop-management.mjs`。受控存档沿用W1及PC商店证据原身份，未创造自然获取或自然玩法结论。

## 有限截图与剩余验收

- [320可见持有槽与操作行](shop-320-safe34.png)
- [740短横持有管理入口](manager-740.png)
- [844短屏展开规则滚到底后取消可达](detail-844-safe34.png)

上述为系统Chromium151的软件截图/原生鼠标输入，DPR1、减少动态，不是用户Edge实机、审美、帧率或音频验收。main合并/自动部署由父任务协调；PC新商店整体观感、真机流畅度、W3完整信息与使用闭环、全类条件提示和W4特效仍按原计划待验，未宣布W1/W2/W3整体完成。
