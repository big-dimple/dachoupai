# 底栏理牌分组：待 GameScene 所有人接线

输入 main `212e23d547d4fcfdd886f9dfe80699318e77a738`；开发分支 `dev/hand-action-footer-20261017`。只改底栏专属 `HandActionControls.ts`、`layout.ts` 最终底栏段及对应测试。**没有改 GameScene，也没有整局接线验收；开发分支须与本目录最小补丁一起整合。**

## 已交付

- “理牌”为组内顶部居中的 11px 非交互标签，独占 14px 标题行，下排只有点数、花色、AI。
- 中间组 PC 144px、手机/短横 132px；下方触控分别 48×44、44×44，左右弃牌/出牌等宽。390px 两侧 93→111px；320px 两侧 62→80px；PC 480px 底栏两侧 150→162px。
- 底栏 58px 高；紧凑手机避让原状态行，不侵占手牌席位。既有非底栏布局指纹、九张手牌、技能区域、牌型/得分区保持。没有改技能位置或名字，保留给指定工作者处理。
- `handAiButtonLabel` 只把 ready 名称设为 `AI`；计算、稍候、不可用反馈仍分别为 `AI\n计算`、`AI\n稍候`、`AI\n不可用`。没有改 AI 计算、key 校验、取消、禁用或计分逻辑。

参考已实际下载查看的 [Steam 官方截图](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2379780/ss_075cb45cbfa97d8139fb11f21667d6e35f908640.1920x1080.jpg?t=1790693638)，[商店来源](https://store.steampowered.com/app/2379780/Balatro/)。仅借鉴标题在组内上方的结构；唐宋牌保持左弃牌、右出牌，AI 是本项目自己的第三按钮。

## 最小接线

[GameScene.integration.patch](GameScene.integration.patch) 已通过 `git apply --check`，**尚未应用**。由父级协调 `01a147f6` 所有人处理：

1. 导入 `renderHandSortGroup`、`handAiButtonLabel`。
2. 原 `brief` / 手绘分组 / 左侧理牌标签代码换为 `renderHandSortGroup(this,v,l.tools)`；点数/花色固定短名称；AI 初始标签调用 `handAiButtonLabel('ready')`，保持初始禁用。
3. `refreshSelection` 只替换一行 `setText(handAiButtonLabel(aiState))`。`aiState` 计算、`setEnabled`、输入回调及串行命令原样保留。

技能按钮的固定位置、前缀与命名不在本补丁中，继续由 `01a147eb` 统一接口。父级发消息工具曾对源线程 `01a0ff29-5792-7524-8980-f2037b2c30ce` 返回 `thread not found`；未发送成功，因此用本补丁及最终交付回执报告接口。

## 验证与边界

- PASS：`npm exec -- vitest run tests/hand-action-controls.test.ts tests/layout.test.ts tests/ai-hand-action-cancellation.test.ts`，3 文件 / 75 项。旧 168px/两侧宽度预期按新布局更新，原窄屏状态行交叠试验已修正；未放宽 44px、安全区、手牌/分数/状态避让断言。
- PASS：`npm run typecheck`、`npm run build`、`git diff --check`、`git apply --check`；GameScene 的源字节与输入版本相同。
- PASS：一次隔离组件页检查 PC / 390 / 320，使用真实 `SceneView` 按钮及本模块绘制；按钮标签包围盒完整、五个触控区至少 44px，实际点击三个“理牌”标题均未触发按钮。局部截图已看像素，标题可辨认，三个操作在下排。余次为示意数据，不是运行时状态证据。见 [组件图](components.png) 与 [指纹及几何结果](report.json)。一次性 fixture 位于忽略的 `shots/hand-action-footer`，未新增产品测试入口或后门。

PENDING：所有人应用最小补丁后的真实 GameScene 接线检查；当前 dev 直接运行仍使用旧标题与旧 ready 文案，不能按已完成页面验收。未跑整局/重复浏览器矩阵、未改 main、未查 CI、未部署，P08 与真机/真人验收门保持。
