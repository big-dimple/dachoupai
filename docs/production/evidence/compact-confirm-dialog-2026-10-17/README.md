# 短确认框留白修复

承接 main `f81724b57736c7d4f299cf1d95705a7ba3ef9497`，独立分支 `dev/compact-confirm-dialog-20261017`。被测源码 SHA-256 见 [report.json](report.json)，测试使用该 base 加本包改动；本回执不把 base 冒充已提交修复版本。

共享入口实际为 `DetailDialog`。原全局样式把短确认也固定到 880×780。新专属样式仅匹配纯文字正文与操作区：宽度上限 520，内容高度，在原安全区内居中；正文与按钮紧邻，取消在左、确认在右。图鉴、表单、插画和扩展内容继续使用原详情工作区及滚动。正文不缩字，按钮至少 48px。原关闭按钮明确使用 `type=button`；Tab / Shift+Tab 在可见、启用的控件间循环，关闭后沿原路径恢复焦点。

没有修改 CharacterSelectScene、ShopScene、GameScene、资源、规则、存档或新局创建代码。接口不变，无需选角工作者接线。仅开发分支交付，不合 main、不查询 CI、不部署、不跑长局；P08 状态与正式验收门保持。

## 实际验证

- PASS：`npm exec -- vitest run tests/detail-dialog.test.ts tests/hero-play-reminder.test.ts tests/amo-launch.test.ts tests/selection-layout.test.ts tests/recovery-save.test.ts tests/recovery-queue.test.ts`，6 文件 / 161 项；Windows 沙箱临时目录的 rename 被拒后，使用工作区 `shots/tmp` 重跑通过。
- PASS：`npm run typecheck`、`npm run build`、`git diff --check`。
- PASS：`node harness/compact-confirm-dialog.mjs`，Chromium 153.0.8010.12、DPR 1、独立浏览器上下文，测试编译后的 e2e 构建；四尺寸均实际走首页 → 新局 → 商店 → 返回选角 → 选英雄与路线 → 替换确认。
- PASS：初始焦点为取消，双向 Tab 循环；Enter 在取消上、按钮取消、Escape 保持完整 state / journal / save slots；仅打开不创建新局。确认后旧 checkpoint 为备份，新局没有额外命令；PC 实际双击确认；刷新后从首页继续，恢复同一新局。
- PASS：受控 65 行长文字在正文区滚动，底部操作可达；受控扩展目录结构恢复原详情高度。真实图鉴保留原详情高度与滚动，Tab 可进入搜索框，关闭后完整进度不变。这些受控长文不是新增产品内容。
- 已查看本包 PC、390、320、短横截图像素，确认正文与行动相邻，没有大块填充或装饰。截图是本地软件浏览器结果，不签真人理解或物理设备体验。

| 屏幕 | 实际确认框 | 截图 |
| --- | --- | --- |
| 1652×924 | 520×248.75 | [PC](pc.png) |
| 390×844 | 352×232.75 | [390](390.png) |
| 320×568 | 282×257.5 | [320](320.png) |
| 844×300，安全区 top12 / bottom34 / left18 / right10 | 520×203.75 | [短横](short.png) |

## 保留的失败与边界

原截图 Library `libfile_5a92f03748948191b7d618ef1ecda131` 的消费端材料化 **BLOCKED**。已读取当前 Library skill 与 materialization 指南，获取原版下载 helper，准备该 ID，并使用本机 Python 3.14 执行。默认 `python.exe` 首先报 WindowsApps 别名不可执行；实际 Python 在沙箱内报 `library file transfer failed: download failed`。批准联网后下载继续至元数据步骤，精确错误为 `AttributeError: module 'os' has no attribute 'setxattr'`，发生于 `LibraryFileTransfer` helper 的 `xattr.apply`。未修改 helper、伪造元数据或借用父任务 cloud 路径；没有成功材料化可验的原图，未查看原截图像素。短期下载描述已清理。因此原图对照仍待；本包截图不能代签该要求。

浏览器第一次在沙箱内访问本机服务报 `net::ERR_NETWORK_ACCESS_DENIED`；授权环境的开发服务器依赖扫描又超时。最终改为编译后的本机 preview 验证通过。布局试验中 `height:auto` 被原上下 inset 拉满，以及 grid 内容轨道不能压缩长文的问题，均在最终 `fit-content` + flex 版本复验通过；原生 Tab 末端离开按钮的问题由本包边界循环修复。源码最终指纹与四尺寸结果详见 report。

未运行：原图像素对照、Firefox / WebKit、本轮物理设备、真人审美与理解、音频听感、长局、CI、部署。仅原图材料化受阻；本轮代码与本地验证完成。
