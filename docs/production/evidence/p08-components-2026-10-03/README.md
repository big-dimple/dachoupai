# P08统一组件批2 · 实际静帧

4472366d方向早评通过；最终整体审美待独立复核，目标设备／真GPU／听感NOT_RUN，新27WebP未接入。这里是已有游戏图片的真实渲染，不是新原画发布，不进入runtime/public。

21张有界静帧：390×740六人／详情／高清失败可重试／菜单音量／自然1200过关／自然失败重试；PC详情／结果；390待选／五牌／14两行／三货／购买详情；PC工作面／商店；同390视口600／1200／5589三档与reduced；844×300底安全34的商店和19px后景火边界。

[六人选择](390-selector.png) · [完整详情](390-character-detail.png) · [加载恢复](390-art-recovery.png) · [小火](390-fire1.png) · [大火](390-fire2.png) · [极高](390-fire3.png) · [reduced](390-fire2-reduced.png) · [14两行](390-table-fourteen.png) · [PC商店](1280-shop.png) · [短商店](844-shop-safe34.png)

PNG未经改绘或裁切。页截图DPR3，PC及短商店DPR1；fire为Canvas快照，实际density2。CSS viewport／safeInset／字节hash／embedded build metadata／候选src指纹见[证据](../P08-components-2026-10-03.json)。基线2870c623+候选构建，不能称为main现场截图；冻结与发布SHA另记。手势回归在最后配色改动前运行，后续未改手势／几何。短火图显示源计分4050，路线最终5589。

完整能力在共享详情，商店摘要两行。自然路径与受控14／缺钱／满槽导入分开，后者不宣称自然取得。原遮挡／强度／超时合同保留；导入同步等待真实新SceneView，不提高超时。

源码冻结1929ba02e469574eb38b856538459f25f81703c2：1809 tests/content/type/build/Chromium Canvas双端smoke/plan PASS，检查前后源码／索引／HEAD指纹不变。最终提交仅补记这些验证事实，runtime源码树不变；精确远端发布与新CI另报。
