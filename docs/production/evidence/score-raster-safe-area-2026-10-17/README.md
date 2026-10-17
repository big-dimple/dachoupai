# 文字采样根因与计分峰值安全区 · 2026-10-17

基线 `2a090feec92e0f646aeac484742560f9d955464c`。产品只改 `TextRaster.ts` 与 `ScoreTableReadouts.ts`，是交整合 owner 的独立小提交。原 `3611741ca8be0e19989b626b9a37defef71b91cf` / e2 的 [文成、花蕊失效证据](https://github.com/big-dimple/dachoupai/blob/3611741ca8be0e19989b626b9a37defef71b91cf/docs/production/evidence/wencheng-huarui-dynamic-2026-10-17/README.md) 保持原样。

## 根因及最小修复

Phaser 3.90 Canvas 的实际 batchSprite 使用 `frame.source.resolution` 除纹理宽高，Text 的逻辑测量使用样式密度。既有 `crispText` 改样式而未同步纹理源，导致实际绘制翻倍，逻辑 getBounds 仍可通过。

现在在 `crispText` 内先同步纹理源密度，即使样式已正确也修正落后的采样除数，再按原条件更新样式。没有改密度策略、字体常量、全局 Canvas 配置或 Phaser 依赖。既有来源 Text 构造密度（2a）和 efb 状态小字模块保留，数值一致时不会新增重画。

计分数值每格向内预留2个逻辑像素，随后继续用原 `1.54` 峰值预留、实际字体测量、居中锚点、`scorePulseFrame` 宽高/抬升约束。原 NumberImpact、numberPulse、跳动时长和幅度参数均未修改，没有关闭动画或用位移掩盖错误采样。GameScene、规则、存档、音频和素材未改。

## 同一事件“75 × 2 = 150”修前/修后

实际截图均为390×844 CSS、DPR2、780×1688原始 framebuffer，未经缩放或后期编辑。两张图 eventId 同为 `bounded-dynamic/amo/hand/bounded-dynamic/amo/command/4/event/4`。计分框为 `(12,153.6,366,132)`，下缘285.6。

| 实际 Canvas 绘制量，CSS像素 | 修前 | 修后 |
| --- | ---: | ---: |
| 热度75 样式 / 纹理源密度 | 4 / 2 | 4 / 4 |
| 热度75 纹理原始宽高 | 180×192 | 180×192 |
| 热度75 绘制矩形宽高 | 115.82×123.50 | 57.95×61.77 |
| 热度75 绘制下缘 | 326.78，越框41.18 | 265.20，框内 |
| 总分150 绘制右缘 | 431.74，超390视口 | 340.66，视口内 |

[修前原图](observed/before-75-peak.png) / [修后同事件原图](observed/after-75-peak.png)。两次正常采样的同事件近峰帧比例分别为1.27977和1.27357；没有暂停或强制动画时间。全手实际采到的热度最大比例保持约1.280，乘倍率最大比例修前1.53939、修后1.53939，补同事件图的那一手为1.53967，证明强度保留。全部精确尺寸与源码SHA见 `summary.json`。

## 有界回归

在实际 Canvas context 包装 drawImage，原样转发调用，并在绘制时读取真实 destination rectangle 与 current transform；POST_RENDER 才保存图片。由实际 framebuffer 映射回 CSS 像素。包含 Canvas 的 roundPixels 扩边，未用 getBounds 替代绘制范围，也没有复制计分或字体算法。

| 案例 | 渲染采样帧 | 密度不匹配 / 越界 / 数字互相重叠 | 真实结果 |
| --- | ---: | --- | --- |
| 苏轼390×844 DPR2，修前复现 | 289 | 747 / 747 / 0 | 原缺陷复现；功能提交仍为300 |
| 苏轼同公开手牌，修后 | 288 | 0 / 0 / 0 | 热75、倍率4、总分300 |
| 文成390×844 DPR1，361夹具 | 280 | 0 / 0 / 0 | 热79、倍率3、总分237；×1.5右缘352.5 |
| 花蕊390×844 DPR1，361夹具 | 281 | 0 / 0 / 0 | 热79、倍率6、总分474；×3完整 |
| 苏轼同事件对照图补采 | 288 | 0 / 0 / 0 | 同手300；只为精确75对照，没有扩矩阵 |

修前报告的 status=PASS 仅指成功完成复现和保存核对，**其视觉结果为FAIL**；不能把747次越界签为通过。修后三个案例及补图均对密度和实际边界断言为0，外部汇总另核全部原始帧的数字相交数为0。每笔都由正式菜单导入既有校验通过的公开checkpoint，真实选牌/技能选择/出牌，一手结束后的完整state、journal、storage与canonical applyCommand全等。全部0 pageerror，运行期间源码哈希不变。

`harness/fixtures/wencheng-huarui-dynamic.ts` 原样复用361的夹具，Git blob同为 `1727574751f5a0572db3ea01868c29b36a698455`；没有重新安排规则或未来结果。苏轼复用c197所留受控checkpoint。文成/花蕊只各一手真实兑现，没有重跑原复核的全部流程或六英雄长矩阵。

已实际查看两张75对照、苏轼乘倍率以及文成/花蕊乘倍率截图。原始draw矩形/样式/采样密度/峰值/事件在 `observed/*-report.json.gz`，三张乘倍率图保留在同目录。没有把旧e2失效证据改成PASS。

59项相关测试与 `npm run build`（含typecheck）通过，见 `checks.txt`。密度回归还验证“样式已正确、纹理源仍旧”时能修复且不重复重画。不是实体手机、Safari/WebGL、听感或整体P08签收。

复现：

```powershell
$env:RASTER_CASES='amo,azao,xiemu'
node docs/production/evidence/score-raster-safe-area-2026-10-17/observe.mjs after
```

`RASTER_CASES=amo` 配 `after-match` 只补同事件75图；`before` 需在原2a产品上运行，其意图是保留失败复现。所有产物写入独立 shots/score-raster-boundary/<phase>，不覆盖旧证据。
