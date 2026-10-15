# 原 DPR3 浏览器 CI 性能诊断

开发分支 `fix/shop-upgrade-base-stats-20261015`。原升级冻结点 `3db8b777a2b7e213f912fa9f980890c363c5b042`，基线 `4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`；只读观察器 `de82cf4076b95a8de81215b969e794fdf822052a`；性能修复 `3782da11788bcedf7722db09958715ba417039e5`。本目录后续提交只保存证据。

## 结论与修改

Chromium 在 CI 选中了 ANGLE / SwiftShader 软件 WebGL。两份旧源码的 DPR3 对局只有约 1–2 FPS，逻辑 poststep 内 CPU 时间平均仅 0.12–0.13 ms，提交绘制平均 7–9 ms，帧间隔却达 557–950 ms。瓶颈在软件图形路径；不是升级说明的计算。两份旧源码的 `src/main.ts`、`src/platform/Viewport.ts`、`harness/screenshot.mjs` 完全相同，基线本身也重现慢帧。

产品只新增 `prefersCanvasRenderer` 并接入启动配置：明确识别 SwiftShader、llvmpipe、softpipe、Software Rasterizer、Microsoft Basic Render Driver 时用 Canvas；硬件、未知或隐私遮蔽的渲染器保留 Phaser.AUTO。无 WebGL 时沿用 Canvas；临时探针释放上下文，受限扩展不阻断启动。没有用户代理 / CI 环境特判。实测 Chromium 即使设置 `failIfMajorPerformanceCaveat: true` 仍返回 SwiftShader，故不能只依赖这个选项。

没有改 `ci.yml` 的 15 分钟预算、原烟测步骤/断言/等待、原动画、DPR、像素预算、资源、领域数值、存档和 RNG。`protected-trees.json` 记录五棵保护树在三个产品点的精确 tree ID。原升级基础值功能与原费用、利息、共享次数、返回来源、事务失败重试保持；本次不改商店业务源码。此前 19 例 DPR1 / reducedMotion 的商店验收不是本次性能证据。

## 原版环境实测

全部下表来自 GitHub Actions 原固定 Playwright 1.63.0 noble 镜像（SHA256 `eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27`）、Node 22.23.3，Chromium 153.0.8010.12 / Firefox 155.0。执行原 `SMOKE_BROWSERS=<engine> SHOT_PROFILES=mobile npm run verify:smoke`，只额外加载只读 JSONL 观察器；launch options 为 `{}`，无系统浏览器替换、渲染器强制参数或 reducedMotion。

所有行均为 390×740、DPR3、1170×2220 backing、正常动画，并通过同样 90 次 poststep 等待、44 次原生触摸调用及完整原断言。耗时从 browser context 创建到关闭前快照，不含 npm/build/container；FPS 是刷新前 game 阶段帧间隔平均值，非硬件性能承诺。

| 源码 | 引擎 / renderer | 流程秒 | poststep 平均 / P95 ms | game 平均 FPS |
| --- | --- | ---: | ---: | ---: |
| 4d2ff4ca | Chromium / SwiftShader WebGL | 608.20 | 817.70 / 989.15 | 1.05 |
| 3db8b777 | Chromium / SwiftShader WebGL | 354.40 | 481.03 / 582.01 | 1.80 |
| 3782da11 | Chromium / Canvas | 19.24 | 21.80 / 32.99 | 43.91 |
| 4d2ff4ca | Firefox / Canvas | 21.85 | 41.38 / 56.98 | 35.36 |
| 3db8b777 | Firefox / Canvas | 21.08 | 40.76 / 54.28 | 35.88 |
| 3782da11 | Firefox / Canvas | 21.36 | 39.81 / 56.34 | 34.63 |

旧版两次原 CI 手机 609/614 秒、Firefox 21/22 秒，由用户报告；本次实读 run 38684066600 的 attempt 2 日志，Chromium 手机约 614 秒后 Firefox 约 22 秒，随后 WebKit 阶段整作业取消。保留 `original-ci-38684066600.log.gz`。新独立 runner 对照中 3db 为 354 秒，说明软件渲染速度有明显 runner 波动，不能把单次 354 对 608 的差值解释为升级文案加速。

分阶段时间（刷新前，秒）：

| 引擎与源码 | title | character-select | shop | game 至刷新前 |
| --- | ---: | ---: | ---: | ---: |
| Chromium 4d2ff4ca | 40.71 | 39.71 | 30.48 | 458.00 |
| Chromium 3db8b777 | 23.27 | 22.94 | 16.25 | 268.52 |
| Chromium 3782da11 | 0.97 | 0.93 | 0.88 | 14.04 |
| Firefox 4d2ff4ca | 1.36 | 0.91 | 0.98 | 14.91 |
| Firefox 3db8b777 | 1.31 | 0.88 | 0.89 | 14.44 |
| Firefox 3782da11 | 1.34 | 0.92 | 0.88 | 14.68 |

每次刷新前都观测到 26 次 image/bitmap decode；Chromium 基线 / 原升级 / 修复单次最长为 1362.5 / 796.7 / 37.5 ms，Firefox 为 31 / 28 / 42 ms。它们是 Promise 开始至完成的墙钟时延，包含忙碌图形路径下的回调等待，不能冒称纯解码 CPU 耗时。解码已完成后旧 game 仍持续慢帧；修复后 game 615 帧中没有 >100 ms 间隔。JSON summaries 同时保留资源加载、长任务、每阶段 step/render 和重新加载阶段数据。

原版四组对照：[run 38690306580](https://github.com/big-dimple/dachoupai/actions/runs/38690306580)。修复两组和原 artifact 汇总：[run 38691130026](https://github.com/big-dimple/dachoupai/actions/runs/38691130026)。两者均完成，所有适用 job 成功；`compare` 在修复分支按设计 skipped。四份原始 JSONL 与 smoke-result 由第一 run 的四个 artifact 保留；汇总日志和本目录 `ci-original-summaries.json` 可审阅，无重造数据。

## 本地有限验证与失败保留

- 读取仓库 AGENTS 当前入口；工作区 `.agents` / `.codex` 空，无额外适用技能。按本次 Astra / 性能诊断授权串行执行，无子代理、无自然试玩、不合 main、不部署、不重试 Forbidden PR 创建。
- typecheck 通过；定向 5 文件 45 项通过，追加扩展受限启动保护后 renderer 14 项再次通过（最终 46 个不同定向案例）。覆盖明确 CPU / 真实硬件名称 / 隐私遮蔽 / 无 WebGL / 探针异常和释放，以及原 viewport、商店事务及结果。
- 本地原版 Playwright 浏览器 CDN 和原 CI Docker 镜像被网络策略 403 拒绝；保留 `checks/browser-install.log.gz` / `checks/container-pull.log.gz`。没有改用别的源绕过。通过原 Actions 官方镜像完成上面的原版验证。
- 本地系统 Chromium 151.0.7922.173 仅作辅助。旧版完整 mobile 烟测成功约 700 秒；第一轮修复 mobile 同时受旧 SwiftShader 高 CPU 占用，约 80 秒浏览器流程，不能拿它与隔离 runner 作速度比较。原始 JSONL / 日志压缩保留。
- 创建辅助 worktree 尚未结束时误启动一次测试，缺少 node_modules 导致启动失败；保留 `checks/fixed-startup-failure.log.gz`。等 checkout 和依赖链接完成后才重跑成功，不属于产品断言失败。
- 随后在产品精确 HEAD 3782da11（dirty 仅本证据目录）独立跑原 desktop + mobile 全烟测，DPR1 / DPR3、正常动画、原鼠标/触摸，均 PASS。`local-final-smoke-result.json`、`local-final-summary.json` 和 `final-local.*.gz` 为该次数据。实际查看并保留 1280×720、390×740、844×300、360×640 四张截图与 SHA256；菜单/手牌/动作可见，横竖缩窗完整状态相等，固定资源动画观察器仍抓到 1.6 倍脉冲。物理设备和硬件 GPU 路径未验收。

精确产品提交的完整 CI：[38691130036](https://github.com/big-dimple/dachoupai/actions/runs/38691130036)。领域 251 文件 / 3505 测试及 content 检查成功，docs 成功；Chromium、Firefox、WebKit 各 desktop / mobile 六条原烟测全部成功。完整作业从 06:13:21 至 06:18:09 UTC 约 4 分 48 秒结束，15 分钟预算保持。`ci-status.json` 记录原始提交 SHA、run 状态与 job 状态，`product-ci-browser.log.gz` 保留构建和六条烟测的完整日志。

2026-10-15 暂停后，按用户明确恢复指令使用 Sol 6.1 收尾：只复核既有数据、补入日志、整理本证据目录。未重跑已完成的测试或浏览器全套；证据提交标记 `[skip ci]` 避免仅增加报告再次触发全套，所引用绿 CI 明确属于产品提交 3782da11。产品源码、测试、观察器、工作流和锁文件与该已验提交保持相同；未合 main、未创建或重试 Forbidden PR。
