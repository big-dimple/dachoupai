# 商店重整：独立组件与当前阻塞

分支：`dev/shop-flow-redesign-20261017`。基线 `9e015286d1d223afad0a6e6b2860fcfed1457faf`；普通合并提交 `3860008c2723c81a98440f2b94959060ac71d335` 已纳入父级释放的战前候选 `67b4b2cdd10ce8b6ffcd1a10f6bdb55a9f6ab865`。未覆盖或回退其 Boss 去重、直接入场、恢复、节目单入口与挑战封角行为。

本次新增为待接线的独立组件，尚未改变商店运行时界面。没有改领域规则、价格、概率、存档，也没有改共享计划或鉴赏模块。

## 已完成与接线点

|组件|作用|后续消费者|
|---|---|---|
|`ShopOfferLayout.ts`|唐宋牌、消耗工具、长期物品分类；固定图/标题/摘要/价格网格。摘要长短不切换图文布局；容量不足显式返回无布局，交消费者提供更大座位或分页。图片在图窗中仍须完整 contain。|`ShopScene.drawPCOffer`、`ShopLayout.shopGoodsGrid`，取代目前按摘要实测高度临时换列的分支。|
|`ShopAnchoredTip.ts`|提示围绕实际目标从右、左、下、上翻转，遵守可用区域和排除区；没有安全位置则不显示，不回落到角色侧栏。|`ShopScene.highlightSynergies` 应传当前 offer 的真实 Box、角色侧栏/固定动作排除区。`ShopSynergyPreview` 的已持牌光圈与同步理由继续保留。|
|`ShopPurchaseFlow.ts`|从已保存收据投影工具下一步。目标型只给“选择目标”，无目标型也要明确确认；当前阶段不可用不虚造主动作。次动作“稍后使用”。不产生目标、使用命令或带入意图。拒绝过期、跨局或已不持有的收据。|`ShopScene.inspectOffer`、`confirmBasicChoice`、`resumeMakeCards`、`purchasedMakeTool`。购买完成后在原面板显示目标选择；`ConsumableDialog` 需支持既有 owner 内的挂载方式。最后一步继续沿既有 selectionIssue/预览/expectedSeq/保存路径。|

工坊运行时合并、共享每店一次的真实配额展示、按钮层级、边框与留白、同面板目标选择尚待接线；不能用上述投影组件签为整店完成。需要 `ConsumableDialog` 交界时优先改其挂载接口，不改另任务负责的 `DetailDialog` / `CardArtZoomModal`。

## 必须先解决的截图阻塞

|Library ID|解析出的文件|版本|本机结果|
|---|---|---|---|
|`libfile_7e836d19eaf08191948b748b9dc00617`|`file_000000001d5c81fba2d2e0662f1e61dc` / `image(20261017-071515).png`|0|未完成 materialize；没有查看实际像素。|
|`libfile_0f3ffc41f1048191a35da716b4bba6d3`|`file_000000009f5081f889df0c0fcad94418` / `image(20261017-071516).png`|0|未完成 materialize；没有查看实际像素。|

已按当前 Library 技能读取并原样下载 `library_file_transfer.py`，保留 prepare 返回的完整 transfer 与 xattrs 送入 helper。首次受沙箱网络限制为 `download failed`。唯一一次支持流重试使用同一 helper 和完整 transfer，Windows Python 3.14.3 在元信息写入阶段抛 `AttributeError: module 'os' has no attribute 'setxattr'`；两条最终文件路径均不存在，原子安装未完成。不是审批拒绝。没有手工下载、去掉元信息、修补 helper，或沿父级路径读取截图。停止进一步重试。

须提供本机可用的受支持 materialize 流程，或将两张图重新作为本机可读附件提供，再实际 view 后推进界面接线与本地画面核验。目前只按明确文字要求完成上述独立部分，没有猜测两图像素。

## 检查

- 独立组件 13 项测试通过；使用真实 BuyOffer 结果核对购后投影，完整状态保持不变。
- 合并后的 Boss 准备、章节选择、节目单相关 47 项通过；合计 4 文件 60 项通过，见 `focused-check.txt`。
- TypeScript 检查、Vite 生产构建通过，见 `build-check.txt`。构建保留既有大 chunk 提示。
- 首次 Vitest 因沙箱临时目录 rename EPERM 未启动；将测试临时目录限定到本工作树 `.vite/test-tmp` 后正常完成，没有提权跑测试。
- 未运行商店运行时/浏览器验收、真人理解、物理设备或整体美术验收；没有 CI、部署或域名操作。
