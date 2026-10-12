# 移动商店有限视觉与交互修复

基线 main `00fe311e04305b7769f8141520742810bc614134`；最终产品源码冻结于 `1a717f53b07f4a2965a7894afcf75b5b3931ff5b`，后续只有测试/证据整理，五个产品文件SHA256见[最终报告](final/report.json)。独立于未合PR133/135，保PR136推荐算法；父唯一Ready/merge，本代理不发布。

用户原图 `16211.jpg` / Library ID `libfile_81915fbc30c08191aa48c725c4118145` 由父实际看过940×2048整图。本代理两次授权下载均为 `library file transfer failed: download failed`，**本代理未看到用户原图**；完整传输元数据仍私存本机，签名URL未入库。以下均为本地Chromium受控整屏，DPR1/CSS viewport、软件触摸事件；不能把原图940×2048换算为390×740，也不冒称真实Android浏览器栏、物理触摸或设备验收。

## 同输入修前与最终整屏

二响7金、持越染越深，最后一句/加班费/小费盒三现货。首次合法RerollShop后设置公开受控状态，经原checkpoint校验与真实菜单导入。修前/最终五个viewport的完整初始state相等；[完整初终账](final/full-state-journal-storage.json.gz)含每笔journal/IDB，不是自然整局或正式域名存档。

| CSS viewport | 修前 | 最终 |
|---|---|---|
| 320×640，底安全区34 | [串星FAIL整屏](before-all-sizes/320x640-safe34-shop.png) | [完整五星](final/320x640-safe34-shop.png) |
| 360×740 | [修前](before-all-sizes/360x740-shop.png) | [最终](final/360x740-shop.png) |
| 390×740 | [修前](before-all-sizes/390x740-shop.png) | [最终](final/390x740-shop.png) |
| 412×844 | [修前](before-all-sizes/412x844-shop.png) | [最终](final/412x844-shop.png) |
| PC1366×768 | [修前](before-all-sizes/1366x768-shop.png) | [最终](final/1366x768-shop.png) |

原693px可用高度断点会从三列切三行，本批删除这一手机断点及按高换星位置；宽<700、可用高≥500保持三列，同一公开保存依次640/693/740/844缩放无新命令。原<500短屏、PC712高回退保留，未签所有极矮屏。[390高640](final/390x640-height-640.png)、[390高844](final/390x844-height-844.png)。这是可视高度变化的受控替代，未伪造浏览器栏。

## 产品与实际操作

- 每卡五个14px实/空星局限本卡，名字/作用≥14px、价格16px，原推荐指数/原因保在详情与canvas可访问名称。分类统一名称/数量层级和选中下划线；道具箱原独立图标/边框。顶部留英雄、金币、菜单；主按钮≥48px、次操作≥44px。
- 入口“道具”。同一确认给“买来使用/买来存着”，不在每卡铺双按钮；暂存直接回店，快用直接进原选目标/确认面。[320居中确认](final/320x640-safe34-purchase-choice.png)、[规则展开滚动](final/320x640-safe34-purchase-rules.png)、[PC居中确认](final/1366x768-purchase-choice.png)。内容驱动，不再用全屏大空白；展开内容滚动，底部按钮不遮内容。
- 320/390/PC真实点存基础T08：7→5金、库存1；点快用随机T19：5→1金、库存2；取消目标和选中目标均不写；明确确认使用才消耗T19、金币仍1，T08保留。每笔完整state与原applyCommand相等，journal/IDB和冷继续相等；[320冷继续](final/320x640-safe34-cold-continue.png)。390真实存储Quota失败后重试只保存同一购买，仍暂存且不打开使用面，[原失败](final/390x740-store-save-failure.png)。旧PC/390覆盖增强、保存/使用失败重试、连续买用和只读租约失效亦通过，见[工具回归](tool-flow/report.json)。
- 基础九选一、原随机现货/牌型升级、长期道具和塔罗/星球/幻灵/补给投影保留；现货复用原家族标签。[长期货架切换](final/360x740-long-term.png)。本轮未自然获得/使用全部39件，不据此签全部风险工具或全旅程。
- 全屏仅在菜单内真实点击请求；首次菜单内短提示可关闭，重开/冷加载不再提示。[首次提示](final/390x740-first-fullscreen-hint.png)。实际Chromium全屏进入/退出且userActivation=true，[全屏整屏](final/390x740-fullscreen.png)。拒绝/不支持为明确注入的受控故障：[拒绝](final/390x740-fullscreen-reject.png)、[不支持](final/390x740-fullscreen-unsupported.png)；继续不弹游戏表层通知，保存不变。不是Android fullscreen权限/浏览器栏实测。

代理已view_image实际看五尺寸、动态高低、买存/快用、全屏/回退和失败图。父首审只肯定五星/顶部状态；购买空白被拒后已改，**最终整屏美术与原图对照仍待父复审**。全屏与正常窗口均有完整图，不只截卡局部。

## 版本、失败与边界

产品只改ShopScene/ShopLayout/MakeCardsDialog/RunMenu/style.css；domain/content/application/audio/platform/public-assets与基线无差异，推荐/价格/数值/身份/英雄/音效不改。持有丑牌拖拽组件、绑定与浮起/跟手/落位逻辑未改；统一货架调整了持有位几何，拖拽问题由父另批处理。

`before/`、`candidate/`保第一批原证据；`initial-candidate-fail/`保首次320约3px卡边越界，`dialog-size-fail/`保购买空白返修，`observer-fail/`保旧观察器等待屏外懒加载图的真实FAIL及坐标，`verification-failures.txt`保测试合同/类型失败。不覆盖旧FAIL。最终typecheck与受影响unit通过；精确最终HEAD CI以PR检查回执为准，未借旧绿CI签本包。

复现：`MOBILE_SHOP_OUTPUT=/tmp/mobile-shop-final node harness/mobile-shop-visual.mjs`；`MAKE_CARDS_OUTPUT=/tmp/tool-flow node harness/shop-make-cards.mjs`。修前同harness设置`MOBILE_SHOP_ROOT=<00fe311 worktree> MOBILE_SHOP_ALL_SIZES=1`运行`--before`。正式域名、物理手机/听感、自然整局由父/dot独立核，不在本批冒签。
