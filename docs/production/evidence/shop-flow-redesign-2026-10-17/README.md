# 商店重整：运行时接线与验证

分支：`dev/shop-flow-redesign-20261017`。基线 `9e015286d1d223afad0a6e6b2860fcfed1457faf`；普通合并提交 `3860008c2723c81a98440f2b94959060ac71d335` 已纳入父级释放的战前候选 `67b4b2cdd10ce8b6ffcd1a10f6bdb55a9f6ab865`。未覆盖或回退其 Boss 去重、直接入场、恢复、节目单入口与挑战封角行为。

首批 `bac37909` 只交付独立组件。当前已接入商店运行时，并经普通合并 `b7c15a93` 纳入共用鉴赏 `9ec861ad`。没有改领域规则、价格、概率、存档键、身份分派或共享计划；最终 SHA 见交付回执。

商店运行时提交为 `23092ef1`，最新图外鉴赏提示 `fd7c888d` 经普通合并 `f7139b0f` 纳入。本目录 `browser-final-check.json` 的源码哈希对应这一最终运行时代码；后续回执提交仅整理证据。旧黑徽标没有重新引入，owner 的完整鉴赏与焦点恢复逻辑保留。

当前货架明确区分唐宋牌、消耗工具、长期物品；PC 移除工坊假货位，只保留右侧唯一入口，手机工具页保留唯一工坊入口，库存独立打开工具包。工坊分升级、改牌、染色，直接读取原服务报价、基础选择和共享每店一次，不因刷新恢复。没有可升级牌型时明确显示原因，默认先看改牌。

购买保存后在同一个原生 dialog 进入使用流程，目标保持空选，已发现牌型也不自动选第一项。底部仅确认使用/稍后使用；销毁留在完整说明，带入牌桌放在次级展开区。无目标工具以紧凑真实变化面板呈现，需要目标时才显示选牌区。所有提交沿既有 expectedSeq、验证和保存路径。

商品完整 contain、图窗扩大，标题/摘要/价格固定网格；版次、稀有度移到图外，取消额外套框和角标，使用轻抬柔光。英雄背景限于所属侧栏文字以下、局部纸底保护对比，保留原画入口。提示就近锚定并翻转，避开角色侧栏/动作区，已持配合反馈继续更新。

`DetailDialog` 仅增加复用 owner 的生命周期接口，不重做鉴赏；清理旧事件/资源，保留返回焦点。视觉检查发现首次复用重挂 body 会丢失原生 top layer，已修为不重挂并增加 `:modal` 断言；保留 `1912-reuse-backdrop-before.png`。最新鉴赏提示另顺序合入，避免覆盖 owner 的徽标改动。

## 已完成与接线点

|组件|作用|后续消费者|
|---|---|---|
|`ShopOfferLayout.ts`|唐宋牌、消耗工具、长期物品分类；固定图/标题/摘要/价格网格。摘要长短不切换图文布局；容量不足显式返回无布局，交消费者提供更大座位或分页。图片在图窗中仍须完整 contain。|`ShopScene.drawPCOffer`、`ShopLayout.shopGoodsGrid`，取代目前按摘要实测高度临时换列的分支。|
|`ShopAnchoredTip.ts`|提示围绕实际目标从右、左、下、上翻转，遵守可用区域和排除区；没有安全位置则不显示，不回落到角色侧栏。|`ShopScene.highlightSynergies` 应传当前 offer 的真实 Box、角色侧栏/固定动作排除区。`ShopSynergyPreview` 的已持牌光圈与同步理由继续保留。|
|`ShopPurchaseFlow.ts`|从已保存收据投影工具下一步。目标型只给“选择目标”，无目标型也要明确确认；当前阶段不可用不虚造主动作。次动作“稍后使用”。不产生目标、使用命令或带入意图。拒绝过期、跨局或已不持有的收据。|`ShopScene.inspectOffer`、`confirmBasicChoice`、`resumeMakeCards`、`purchasedMakeTool`。购买完成后在原面板显示目标选择；`ConsumableDialog` 需支持既有 owner 内的挂载方式。最后一步继续沿既有 selectionIssue/预览/expectedSeq/保存路径。|

以上组件已经接线；`ConsumableDialog` 直接进入具体工具，不再先开库存过渡页。共用 `DetailDialog` 的原样鉴赏候选先普通合入，增加的 owner 复用接口属于本包局部窗口；原画缩放、入口与资源解码逻辑保留。软件通过不代签整店美术或真人验收。

## 原图检查已解除（保留首次失败）

|Library ID|解析出的文件|版本|本机结果|
|---|---|---|---|
|`libfile_7e836d19eaf08191948b748b9dc00617`|`file_000000001d5c81fba2d2e0662f1e61dc` / `image(20261017-071515).png`|0|WSL 原 helper 完整验证元信息，已通过本机 UNC 路径 view 实际像素。|
|`libfile_0f3ffc41f1048191a35da716b4bba6d3`|`file_000000009f5081f889df0c0fcad94418` / `image(20261017-071516).png`|0|WSL 原 helper 完整验证元信息，已通过本机 UNC 路径 view 实际像素。|

已按当前 Library 技能读取并原样下载 `library_file_transfer.py`，保留 prepare 返回的完整 transfer 与 xattrs 送入 helper。首次受沙箱网络限制为 `download failed`。唯一一次支持流重试使用同一 helper 和完整 transfer，Windows Python 3.14.3 在元信息写入阶段抛 `AttributeError: module 'os' has no attribute 'setxattr'`；两条最终文件路径均不存在，原子安装未完成。不是审批拒绝。没有手工下载、去掉元信息、修补 helper，或沿父级路径读取截图。停止进一步重试。

收到同机 WSL 兼容路线后，完整 Library 包路径恢复文档读取；复用本请求内已经取得的原样 helper，在 Ubuntu-Dev 私有临时区一次取回两图并验证全部 xattrs 与 user.library-file-id，再用 view_image 从本机 WSL UNC 路径实看。字节数、版本、SHA-256 与观察内容见 reference-images.json；临时 transfer JSON 已删除。没有忽略元信息、另造 URL 或把父级路径当作本地。

## 检查

- 首批独立组件 13 项与战前相关 47 项通过，合计 60 项，见 `focused-check.txt`；这份历史检查不能代签当前接线。
- 当前 `runtime-focused-check.txt`：10 文件 223 项通过，包含报价/共享配额、选择/保留边界、复用 owner、提示定位与响应式几何；类型检查通过。`runtime-build.txt` 为当前生产构建结果。最新鉴赏合入后的 `final-art-check.txt` 另有167项通过。
- `browser-check.mjs` / `browser-check.json`：隔离且经原保存校验的夹具，经真实菜单导入，Chromium 1912×954 鼠标、390×844 触控，另缩为1280×720及320×740。购买后复用同一元素、空目标、选择与稍后不改完整 run、显式确认只消耗一次、升级使用共享机会、刷新保留配额、缩放与冷续局保持完整状态均通过，0 页面错误。
- 最终只补 `--final-inspection` 窄检查，复用上述交易证据，不重跑矩阵：`browser-final-check.json` 两视口均 PASS，0 页面错误。原生 `:modal` 与遮罩保留、购物结果仍直达同一使用流程且只有两动作、图外放大提示、完整图与关闭后焦点恢复、工坊改牌/染色关闭不改完整状态均已核对。
- TypeScript 检查、Vite 生产构建通过，见 `build-check.txt`。构建保留既有大 chunk 提示。
- 首次 Vitest 因沙箱临时目录 rename EPERM 未启动；将测试临时目录限定到本工作树 `.vite/test-tmp` 后正常完成，没有提权跑测试。
- 先前检查夹具直接改开局状态被原校验拒绝（browser-setup-fail.txt）；观察器误用 Phaser Rectangle.toJSON（browser-first-fail.json）；首次无已发现牌型，页面正确空态而脚本错误等待升级按钮（browser-no-discovery-fail.json）。均保留原记录，后使用真实 RerollShop 后、显式已发现高牌/对子且经保存校验的夹具检查升级。
- 已实际查看本目录桌面商品/就近提示、手机无目标工具/购后选牌/工坊截图。没有真人理解、物理设备、整体美术或听感签收；不查 CI、不部署、不操作域名。P08 仍 in_progress，不写整体完成百分比。

## 最终画面

|画面|桌面1912×954|手机390×844|
|---|---|---|
|商店|[新商店](1912-shop-final.png)|[手机商店](390-shop-final.png)|
|无目标工具|[紧凑使用页](1912-targetless-tool-final.png)|[手机紧凑使用页](390-targetless-tool-final.png)|
|购买后选目标|[原面板选牌](1912-purchased-select-target-final.png)|[手机选牌](390-purchased-select-target-final.png)|
|工坊改牌|[改牌项目](1912-workshop-tools-final.png)|[手机改牌](390-workshop-tools-final.png)|
|工坊染色|[染色项目](1912-workshop-dyes-final.png)|[手机染色](390-workshop-dyes-final.png)|
|完整鉴赏|[黑底完整图](1912-full-art-final.png)|[手机完整图](390-full-art-final.png)|

新就近提示见 [锚定提示](1912-nearby-tip-final.png)。无后缀截图对应较早的完整交易检查；最终图形与 native modal 回归以 `-final` 和 `browser-final-check.json` 为准。这里提供可检查的实际像素，不宣称用户整体审美验收。

## 追加秦琼接线审批记录（已解除）

父级另交付的 `b8c89e8cf7b9d4bfa53ee3b9c96bedaa735fb94e` 与 GameScene 换牌中/结算中临时显示接线，首次因缺少直接用户范围证据在执行前被自动审批拒绝。父级随后传入用户关于秦琼红色待完成提示的原文和全部授权，允许一次证据重试；普通合入成功。提交曾因暂存区同时包含 main 祖先文件被拒绝；只读核对证明 44 个继承文件与 `origin/main 43725f69` 逐字节一致、6 个候选文件与 b8c89e8c 一致后，审批接受普通合并提交 `b3ccf59011eb0b9f288a752aab3a2d4e233cd6a5`。没有绕过拒绝或重写候选模块。

场景最小接线及独立验证见 [秦琼展示证据](../touye-locked-skill-state-2026-10-17/README.md#场景最小接线)。商店 505a1bb9 的页面、流程和已交付截图未因此改写。
