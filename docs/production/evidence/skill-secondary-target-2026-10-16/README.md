# 技能面板“其它查看”：21px热区扩大为44px

最新 DELIVERY_PLAN 的P08移动可达性仍待核验。本次先核实长细则滚动：PC、320、390及短横均可读到底，未重复改造；随后在正式技能面板复现“其它查看”summary只有21px高，低于44px触摸合同。基于main `0c4dab186eb90430d57e213545179b9921fffe10`，独立分支 `fix/skill-secondary-touch-target-20261016` 只在 `src/style.css` 增加一条英雄技能面板限定的summary样式，44px最小高度及上下留白，保留原生标记、焦点、键盘与折叠行为。没有修改GameScene、指针、结算、规则、文案或原图。

基线四档（1366×900、390×740、320×568、740×320）均实测21px，顶部下方35px的真实轻触不能展开，精确点中文字可展开。修复版同四档及其余五英雄320宽共九例，入口均44px且同位置轻触成功；原生空格展开/收起、实际打开辅助查看、Escape关闭正常。每例先真实选一张手牌，完整state、journal、存储、选牌与技能暂选在操作前后逐项相同。390旋至740×390，并模拟safe-top20/safe-bottom16后仍44px、可点且不丢选牌。

Windows Node22.20 / Chromium153 /原生Canvas，DPR1；正常新局、正式入口、原生touch/keyboard，无fixture和私有动作调用。浏览器逐例数据与构建身份见browser-reports.json，源码精确哈希见status.json。320-before.png与四档after.png均为实际原生整屏，已目视检查；未新增图像资源。node --check及npm run build（含tsc）通过，保留原有bundle体积提示；无需为CSS热区新增实现镜像单测。

复现：先按既有e2e方式构建（vite build --mode e2e --outDir shots/secondary-targets/build-after），设置SECONDARY_BUILD为产物目录、SECONDARY_DIR为输出目录、SECONDARY_EXPECT_FIXED=1，运行node harness/secondary-action-targets.mjs。基线EXPECT_FIXED=0只跑四档，以实际21px/边缘轻触未展开为已复现缺口，不能把此预期基线结果写成修复通过。

本地使用独立Windows依赖，未混用WSL。候选从0c4dab18开始，随后main到3084f06f的指针更改未包含，整合应在新main同版复核。未合main、未查询CI/域名。真实设备、整体移动体验与玩家理解仍待验收，P08保持in_progress。
