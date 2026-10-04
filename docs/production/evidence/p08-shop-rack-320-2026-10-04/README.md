# P08 320商店持有卡条 review

基线main `5d54421cac90e3d516770bba63f5f94904175219`，运行修复 `1557d411d53a88e29dc63d14ca70d998468a580c`。只改ShopLayout/ShopScene的持有卡几何、名字座位空间与命中边界；不改三货/工具入口/行动锚点或交易调序规则。

已真实复现320×568 safe0：原344px条首槽x=-12/末槽332；卡体底428.8、命中底450.8，按钮起424。候选54.4×76.16（5:7）、6px间距；四字名14px完整使用未占用的座位间隙，最后卡名保持屏边8px；可见卡体与命中均在按钮前。实际844×300 safe-top12对应shop.top24，旧短条有3.6px交叠，同一库存预算现夹到按钮前4px。三货/工具包/所有行动锚点不移动。

两张真实对比均工程actual view；都是同一合法5-owned/84gold/T07存档fixture，原生菜单文件导入及触摸。不是自然获取或main现场。仅测试将冻结B的ShopScene/ToolInventoryEntry与本候选ShopScene三方合为Vite虚拟模块，B功能不写入runtime，GameScene不复制。B输入bd3840d与当前7b787773两商店模块逐blob同；工具包位置x220/y64/88×44相同。历史图复建先fetch feat/p08-tools-entry-20261004，再`RACK_LEGACY_OVERLAY=1 RACK_PHASE=after node harness/p08-shop-rack.mjs`；CSS/renderer/DPR/safe/build/source身份均见summary与browser JSON。

88项/4文件、type/生产构建PASS；实际320/390/844 short-safe34，5牌/14px名字/三货、全部卡详情取消、工具包开闭保存完整run不变；真实左右调序比对领域结果并还原金币/RNG/实例状态。初始本地observer用了容器局部y，已改读真实bounds；浮点期望改为原公式；短横实际问题修实现，无放宽断言/改超时。未测试购买的额外变体或全店所有视口，不称整个320店面/目标设备通过。

实现COMPLETE_REVIEW；技术PASS；独立审美PENDING；OnePlus/真实GPU/听感NOT_RUN。不推main，不操作PC/域名/部署。仅本范围关闭工程缺陷候选，等待父侧视觉复核与整合。

正常merge已发布main `7b78777347dd854f5759870c7934b8c28279889e`（merge16537dd），保工具包入口和C资源/失败摘要；只有三处文档冲突，双合同均保留。合并后88相关tests/type/build及原三组原生输入PASS，无overlay、不重拍图。`RACK_KEEP_IMAGES=1 node harness/p08-shop-rack.mjs`可重验而保图；最终对齐source/build/全树保护见main-alignment.json与main-aligned-browser.json。当前两张图始终保原身份，不改标main现场。

父侧实际view320 after并读源码，局部方向通过；按调度正常merge已发布main `f10d2d0a6c1f80b199bfeef7272f60b5c962a7ca`，merge源码 `05d66547e92c2d08ac0c7480c4dc8e47d6881f60`，六图T13–T18全部保留。src逐文件同此前已绿reviewc7cd7c5，无运行TS改动；92tests/5files与type、12新增WebP portable及全54工具/道具runtime size/SHA通过。15/39工具图、12/12道具图；朱砂、工具包、失败摘要及所有main公共资源逐树相同。未重拍原图/重跑原生矩阵，旧图身份不变；未合未绿B14计数候选。见f10-main-alignment.json。新精确reviewCI另报，不引用旧CI替代；不推main。
