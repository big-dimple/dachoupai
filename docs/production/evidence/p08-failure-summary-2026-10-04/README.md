# P08 失败结果摘要 review

基线 main `7d44b8bcada32942acded87d70abe78dea12f275`，候选源码 `9e1a176ddb5cc7ec948b698adc85da568c3dd62c`。仅失败结果区加入已保存的结束原因、已验证最后一手和真实剩余出/弃次数；不重设计结果布局。矮横屏留原因，完整记录沿已有本场详情查看。

自然输入：`p08-low-singles` / 老幻，逐次选择当前最低点数单牌并点出牌，真实失败95/400、差305、最后一手高牌25；另一条自然`d43-fire-1`/老幻打五张方块路线实际1200、奖励8金。没有导入局、预演、自动出牌或未来牌读取。

两张对比均实际view。CSS390×740、DPR1、安全区全0、Chromium软件Canvas（禁GPU/software-rasterizer）、reduced-motion、4×。build版本/候选指纹与准确SHA见summary和前后browser JSON；后图embedded7d44、modified=true，不能称为main现场版本。桌面1280×720与短844×300只核实际文字/状态，无额外截图；短屏完整本场详情原生打开/关闭通过。

35受影响单测/4文件、type及生产构建PASS；自然胜敗→resize→刷新继续完整run不变、实际继续商店/同种子重试PASS。首次颜色疑点被实际11.12对比度否定，没有修改正常配色；新unit夹具遗漏倍率字段的5个FAIL修正合法夹具后通过，没有改评分/断言。旧7d44已正常main并精确CI通过；不以旧CI证明本候选。

四状态：实现COMPLETE_REVIEW；技术PASS；独立整体审美PENDING；OnePlus/真实GPU/听感NOT_RUN。候选仅review，由父协调发布；不操作域名/PC/部署。工具快捷入口、T06–11与朱砂演出/原画生产属于其他任务，本轮未接。

## 对齐当前 main

正常合入`2d999cd938e5c19253daa8ddbd1cf25facf2d9e4`，合并源码`0aa73999854044771955c60dea8ef3ada22c7b33`。只有UX文档冲突，两条合同都保留。65项/6文件受影响测试、type与生产构建、自然胜败/resize/刷新继续/短摘要详情/同种子重试PASS；未补拍，原图身份和像素保持。GameScene/ScoreFlame/audio、72中央文案、domain/application/content、public/art对象逐项同main；失败摘要两文件同已接受3f7950f。详见main-alignment.json及main-aligned-browser.json。320构筑裁切仅记OPEN，待另任务修；精确新review CI随最终SHA单独报告，main不推进。
