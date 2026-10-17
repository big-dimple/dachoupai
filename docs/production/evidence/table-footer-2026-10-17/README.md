# 底栏与技能独立入口：迁移交接

分支：`dev/ai-stage-regressions-20261017`。本包输入 `36ba1e41984883b4f2b4ae740d67743018ca0718`；底栏产品提交 `86f253e03d9fd24ae9f4407939f2b40525852924`，与此前正确性产品 `ffab8132708429390342a1af3d5acbec21fcf8ef` 分开，可逐批整合。收到转 Windows 本地开发指令后停止扩展，保留全部实现、截图、FAIL 与检查结果。不合 main、不强推、不部署、不启动/查询 CI。

requirementId：TABLE-FOOTER-20261017。依赖既有 SceneView/layout、HeroActionShortcut、HeroPlayReminder。允许 GameScene、layout、HeroActionShortcut、对应 tests/harness 与证据；领域、数值、hash、存档、AudioEngine、DetailDialog、卡图、出分打击感不在范围。

## 已完成

- 底栏统一为“弃牌 —〔点数／花色／AI 切〕— 出牌”；三块理牌各 44px，主动作在 320px 仍为 67px/93px，按钮高度至少 44px；完整弃牌热区不再被技能切分。
- 技能独立显示“技能 · 交棒”等标签。竖屏及桌面放在手牌上方原工具区，短横放侧栏技能位，短横旧说明文字让出该入口。桌面预览在技能前收住；手牌、每张牌的选中抬升/点击几何、计分区域保持原值。
- 复用原 HeroPlayReminder，未重写提醒或存档偏好。现有合同是已加入引导的新局首两场、每场最多一次，尊重明确关闭引导/不再提醒。技能当前可用且尚未选择主动操作时，玩家可返回用技能、明确继续出牌或取消回选牌；不会自动发动技能。长局每手强制提醒不在原合同，也未擅自新增。
- 父反馈的 `assist-profile-ui-copy` 原保护测试实际复核 4/4 PASS，测试文件未改；修复来自前包恢复原始 defs。日志另见 `../ai-stage-regressions-2026-10-17/assist-profile-ui-copy.txt`。

## 实际验证

`unit.txt`：4 文件 85 项通过（layout、hero-payoff、hero-play-reminder、assist-profile-ui-copy）。`typecheck.txt`、`build.txt` 通过，保留原大 chunk 提示。`original-assertions-FAIL.txt` 保留新布局与旧位置/宽度期待的失败；保留全部最小命中区、互不遮挡及九牌保护，按新顺序更新位置期待，并加强独立技能不切弃牌、AI 与技能不相交的断言。

浏览器为 Chromium 151.0.7922.173、软件 Canvas、开发 E2E 源服务。夹具使用当前真实新局身份，合法命令入场后设置并验证公开九牌/容量，非自然发牌或获得率结论。仅 UI 鼠标/真实触摸输入发命令；CDP 原生触摸序列查滑选。报告记录 GameScene/layout/HeroActionShortcut 源 SHA256，已与产品提交逐个核对。

| 场景 | 最终证据 | 实际结果 |
| --- | --- | --- |
| PC 1366×768 | `after/report.json` desktop | PASS：顺序、独立技能、按钮及标签界内；真实点数/花色 ReorderHand 完整状态等于领域同命令；AI 只选牌；提醒“返回用技能”不发命令 |
| 320×568 | `after/report.json` narrow | PASS：九牌可见、原触摸滑选、主按钮可点；提醒“继续出牌”双击仅一条 PlayHand，完整领域状态和保存相等，未替玩家使用交棒 |
| 390×844，顶部12/底部34 | `safe-resize/report.json` phone-safe34 | PASS：安全区与标签、原触摸滑选；旋转740×320缺口后回竖屏，完整 state/journal/storage 和选择不变；提醒取消不发命令 |
| 740×320，左44/右12/上12/下20 | `safe-resize/report.json` short-notch | PASS：独立侧栏技能、底栏、九牌原座位、真实滑选、提醒取消不改局 |

每个场景及旋转都将实际 layout.hand/cards/scoreBoard 与输入提交的原 layout 独立模块逐字段比较，完全相等。所有最终 PASS 场景无 pageerror。

`initial` 保留观察器对 Phaser Rectangle 错用 toJSON 的 FAIL。`after` 中两条安全区 FAIL 是测试注入 CSS insets 后未改变 backing canvas、渲染尚未重排；改用真实窗口 resize 后，仅复核原两失败场景，见 `safe-resize` PASS，不重跑已通过 PC/320。前后产品源码哈希相同，没有通过修改产品/降低断言洗绿。

## Windows 接续与剩余边界

所有改动普通提交保存，仓库应无未提交差异。无需续跑远端检查。后续在 Windows 拉取本开发分支，整合后再做有界本地验证；两个浏览器 harness 当前使用 Linux `/usr/bin/chromium`，Windows 接续需改为当地 Playwright Chromium 启动路径。此次未验 Windows、物理手机、Firefox/WebKit、GPU/帧率、音频听感、生产 bundle 浏览器路径、自然长局或整体平衡。

未运行全套测试或 CI。另两路音频/卡图继续各自负责，本路没有覆盖或修复其 source-stage-art 派生资源问题。
