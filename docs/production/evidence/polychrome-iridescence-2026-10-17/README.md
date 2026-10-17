# 多彩持续虹彩与忘招流光

- 分支：`dev/polychrome-iridescence-20261017`；初始基线 `e389ea2c4a7f6d49284546f91992d13055072655`。
- ShopScene 释放后合入四区最终 `7db6e8395b10f58b19986c181e0e29fd8d4b2192`，保全其结构及额外数值文案。产品：`d365708bcd8ae77597c9b7c4e17c57d48b82284f`。
- 初组件 `18a864fa`；真实竖屏检查发现 top-left/DPR 相机的 `worldView` 误裁切，`6373684e` 的矩阵修正又遇私有类型错误，最终 `7d4327de` 改用公开 `getWorldPoint`。请整合最终分支，不能只取初组件。未改 main。

## 产品范围

ShopScene 的 PC 货架、竖屏货架和已持有牌使用当前实际美术框，在 `hoverCard` 后换算为 `hover.art` 的局部坐标挂载。保留多彩标签和原有“额外倍率×1.5”适配器；单条细虹彩贴边循环，透明中心，不依赖 hover/点击/计分，不新增套框、材质贴图或 shader。普通、闪箔、全息不创建该效果。

共用更新器每场景一个，最高 15 次/秒、48/64 段细边；无需 tween/粒子/额外纹理。父层隐藏/透明、场景隐藏、相机排除、离屏均停止重画；文档隐藏直接停止更新；销毁最后一条边或 Scene shutdown/destroy 解除订阅。系统及游戏内减少动态显示静态虹彩。

忘招仅白名单 `S05` 使用独立暖金流光，既无虹彩也不带版次/倍率元数据。已接 PC/竖屏消耗工具货架和原生道具箱，其余高价工具不加。真实规则已核：两个不同且已发现的牌型，受益原等级≤27，牺牲原等级≥2；升3级/另一种降1级，使用另付3金。规则、价格、倍率、稀有度、技术ID及存档均未修改。

## 实际检查

- `npm exec vitest -- run tests/polychrome-iridescence.test.ts tests/joker-extra-bonus.test.ts tests/joker-extra-bonus-copy.test.ts`：3文件18项通过。
- `npm run typecheck`、`npm run build`：通过，336模块；保留既有大 chunk 提示。
- `node harness/polychrome-iridescence.mjs`：Windows / Node v22.20.0 / Playwright Chromium，PC 1366×768 DPR1、竖屏390×844 DPR2各通过；实际 renderer/browser 见 [report.json](report.json)。模拟窗口不是物理手机性能验收。
- **真实 ShopScene 接线**：受控合法五槽存档，四张多彩持有牌、一张普通持有对照、货架一张多彩与两张普通。PC无输入4196.6ms、竖屏3922.5ms，第一张边重画分别从6→66、5→62，全部五条边持续变化。OS减少动态3300ms内 phase/draws 完全静止且边仍显示。
- PC/竖屏忘招货架及道具箱各无输入3600ms持续；道具箱只有S05加效果，T17对照不加。减少动态静止、关闭道具箱后移除类和监听；宿主隐藏、移出视口、受控 `document.hidden`、离店与场景销毁清理通过。
- 查看期间领域 state/journal 字节一致，摘要见 report 的 `unchangedStateHash`。隐藏/离屏/停场为受控生命周期调用，不冒称真人原生操作。
- **GameScene 仅受控组件挂载**：各端在真实牌桌容器上挂四条边，3600ms持续且停场销毁；没有写入 GameScene 产品源。不能将此项签为正式牌桌接线完成。

浏览器实际运行在产品提交前的相同源码上；report 保留当时 HEAD `afa4760df7ff4e94ef78cc31988a76fe82141187`，不改写为产品 SHA。随后逐一核对五个产品源的原字节 SHA256，并记录产品 Git blob 与构建 JS/CSS 哈希，见 [source-binding.json](source-binding.json)。

## 过程证据

- [PC连续过程视频](pc-process.webm)、[竖屏连续过程视频](portrait-process.webm)：包含无输入流动、静态降动态、忘招货架/道具箱及离店。截图不能代替这两段动态证据。
- [PC起点](pc-no-input-0.png) / [PC终点](pc-no-input-3.png)，[竖屏起点](portrait-no-input-0.png) / [竖屏终点](portrait-no-input-3.png)。
- [PC静态虹彩](pc-reduced.png)、[竖屏静态虹彩](portrait-reduced.png)，[PC忘招道具箱](pc-forget-inventory.png)、[竖屏忘招道具箱](portrait-forget-inventory.png)。
- 原竖屏误裁切 [FAIL报告](before-phone-culling-FAIL.json) / [FAIL图](before-phone-culling-FAIL.png)保留。前两次观察器缺新版入场按钮的失败没有改产品/放宽断言，修正原生入场等待后重跑。

## 待 owner 的 GameScene 接线

`mountPolychromeCardIridescence(scene, host, bounds, edition)` 的 bounds 是 host 局部坐标。无需另接清理或偏好监听。`mountForgetTechniqueAttention(scene, host, bounds, toolId)` 仅接受 S05；原生库存已接 `mountForgetTechniqueAttentionElement`，它在所属 dialog close 时清理，非dialog调用者应保存返回的 disposer。

`renderJokerRack` 原画之后、名称/数值之前追加：

```ts
mountPolychromeCardIridescence(this, marker,
  {x:-b.width/2,y:-b.height/2,width:b.width,height:b.height},j.edition);
```

`editionTrim` 的 polychrome 分支应调用同一组件，跳过原多条套线和呼吸 tween，保留其原标签逻辑；foil/holographic 维持原行为。回看临时 joker 容器应读取本手 `sourceJokers` 的真实 edition 再挂，不从当前局反推。该文件仍由 `01a147f6-89d8-77a0-9ec2-d975e10fb023` 持有，本分支没有覆盖。

真人审美、自然购买率/全局长玩、实际手机帧率/听感、最终合版的 GameScene 正式动态验证：NOT_RUN。P08保持in_progress，无整体完成百分比、CI/域名/部署操作。
