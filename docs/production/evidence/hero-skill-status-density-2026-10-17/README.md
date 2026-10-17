# 技能状态小字原生密度修正

基线：连续计分候选 `e2e64946f6fabe6fc0e8b369a6b3b52c5bda9d29`。独立分支：`dev/hero-skill-text-density-20261017`。

**独立模块与证据已完成，GameScene 接线按分工留给整合 owner。当前分支尚未改变 GameScene 的产品行为。** `HeroSkillStatusText.ts` 需由 owner 接入 `updateHeroControl`；下述浏览器修后图是在相同候选页面内预演该接线的结果，测试包装器不进产品。

## 原因与修正

`GameScene` 创建 `hero/skill-status` 时直接使用 11px `add.text`，绕过 `SceneView.text` 的实际密度设置。默认位图始终为 55×13 / resolution 1；390×740 手机画布和相机按 DPR 放大，线性采样扩展了低分辨率字形，产生发虚效果。状态文本是 Phaser 内部画布纹理，并非一个被 CSS 放大的 DOM 文本。

`HeroSkillStatusText` 保持字号、颜色语义、位置、origin、scale 和原按钮尺寸，只让状态字形使用 `textDensity(scene)`。所有技能共用的可用、已用、条件未满足、已停用、已选择、待完成、已押目标、换牌中、结算中都走同一入口；没有改技能规则或全局字体/画布策略。

Phaser 3.90 的 `Text.setResolution` 只更新样式并重画位图，未同步构造函数中设置的 `frame.source.resolution`。初次仅调用该方法，实际截图出现文字放大。模块因此同时同步**位图密度与纹理采样除数**，避免把高清纹理当成更大的 CSS 字形。未改全局 `TextRaster` 或 Phaser 依赖。

## 实测链路

Chromium 153 / Phaser Canvas，390×740 CSS 视口，原 `antialias=true`、纹理线性采样、CSS transform none / image-rendering auto。`scene.scale.zoom=1/DPR`，相机 zoom=DPR；实际父容器与状态节点 scale 均为 1，`roundPixels` / `renderRoundPixels` 已开启。模块没有修改这些参数。

| DPR | 实际 framebuffer | 修前状态纹理 | 修后状态纹理 | 修后样式/采样密度 |
|---|---|---|---|---|
| 1 | 390×740 | 55×13 | 55×13 | 1 / 1 |
| 2 | 780×1480 | 55×13 | 110×26 | 2 / 2 |
| 2.625 | 1024×1943 | 55×13 | 144×34 | 2.625 / 2.625 |
| 3 | 1170×2220 | 55×13 | 165×39 | 3 / 3 |

所有行均保持 `fontSize=11px`、logical size 55×13、原坐标/容器变换不变；state、journal、localStorage 在同态修前/修后相同。`report.json` 保存 renderer、CSS、相机/场景、父链、源纹理和采样密度完整记录及被测源码 SHA-256。

已实际查看 DPR 2/3 的原生像素截图。`3-before.png` / `3-after.png` 是按钮区域的设备像素截图；`*-texture.png` 是 Phaser 原始离屏位图，未缩放处理；`390x740-dpr3-before.png` / `390x740-dpr3-after.png` 提供全页上下文。DPR 1/2/2.625 均有对应前后像素图。

## 验证

- `tests/hero-skill-status-text.test.ts` + `tests/viewport-density.test.ts`：22 项通过，涵盖密度、九种同源状态、纹理采样密度同步、DPR 改变、未改变字号/位置及不重复重画。
- `npm run build`：TypeScript 与 Vite 生产构建通过，326 模块；已有 bundle 体积提示保留。
- `node harness/hero-skill-status-density.mjs`：四档 DPR 通过，0 pageerror。使用严格校验通过的公开受控局，经原生菜单导入；修后仅测试页包装 `updateHeroControl` 调用本模块。磁盘上的 GameScene 与指定候选保持 LF 归一化逐字相同。
- DPR 3 另做一次原生选牌→“继续出牌”→结算。实际渲染帧包含可用及条件未满足，均为 11px / resolution 3 / scale 1。最终完整 state 与同一领域命令结果相等；不是自然获得或全旅程验收。
- 保留 `3-style-only-FAIL.png` 与 `style-only-and-observer-FAIL.json`：第一版漏同步采样除数导致放大；首个出牌观察器也忘了正常技能提醒的“继续出牌”确认，未提交命令即回放，得到 invalid-command。采样映射已修正，观察器补正常按钮确认和 commandSeq 等待；未修改提醒、计分流程或断言阈值。

## 整合边界

`GameScene-owner-wiring.patch` 仅新增一条 import，并替换 `updateHeroControl` 中状态的链式 setText/setColor 调用。已执行 `git apply --check --unidiff-zero` 匹配基线，**未应用**。整合 owner 应局部接入该调用，不复制整份旧 GameScene；若行号变化，定位原 `getData('skillStatus')` 更新语句即可。

本包不改 GameScene、计分、Viewport、CSS、字号、触摸流程、资产或存档。不主张物理手机、Safari、Android 原生字体或 WebGL 实机效果已验收；像素证据仅覆盖上述实际 Chromium Canvas 环境。普通 dev 提交/push，不合 main、不查 CI、不部署。

提前跨线程通知目标 `01a0ff29-5792-7524-8980-f2037b2c30ce` 的工具返回 `thread not found`，消息未发送成功；本包继续完成独立模块、补丁和验证，接线以本回执交付给 owner。
