# Stage 特写／切场／文字清晰度返修

2026-10-15 精确CI返修续交：正常merge父给定最终集成 `2ecb859a7b001193c235c48e8bfd15813873ea21`，双亲merge为 `8a31d77812d02a1aeb720a8797a43ab099230344`；旧 `de1d2e84` 的精确CI domain红不隐去。合并后完整250文件/3480单测及content、type、docs通过，源码/index/HEAD检查一致。旧失败合同、合并来源和本地完整回执见 [ci-integration](ci-integration/README.md)。最终远端CI按最新push SHA读取，不借旧74专项或父集成绿CI代签。

独立分支 `fix/stage-clarity-20261015`，基线为远端父集成 `fa904746ddd377886c8f3a17501a039096b485fa`。不推 main，不创建 PR。AGENTS.md、DELIVERY_PLAN 当前入口已读；工作区与仓库未找到 `.skills`/SKILL.md。未改全局计划或其他任务窗口。

## 实际根因

1. **眼条确实在放大低分辨率头像。** `HeroClimax` 即使已有高清立绘仍优先取 avatar。1366 原生帧记录为 `avatar-amo` 256²，实际裁样 **209.92×42.63 → 1032×209.56 CSS px，scale 4.916**；390 为 209.92×69.12 → 330 宽，再由 2 倍 backing 显示到 3 倍设备。前图与逐帧 crop/texture 数据见 before。不是单纯 bounds 推断。
2. **脏痕曲线来自 PaperFlow，而非屏幕污点。** 原 light 切场绘制三重正弦边界，240ms 从上到下扫；full 路径另有 1000ms 波形覆盖。高潮切镜还有独立向下扫线，SkillPanelInk 则在脸字两侧画速度线。本次切场直接切换，高潮只作原 150ms 透明度退出，移除这些扫线／速度线与退出位移，不遮脸字、不加等待。
3. **文字不是只缺 DPR。** 基线已将 canvas 放大并反向 CSS zoom，且 camera.roundPixels=true。但手机 DPR3 实测 backing 780×1480 / CSS390×740，封顶只有 2；PC DPR1 的不少 Text 纹理反而用 1.5，再重采样到 1。ScoreLanding 标签、公式和数字默认 resolution=1；高潮静态数字用小数 scale 适配：PC ×1.5 为 .96，320 为 .931、落位数字 .859。居中坐标也有 .04/.96 等非物理像素边界。既有计分 pulse finally 已归回 1，未把它误报成永久残留缩放。最终实际 Canvas rendererType=1、imageSmoothing=true、antialias=true、CSS imageRendering=auto；保留平滑采样而消除低清放大/多余静态缩放，未用 nearest 或滤镜伪造锐度，见 interpolation.json。

## 实施

- 复用现有 `opening-portrait-*` 615×768 手绘。首镜是脸部／肩部构图，随后全人物／完整同 ID 来源图和实际数值；裁样上限为一个源像素对应一个 framebuffer 像素。头像不再作眼神源。高清没到时跳过脸部镜头，缩略图只按原始像素能力展示，文字和实际作用保留。
- 六位现有 avatar=256²、selection=256×320、portrait=615×768。运行原字节与来源 manifest 为 `art/sources/handdrawn-runtime-20261004/manifest.json`，该目录 README 明确本包没有原 PNG；后续 cards 映射沿 HanddrawnArt。高清英雄仍走 StageImageWarmup 的 128KiB/600000 像素/4.5s 上界，来源 detail 沿 ClimaxSourceArt 的 96KiB/768px/1.8s 上界，无等待评分、取消/迟到保护不变。未新增图、未取 Library 或绕过 403。
- **专用精品眼神原画缺失。** 当前交付是现有手绘的清楚合理镜头，不声称已取得专用眼神艺术。若要全宽精品眼神，需父任务提供已授权、足够原生像素的六人专用图；没有生成廉价几何脸。
- 按有效 DPR（包括 1.25）配置 canvas，支持手机 3 倍；9MP 上界支持 1920×1080 DPR2 的 3840×2160。保留 CSS 逻辑坐标、原命中和 layout，DPR/resize 变化重新配置。极大 viewport 仍受有界像素预算约束，不宣称任意显示器无限分辨率。
- TextRaster 统一计分、来源与落地纹理密度，按文字 bitmap 边界对齐物理像素；高潮按整数字号测量适配，scale=1；按钮松开/取消和计分 pulse 结束归位后对齐。没有 screenshot 锐化、CSS filter 或改数字值。

产品文件：HeroClimax、PaperFlow、SceneView、GameScene（仅文字密度/对齐）、JokerKeyHighlightView、ScoreLanding、ScoreTextLayout、ScoreSourceProcess、TextRaster、Viewport、main。`src/domain`、`src/application`、`src/content`、`public/assets`、`art` 相对父集成逐树无 diff：分数、英雄效果、RNG、保存和商店逻辑保持。

## 验证与证据身份

- `typecheck.txt`、`tests.txt`：9 文件 **74 tests PASS**；`build.txt`：生产构建 PASS。标准编译包 smoke：系统 Chromium 默认启动路径桌面 PASS，手机运行超过5分钟无新输出，受控停止（日志 smoke-default-system-browser-stall.txt），不能断言具体根因。随后同一编译包、原断言、仅通过支持的 executable 环境变量加 `--disable-gpu --disable-software-rasterizer` 跑手机，PASS/退出0（smoke.txt、smoke-result.json）。不把不同启动路径混称一个默认整包成功。最初 Playwright bundled browser 缺失亦单独保留。
- `before/`：fa904746 基线三个 native 导入/选牌/助攻选择/出牌流程，1366 DPR1、390 DPR3、320 DPR2。`after/`：同工作树第一候选 15 项 PASS，另含 PC DPR1.25/2、手机 DPR2/3、初始/中途低动态、菜单快进、保存退出、缩窗、缺高清、重播、有效缩放模拟。没有把导入的受控公开手牌/金币/库存称为自然获得。
- `wide/`：最终候选补上 9MP 上界及剩余旧 fallback 标签/数字的密度后，1920 DPR2 和 PC 有效缩放 80%/125%/150%/100%两项 PASS。此前 15 项视口均低于原 4.5MP 上界，密度值不因上界修改而变化；不把旧报告改写成新 SHA。最终 src 文件哈希见 runtime-files.json（与 wide/report 一致）。所有报告的 head 为分支基线，拍摄时有明确未提交产品差异，不能把图误称 fa904746 产品图。
- `comparison.json` 与两份 states.json.gz：三个前后完整 initial/final state+journal+storage 逐项相等。所有 case 的最终 state 等于原领域命令，冷恢复完整保存一致；重播不写入、快进/退出/缺图/低动态不改变已提交结果。
- 原始 PNG 来自浏览器截图或 canvas.toDataURL，保留各自 native backing；390 从 780×1480 变为 1170×2220。pixel-crops 仅原坐标提取，不缩放、不锐化。已实际查看 PC/390/320、PC 高清裁片，核头发/脸部/数字边缘和正文，没有仅凭 bounds 签画质。
- before/after 各含 PC 与390约20秒浏览器原录像。PNG 是像素证据；录像按 CSS 视口录制，不冒称原生 DPR 录像或设备帧率。无新增运行视频/音频。

边界：浏览器为 Chromium151 软件 Canvas；DPR/缩放为浏览器/CDP有效视口模拟，工具栏实际缩放、物理手机、GPU性能、真人观感未签。缺专用眼神原画如上。未合 main、未部署、未创建 PR，也未绕过另一路 PR POST Forbidden。

初次验收脚本缺 ffmpeg 及沿用旧助攻 selector 的 FAIL 保在 prior-failures；修正为当前“换一组”原生 UI。补文字分辨率后，旧单测的伪 scene 缺 scale 曾失败，已补伪 scene 后按原销毁/取消断言复测，未删保护。
