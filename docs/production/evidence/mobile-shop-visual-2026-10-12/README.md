# 移动商店有限视觉候选 · 父复审前

基线 main `00fe311e04305b7769f8141520742810bc614134`；本批独立于未合 PR133/135，保 PR136 推荐算法。产品修改仅 ShopScene、RunMenu、MakeCardsDialog、style.css。无新资源、价格/数值/推荐/交易/存档身份/英雄/音效变更；尚未发布、未创建PR、未签整体体验。

## 原图边界

用户原图 Library ID `libfile_81915fbc30c08191aa48c725c4118145`，文件 `16211.jpg`；父线程已实际查看940×2048 Android Chrome整图。本执行代理两次授权下载均为 `library file transfer failed: download failed`，本机没有该图，**本代理未看到用户原图**。两次完整传输元数据私存本机，未提交签名URL。父负责对照原图验收，无须用户重传。

## 同状态整屏

本地 validator-approved UI夹具：二响、7金、持越染越深，货架最后一句/加班费/小费盒；首次合法RerollShop后设置公开受控状态并通过原checkpoint校验，从真实菜单导入，非自然游戏、非正式域名存档。`before/`保基线整屏和完整state/journal/storage；`candidate/`保同输入候选，两次查看/关闭/取消均不改变完整保存。

| 屏幕 | 修前 | 候选 |
|---|---|---|
| 320×640，底安全区34 | [完整串星FAIL](before/320x640-safe34-shop.png) | [完整候选](candidate/320x640-safe34-shop.png) |
| 390×640 | [完整串星FAIL](before/390x640-shop.png) | [完整候选](candidate/390x640-shop.png) |
| 320×740 | [完整基线](before/320x740-shop.png) | [完整候选](candidate/320x740-shop.png) |
| 390×740 | [完整基线](before/390x740-shop.png) | [完整候选](candidate/390x740-shop.png) |

[320购买确认两意图](candidate/320x640-safe34-purchase-choice.png)、[320道具入口](candidate/320x640-safe34-tools.png)、[390菜单内全屏](candidate/390x740-menu.png)。代理已用view_image实际看这些整屏；第一候选320卡边超出约3px也保在 `initial-candidate-fail/`，最终仅把星位内收到真实卡框。原初始夹具校验FAIL及修正保在before/fixture-fail.txt。

## 本批方案与待验

五个14px实/空星独立槽位，不用重复长标签；原推荐指数/原因在详情和canvas可访问名称中保留。分类统一14px两行名称/数量，仅选中项朱红下划线；道具箱原独立边框/图标。顶层只留英雄、金币、菜单。道具详情给“买来存着”和“购买后现在用”，不在每卡加双按钮；暂存直接回店，快用直接进原目标面，确认使用才消费。存款失败恢复也保留玩家意图。

全屏仅在菜单触发，调用原浏览器API；首次菜单内短提示可关闭且偏好独立保存，失败只在菜单内给状态，退出保留菜单入口。未强制全屏。实际全屏/失败/不支持、360/412、PC1366、动态高度、真实点选分类/买存/快用取消/确认消费、完整保存/继续的验收尚待父对第一候选复审后完成。当前typecheck已过，CI未申请；不把本地截图冒充物理Android、浏览器栏、听感或自然整局。

复现：`MOBILE_SHOP_OUTPUT=/tmp/mobile-shop-candidate node harness/mobile-shop-visual.mjs --preview`；修前用同harness对main运行`--before`。每组report及gzip完整账对应自身版本，保原FAIL。父唯一Ready/merge；本代理不发布。
