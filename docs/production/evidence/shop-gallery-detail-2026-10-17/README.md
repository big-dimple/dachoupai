# PC大展示区高清定向修复

父线程在查看上一批1366/390实图后要求定向核查。基线 `610816ad1a87201ae47248817bcaba64fafb36f3`，分支 `dev/shop-gallery-detail-20261017`。不回滚四分类、顶栏、菜单与单击详情结构。

实际1366×900 / DPR1，framebuffer与CSS均1366×900；三张大卡 `b07 / c03 / mantangcai` 原为 `p08-joker-*` **128×160**纹理放至**288×360**，进入详情前高清请求数为0。实际网络URL为 `assets/handdrawn-p08/cards/{id}.thumbnail.webp?v={manifest sha256}`，完整地址、运行时纹理/尺寸和DPR见 [baseline.json](baseline.json)、[修改前实图](baseline.png)。72张注册唐宋牌均已有615×768细节文件，范围38,158–176,792B；部分超过缩略加载器128KiB上限。

本补丁只在PC唐宋牌货架当前可见的三张大图上，进入货架即用既有DetailArt有界队列请求 `cards/{id}.detail.webp?v={manifest sha256}`，经decodeArtImage与清单尺寸核对完成，再安装独立 `shop-joker-detail/{id}`纹理。缩略图原路径立即工作；失败不撤掉缩略图，也不反复重试。切换分类后再回来可重试。换货/切换分类/离店会取消旧请求并释放本批GPU纹理；迟到完成不能写回。只重绘图片holder，不重建卡片命中区。

成功后源纹理615×768，保持contain显示**288×359.6488**，较原图上下各约0.176px居中差异来自细节图真实宽高比。加载前无卡片点击、无详情弹窗；完整state/journal/storage未变。见 [最终report](report.json)、[解码后实图](detail-ready.png)、[重试恢复实图](recovered.png)。已实际查看最终1366截图。

- 23项窄测通过：4项新增画廊租约测试，加原缩略加载与共享传输队列回归。覆盖解码前占位、去重、真实版本URL、尺寸拒绝、404保留、换类重试、换货/离店取消与迟到隔离。见 [tests.txt](tests.txt)。
- 类型与生产构建通过，见 [typecheck.txt](typecheck.txt)、[build.txt](build.txt)。
- 一组1366×900/DPR1受控原生浏览器检查：原产品基线、拦住HD的即时占位、释放后615×768、模拟404、真实分类离开/返回恢复，0页面错误。未跑长矩阵；DPR2/物理设备/自然获取未代签。
- 原始驱动失败如实保留：`baseline-driver-selector-FAIL.*` 使用了错误菜单标题；`category-driver-selector-FAIL.*` 使用了错误命中名。这两次都是驱动选择器问题；修正后原生流程完整通过，未因此修改产品。

只新增ShopJokerGalleryArt，并在ShopScene接三处：导入、页码归一后请求当前可见图、绘制时选择已就绪细节纹理。布局/CSS/菜单/详情/缩略加载器/共享解码队列/规则存档/资源清单/图片字节/多彩和忘招挂载/GameScene完全不改；LF指纹与范围断言见 [source-binding.json](source-binding.json)。仅本次PC唐宋牌货架大图，工具/长期物品、手机与小持牌继续原加载路径。无新素材、无待批准操作；普通dev推送交整合，不推main、不等CI、不部署。
