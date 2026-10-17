# 卡牌详情画作背景 · 2026-10-17

独立后续包，分支 `dev/card-detail-background-20261017`，基线 `2317459656c04c07742c182c6fcb2caff442d264`。验证在该基线加本批工作树上执行；[浏览器报告](browser-check.json)固定四份产品源码在本机 checkout 中的 SHA-256，跨 checkout 比较需考虑 Git 行尾规范化。本包没有合并 main、检查 CI 或部署，也没有修改共享计划。

## 行为与接线

- `DetailDialog.open` 新增可选 `artBackground: {position?: string}`。仅注册画作可启用；默认调用保持原有小图详情。沿用同一渐进加载图片，以 `cover` 铺满面板，图片 opacity 为 1、无滤镜；文字区域用局部浅底。步步高升、始终如一使用各自的纵向裁切焦点。
- 顶部“查看完整原图”至少 44px，复用现有黑底 `contain` 全图窗口；关闭后焦点返回该按钮。原始图字节及 `CardArtZoomModal` 均未改动。
- 商店购买详情、基础选购、唐宋牌持有详情、静态购物回执及长期道具详情启用。工具的目标选择和使用工作区不启用；购后复用同一个原生 modal 时清除旧类名、背景节点、原图按钮及异步图片所有权。
- 未改英雄技能小字模块、GameScene、BlindSelect、规则、价格、随机、存档或素材。购买后仍为空目标、确认禁用；选择和“稍后使用”不消费道具。

## 实际验证

[定向检查日志](focused-checks.log)：208 项通过（detail-dialog、shop-haptics、tool-carry-intent、make-cards-flow、shop-purchase-receipt、shop-purchase-value），`tsc --noEmit` 和 Vite production build 通过；构建保留既有大 chunk 提示。`git diff --check` 通过。

[浏览器脚本](browser-check.mjs) / [结果](browser-check.json)：本机 Chromium 153.0.8010.12，1180×757 鼠标、390×844 与 360×844 真实触控事件，各一次经过正式菜单导入合法受控存档。三档均通过：背景完整覆盖面板且不拉伸、顶部按钮尺寸、全图 contain 与焦点返回、规则/取消不变状态、持有牌/工具/长期物品切换，以及购后同一 modal 清除背景再选目标。最终截图等待画作自然宽度 ≥600px，避免把早期缩略图当高清结果。

已实际查看最终 PC 与手机像素：

| 场景 | PC | 390 | 360 |
| --- | --- | --- | --- |
| 步步高升购买 | [图](1180-purchase-background.png) | [图](390-purchase-background.png) | [图](360-purchase-background.png) |
| 持有牌 | [图](1180-held-background.png) | [图](390-held-background.png) | [图](360-held-background.png) |
| 工具购买 | [图](1180-tool-background.png) | [图](390-tool-background.png) | [图](360-tool-background.png) |
| 购后目标选择 | [图](1180-targets-cleared-background.png) | [图](390-targets-cleared-background.png) | [图](360-targets-cleared-background.png) |
| 长期物品购买 | [图](1180-item-background.png) | [图](390-item-background.png) | [图](360-item-background.png) |

[PC完整原图](1180-whole-original.png)、[390完整原图](390-whole-original.png)、[360完整原图](360-whole-original.png)保留现有鉴赏行为。

## 参考与诊断

用户参考：Library `libfile_6f47d154892c8191bab765782979f41d`，`16315.jpg`，JPEG，255189 bytes，版本 0。按当前 Library 官方 materialize helper 在消费者本机的 WSL Ubuntu-Dev 兼容环境传输一次成功，并实际 `view_image` 查看像素；helper 元信息保留在该本机文件。原截图含个人浏览器界面，未加入仓库；传输凭据未加入证据且临时传输 JSON 已删除。

[诊断记录](diagnostic-history.json)保留两次脚本定位错误和初版裁切/手机浅底迭代；前者未发现产品故障。初版 [购买](initial-crop-1180-purchase.png) / [持有](initial-crop-1180-held.png)用于对照裁切位置，不能替代最终图。

此处 PASS 仅表示上述机器检查和受控浏览器操作。用户美术批准、真人理解、实物设备触感与听感均 NOT_RUN；P08 仍按共享计划保持 in_progress。
