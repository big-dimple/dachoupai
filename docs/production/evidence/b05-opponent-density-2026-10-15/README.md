# B05 高 DPR DOM 坐标补充

修前产品：`03583e15ffc1b3e00c2842e479a51e10ba79da23`。修复及本轮验证产品：`be2cbd1a3010c4b5405166bf497cbdae5a6dfa17`。分支 `dev/b05-opponent-sample`。最后的证据提交不改变产品源码。

## 实际缺陷与修复

`OpponentPresentation.ts` 的 area 来自 CSS 布局，旧代码却用 canvas CSS 宽高除以 Phaser backing 宽高；DPR3 再缩成 1/3，DPR2 再缩成 1/2，位置、尺寸和 compact 判断一并错误。修前真实受控 PlayHand、截图和几何数据保留于 [before/summary.json](before/summary.json)：

| 视口与页面 DPR | 修前实际面板 CSS 尺寸 | 正确 CSS 区域 | 修后实际尺寸 |
| --- | --- | --- | --- |
| 390×740，DPR3 | 122×75.59 | 366×226.8 | 366×226.797 |
| 320×568，DPR3 | 101.33×24.125 | 304×72.4 | 304×72.391 |
| 1366×768，DPR2 | 477×155.91 | 954×311.824 | 954×311.812 |

仅在 `OpponentPresentation.ts:75` 改用项目既有 `cssViewport(scene)` 逻辑宽高换算 DOM 坐标，保留 canvas rect 的 CSS 位置偏移。这样不受 framebuffer density/ceil 影响，compact 阈值也按正确 CSS 高度判断。GameScene、ShopScene、领域规则、目标、事件、保存、时槽与素材在本补充均零改动。未加持久 resize listener，沿原 abort/finally 清理。

`npm run typecheck` 与只读独审通过。没有重跑旧 95 项 B05 规则检查或原 13 场矩阵。

## 已接受的受控验证

全部使用软件 Chromium、产品既有 **低动态模式**，实际导入严格 checkpoint 后，以原生 mouse/touch 选牌并执行真实 PlayHand。夹具、已持资源及公开牌序是受控输入，不是自然获取或自然遭遇。

- [live/summary.json](live/summary.json)：390 DPR3、320 DPR3、PC1366 DPR2 三项全部 PASS。此组不暂停时钟；精确核对 CSS left/top/width/height（误差≤0.5px）、viewport、三个文本块和 Range 行框的原严格 padding 边界。390→320、1366→1024 的真实缩窗中止旧 cue，回看按新区域定位；最终完整 state/journal/IndexedDB 逐字段等于已提交结果。
- [snapshots/summary.json](snapshots/summary.json)：同三项静态截图全部 PASS。
- [resize-snapshots/summary.json](resize-snapshots/summary.json)：390→320 DPR3、1366→1024 DPR2 的实际缩窗后回看截图，两项全部 PASS。
- [post-validation.json](post-validation.json)：复核三份报告全部 PASS、产品 dirty 为空、源码/夹具/harness hash 前后一致、实际 DPR 正确，10 个已记录框均与 CSS 布局吻合；另外复核 live 完整保存三元组相等。

**截图边界：** 静态截图使用真实已出现的低动态 cue，两个实际 RAF 后暂停虚拟时钟，只读确认 cue/eventId/几何仍在，然后用无 clip 的 CDP 截图；未修改 DOM、文字、动画、游戏命令或保存。截图后页面 DPR 与 cue 身份仍一致。截图页随即关闭，和不暂停时钟的 live 页分离。PNG 输出为 CSS 视口尺寸，不能称为原生帧缓冲像素图片；页面 DPR3/backing1170×2220 等真实配置在报告中另列。此法只证明静态几何和文字完整，不证明 850ms 可读性、普通动态时长或高 DPR 快进操作。

root 实际查看全部五张已接受的截图，面板位置和三行文字完整：

- [390 DPR3](snapshots/390-dpr3.png)
- [320 DPR3](snapshots/320-dpr3.png)
- [PC1366 DPR2](snapshots/1366-dpr2.png)
- [390→320 DPR3](resize-snapshots/390-dpr3-resized.png)
- [PC1366→1024 DPR2](resize-snapshots/1366-dpr2-resized.png)

live 与首组三张截图的执行 harness 原字节保留于 `harness-live-snapshots.mjs`，其 SHA256 与各报告匹配。最终 `harness/b05-opponent-density.mjs` 只对缩窗截图分支省去已有 live 证据覆盖的重复初始帧采样；缩窗截图报告记录其确切 SHA256。没有重跑已通过的 live/静态三项来改写原报告。

## 保留的失败与拒收图

修前 `before/` 是真实产品缺陷。以下采样失败/尝试也原样保留，不把其自动 PASS 或缺失面板图片当成验收：

- `first-capture-timeout/`、`second-capture-timeout/`：短反馈在截图/菜单采样期间结束。
- `debugger-capture-aborted/`：Debugger 暂停取图未完成，任务进程已安全终止；没有通过声明。
- `capture-probe/`：暂停过迟，真实 cue 不在，断言失败。
- `capture-probe-early/`、`capture-settled-probe/`：虽有 DOM 几何数据，但 root 实看图中没有 cue，因此拒收其图像。带 CSS clip/缩放的取图干扰了此视口路径，最终无 clip 取图额外核对 DPR/cue 保持。
- `live-extra-skip-timeout/`：额外菜单快进操作晚于短反馈窗口，未签高 DPR 快进。
- `normal-live-sampling-failure/`、`resize-capture-sampling-failure/`：部分普通动态/重复初始帧采样超过窗口，未把这些失败改判通过。

各阶段 harness 原字节快照与原报告 hash 保留，以区别采样脚本版本。`390-dpr3-snapshot/` 是无 clip 的早期有效取图探针，最终验收统一读取 snapshots/resize-snapshots。

没有新图像生成或素材下载重试，没有自然试玩、物理手机、听感、普通动态时长、高 DPR 快进或整体游戏验收。人物/眼神资源与完整镜头美术继续 OPEN。不合 main、不部署、不创建或重试 Forbidden PR。
