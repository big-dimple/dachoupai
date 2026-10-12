# 手机献纸/现货工作面 · 原图阻塞时的只读基线

main已正常吸收PR138：`b4b247f61f54e1a27d5143ece3ebf42829202b90`。产品代码无改动；只保受控baseline harness与证据，不签修复、不改ShopScene布局/拖拽/GameScene/规则/价格/保存。

## 附件实况

Library ID `libfile_9f7da453784881919da479e71316639c`，`16215.jpg`，授权版本0、315777bytes。当前Library来源helper、prepare_materialize与一次本地目的地重试均执行；两次helper报 `library file transfer failed: download failed`。返回workspace_path=null、签名URL存在，headers={}，无HTTP状态/权限拒绝详情。本机无文件，**本代理未看到用户原图**。完整传输元数据私存本机，[打码状态](materialization-status.json)留证。不第三次下载，不换环境/猜URL/绕权限；父已看原图不等于本代理看过。

## 本地基线实际像素

合法当前身份夹具：30金、持T08、实际随机现货S01目录8金；原RerollShop后经checkpoint校验从真实菜单导入，实际BuyOffer后22金、库存T08/S01，献纸选K♠（热度纸+闪箔）为独立牺牲，9♣受益。选择/取消只读，完整state/journal/storage相等；一次购买按原command对照。不是自然获得、用户档或正式域名。

| CSS viewport | 当前目标界面 | 购买首屏 |
|---|---|---|
| 320×640 | [完整原失败](before/320x640-sacrifice-selected.png) | [现货不在首屏](before/320x640-purchase-first-view.png) |
| 390×640 | [完整原失败](before/390x640-sacrifice-selected.png) | [现货不在首屏](before/390x640-purchase-first-view.png) |
| 412×740 | [基线](before/412x740-sacrifice-selected.png) | [购买首屏](before/412x740-purchase-first-view.png) |
| PC1366×768 | [基线](before/1366x768-sacrifice-selected.png) | [购买首屏](before/1366x768-purchase-first-view.png) |

上述本地完整图已view_image实际看。320×640头部281px、中区123px、牺牲成本77px、按钮区133px；390×640中区198px。390现货tile y1336～1571，实际滚动窗口底542；有库存时默认已有工具。原第一次夹具因自造现货ID不符合/tool/0被校验拒绝，已改用原生成ID，失败保在fixture-fail.txt，不改校验。

## 只读定位与最小候选

ConsumableDialog.ts:154–158/222–231：长用途与选中提示、工作面双标签进入固定header；ShopScene.openMakeTool追加收据到header。固定costs与三按钮继续挤压中区。现有gallery保DOM节点、选择Set，不应重建或自动清空；新收纳需实测选择后scrollTop不动，牺牲与受益不同实例/覆盖/永久代价始终可见，原UseConsumable与原子保存保持。

最小候选：标题＋短操作提示＋明确受益/牺牲摘要；非关键规则/收据入现有说明折叠；主滚动区让牌可见，稀有销毁操作退出主操作行但保原确认；不增加选择/确认步骤。收据由ShopScene helper追加，若需要接线仅移动到现有说明details，不改ShopScene场景布局或拖拽。产品实施前仍需满足原图实际查看/父明确调整分工。

MakeCardsDialog.ts:22/32–34：默认owned；随机offers在基础九选择之后，而且rows.offers排除了与基础同名的随机位。候选为默认购买、真实随机现货前置（含与基础同名实际offer，原BuyOffer回调/真实报价），避免双座位，同时保全部自选/库存与买来使用/存着。PC也需整屏核，不为手机回退PC。

剩余：原图可读交付/验图；产品实施与修后整屏；1–2受益＋独立牺牲、排序/筛选保留、取消零写、失败/重试不重复消费及精确HEAD CI/draft。此只读阶段未创建产品PR、不签交付。
