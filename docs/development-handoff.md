# 当前交接：P08单卡体验样板

D37 当前发布候选（2026-10-02）：基于资产维护main `0f1f0a6`，代码提交 `f72ffc5`统一固定稀有度标志并修复缩略图一次失败后不恢复。47项专项测试、类型/构建、7组Canvas浏览器检查通过；自然首屏、自动/人工重试与状态同步已验证，见[D37证据](production/evidence/D37-2026-10-02.json)。父会话明确本轮只发布这些修复，停止等待新图：f04/e07的Library消费有界失败，原创source仓库发布另触发产品审批，未获批准前不继续、不换路绕过；两张仍为机制示意。本轮不包含用户新反馈的滑选背景色/滑出屏幕保留选择，留下一有界回合。最终verify:ci已通过：1675项测试、content、build、Canvas桌面/手机smoke、plan；后续仅记录文档证据。按既有授权正常push main并核对SHA/CI，P08保持in_progress；不把Canvas通过视作WebGL或真机验收。

D36继承提交 `0f1f0a6` 的远端Chromium两视口、Firefox两视口、WebKit桌面已通过；原Firefox手机遮挡断言通过。WebKit手机没有完成记录，整体任务cancelled，不能记作整套CI成功。

资产维护整合（2026-10-02）：原独立提交 `bb53b01651854f29daa9ec87210df20a81aac7be` 已按用户新授权整合到 D36 main `beb91fd668276bb8bbf4cab59572b501af93a191`；只做 Linux 离线复建、53 张旧 P0 预览清理与当前清单校验，保留最新 UI 手势代码、部署配置及历史 A00。原[维护证据](assets/maintenance-2026-10-02.json)保留当时本地交付状态，最新整合/发布范围另记[整合证据](assets/integration-2026-10-02.json)，命令见[Blender说明](../tools/blender/README.md)。本轮已明确授权必要检查后正常 push main 并核对 SHA/CI；不 push 旁支，不等网站部署。`plan.currentTask` 仍为 P08，不扩模型、动画、UI 或玩法。

- `plan.currentTask = P08 / in_progress`。D35已发布main `c90a9fc5d704874a52bddda3e4d991aef92c29fb`；D36已发布 `beb91fd`；当前D37分支 `dot/rarity-art-foundation`基于资产维护整合main。**用户最新授权解除逐轮等待，检查后正常push main并核对SHA/CI**，由既有链路自动部署，用户在网站直接试玩；部署链路不改。
- 基线main `209b9073c90778bf57a1736bed9266f305b995f5`；接管时本地干净，远端核对一致。C04历史仍未完/BLOCKED，C04.3/4、新玩法与全卡重画不自动推进。最新决定见[D37](production/DECISIONS.md)。
- 当前工作：f09三态与真实计分来源、主能力置顶/折叠细则、f04加3文案对照、按需小图/有界高清升级、手机非全屏与用户自主方向。机制、RNG、存档格式、v10内容hash保持不变。

## 证据与限制

最新[D36证据](production/evidence/D36-2026-10-02.json)：固定完整手牌层级与左侧勾选，原生按住横滑选/取消，同一手势去重与快速跨越补齐，五张上限；取消恢复预览，手牌调序保留在详情左移/右移。领域/RNG/存档/素材不变。27项新增手势单测、81项PC/竖屏/短视口真实输入断言通过；完整本地聚合1631单测/content/build/Canvas desktop+mobile smoke/plan通过，源码冻结。前后截图与9秒实际操作视频已检查，路径见证据。D35远端CI实际失败于Firefox mobile的10♦角标遮挡（run 37020617006），domain/docs通过；不能把此前本地Canvas PASS当成远端CI通过。D36保留同一断言，推送后另核对。

最新[D35证据](production/evidence/D35-2026-10-02.json)：1604项测试、content/build、PC/手机Canvas smoke、plan全部PASS；录屏并发与默认多worker曾使旧CPU重测试超时，保留日志，最终以环境变量单worker跑同一完整门禁通过，未改断言或超时。PC1280×800、触摸412×820、短视口390×640的新商店/详情/胜负fixture与同种子重试通过，截图已检查。全屏控制收纳与f09自然操作链通过。该结果不代表WebGL/真机/新美术验收。双向滑选与稳定遮挡在D36独立提交实现，见下列最新证据。

本轮D34发布复核见[发布证据](production/evidence/F09-release-2026-10-02.json)：96b3a42完整聚合PASS（1594单测、content/build、PC/手机SwiftShader smoke、plan）。最后仅修正本体/版次提示与视觉区分：112专项和build通过，PC/手机Canvas取消选择、回看、刷新自然路线通过。弃牌显示“不再×1.5”，详情明确“已弃牌 · 本场不再×1.5；特殊版次仍正常结算”；只有Boss计分封禁同时压暗本体与版次。没有机制或存档变更。公开站点本环境CONNECT代理403，未取得站点响应，不能宣称线上已更新。

[完整证据](production/evidence/F09-2026-10-02.json)：1590项原阶段单测通过，后续新增文案/加载相关7项通过；typecheck/build/content通过。实际Canvas/软件WebGL单卡路线通过，原desktop/mobile smoke两种renderer分别通过，未改超时。WebGL完整smoke在后续文案/加载修改前运行；这些新改动由Canvas操作和故障注入覆盖，未重复整套软件渲染压力运行。

冻结旧构建的手机SwiftShader约1.1–1.7FPS、首手30秒超时；修正后单卡手机约3FPS、首手23.7秒完成。**软件渲染仍不流畅，真机性能未验收。** 手机证据是Linux Chromium、412×820 CSS/DPR3触摸模拟，不是真OnePlus或Android UA。真实浏览器栏、实体触控/扬声器、Firefox/WebKit本轮未跑。

原图未改。原像素局部遮罩仅为程序化动效候选，用户仍不满意原画，不能记为美术完成。父会话读取旧原图遇到403 scope_violation，已停止并等待用户重新附加/选择素材；本环境不通过另一路复制原图绕过拒绝。改画和分层/补绘尚未完成；不能把多张独立生图冒充对齐层。原图Library：`libfile_e804e2b3289881918c099c138a8d36e7`；审阅包（前后截图/录屏/分层需求）：`libfile_33095e051cac8191901b4f316046b50a`，`f09-review-20261002.zip`。本地完整诊断保存在忽略的`shots/f09/`。Library多文件助手在工具发现阶段网络失败、无会话；单个10MB包保存成功，身份已落本地。

自然复现：seed `f09-sample-30` → 阿默 → 买不换词 → 入场 → 首张9♥；floor((40+9)×1.5×3×1.5)=330。首手后弃牌，标签已失效，下一手trace没有f09。f04对照seed `f04-copy-70`，金币≤3时整手倍率**+3**。

## 启动与下一步

云环境：Node22.23.3位于`/workspace/.cloud-tools/node_modules/.bin`；`npm ci --cache /workspace/.npm`可重建，默认HOME缓存不可写。开发：`npm run dev -- --host 127.0.0.1 --port 5201 --strictPort`。系统Chromium可用，Playwright自带浏览器二进制未恢复；外部`system-chromium.mjs`禁GPU只验证Canvas，`system-chromium-webgl.mjs`显式SwiftShader。均不进仓库。ffmpeg为系统程序，录屏所需映射在工作区缓存。

单卡浏览器入口：`harness/f09.mjs`（`F09_RENDERER=canvas/webgl`分开记录）；加载/文案专项：`harness/f09-loading.mjs`需5201的e2e开发构建。不要只为重复获取相同失败证据空跑。检查按AGENTS变更矩阵执行，最终发布聚合与开发targeted分开。

D35结构版已发布，D36只收尾遮挡/手势有界回合；正常push后核对GitHub SHA/CI，不等待或探测公开网站。后续父会话安排美术/UX基础与小批素材；独立Linux3D重建/旧预览清理任务拥有tools/blender和资产manifest/inventory，避免改同一文件。原画重绘暂缓，重新附图/Library/ZIP均不是发布前置。独立文档精简只改入口、任务指针、renderer口径与发布脚本说明，不删工作包/金样/测试门禁。

历史C04源码/CI/旧存档细节以[收尾证据](production/evidence/C04-closeout-2026-10-02.json)及[基线handoff](https://github.com/big-dimple/dachoupai/blob/209b9073c90778bf57a1736bed9266f305b995f5/docs/development-handoff.md)追溯；本地通过不改写其远端CI取消的历史。
