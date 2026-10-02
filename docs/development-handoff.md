# 当前交接：P08单卡体验样板

- `plan.currentTask = P08 / blocked`。实现提交 `9481e873097b1bb09bd1a0a4f9226ceb14917ced`，分支 `dot/f09-experience`，**只本地提交、未push**。父会话验视觉后另行指令；部署链路不改。
- 基线main `209b9073c90778bf57a1736bed9266f305b995f5`；接管时本地干净，远端核对一致。C04历史仍未完/BLOCKED，C04.3/4、新玩法与全卡重画不自动推进。最新决定见[D33](production/DECISIONS.md)。
- 当前工作：f09三态与真实计分来源、主能力置顶/折叠细则、f04加3文案对照、按需小图/有界高清升级、手机非全屏与用户自主方向。机制、RNG、存档格式、v10内容hash保持不变。

## 证据与限制

[完整证据](production/evidence/F09-2026-10-02.json)：1590项原阶段单测通过，后续新增文案/加载相关7项通过；typecheck/build/content通过。实际Canvas/软件WebGL单卡路线通过，原desktop/mobile smoke两种renderer分别通过，未改超时。WebGL完整smoke在后续文案/加载修改前运行；这些新改动由Canvas操作和故障注入覆盖，未重复整套软件渲染压力运行。

冻结旧构建的手机SwiftShader约1.1–1.7FPS、首手30秒超时；修正后单卡手机约3FPS、首手23.7秒完成。**软件渲染仍不流畅，真机性能未验收。** 手机证据是Linux Chromium、412×820 CSS/DPR3触摸模拟，不是真OnePlus或Android UA。真实浏览器栏、实体触控/扬声器、Firefox/WebKit本轮未跑。

原图未改。原像素局部遮罩仅为程序化动效候选，用户仍不满意原画，不能记为美术完成。父会话读取旧原图遇到403 scope_violation，已停止并等待用户重新附加/选择素材；本环境不通过另一路复制原图绕过拒绝。改画和分层/补绘尚未完成；不能把多张独立生图冒充对齐层。原图Library：`libfile_e804e2b3289881918c099c138a8d36e7`；审阅包（前后截图/录屏/分层需求）：`libfile_33095e051cac8191901b4f316046b50a`，`f09-review-20261002.zip`。本地完整诊断保存在忽略的`shots/f09/`。Library多文件助手在工具发现阶段网络失败、无会话；单个10MB包保存成功，身份已落本地。

自然复现：seed `f09-sample-30` → 阿默 → 买不换词 → 入场 → 首张9♥；floor((40+9)×1.5×3×1.5)=330。首手后弃牌，标签已失效，下一手trace没有f09。f04对照seed `f04-copy-70`，金币≤3时整手倍率**+3**。

## 启动与下一步

云环境：Node22.23.3位于`/workspace/.cloud-tools/node_modules/.bin`；`npm ci --cache /workspace/.npm`可重建，默认HOME缓存不可写。开发：`npm run dev -- --host 127.0.0.1 --port 5201 --strictPort`。系统Chromium可用，Playwright自带浏览器二进制未恢复；外部`system-chromium.mjs`禁GPU只验证Canvas，`system-chromium-webgl.mjs`显式SwiftShader。均不进仓库。ffmpeg为系统程序，录屏所需映射在工作区缓存。

单卡浏览器入口：`harness/f09.mjs`（`F09_RENDERER=canvas/webgl`分开记录）；加载/文案专项：`harness/f09-loading.mjs`需5201的e2e开发构建。不要只为重复获取相同失败证据空跑。检查按AGENTS变更矩阵执行，最终发布聚合与开发targeted分开。

下一步待用户重新附加/选择原图后，由父会话恢复改画，再接收授权范围内的候选并实际验图；随后用户真机体验/视觉确认，再决定是否push或扩批。独立文档精简只改入口、任务指针、renderer口径与发布脚本说明，不删工作包/金样/测试门禁。

历史C04源码/CI/旧存档细节以[收尾证据](production/evidence/C04-closeout-2026-10-02.json)及[基线handoff](https://github.com/big-dimple/dachoupai/blob/209b9073c90778bf57a1736bed9266f305b995f5/docs/development-handoff.md)追溯；本地通过不改写其远端CI取消的历史。
