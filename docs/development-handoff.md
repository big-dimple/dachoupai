# 当前交接

## 当前任务：R01 / READY

权威指针：`production/plan.json`。唯一下一步：读取 R01 小节和 ENGINEERING/RULES，先补领域命令、完整状态与随机恢复的失败用例，再将 UI/机器人接到同一入口。禁止恢复旧 Batch 2C Boss 路线。

## R00 交付与真实基线

2026-09-30 已执行 `git pull --ff-only`。main 仍为审查 SHA `9fd6e0bdb20c7e6114e045ca336c27afe5d47e9e`；起始工作区干净。PR #3 仍 open，已在独立分支 `feat/R00-baseline-evidence` 采用头提交 `14be6d65eeffd3a0d97a9d76a6274112fe75585e`，没有合并或强推。

相对审查 SHA 的 29 个文件只涉及质量方案、旧文档归档、计划检查器和文档 CI；游戏源码、资源和依赖锁文件无变化。R00 不改玩法或素材。被测游戏 SHA 是 `14be6d65eeffd3a0d97a9d76a6274112fe75585e`；测试时未提交的内容仅为 R00 证据和 plan/handoff，完整记录与采集脚本哈希见 `production/evidence/R00-2026-09-30.json`。

## 实际验证与证据

- `npm ci`、`npm run verify`、`npx playwright install chromium`、`npm run verify:smoke`：退出码均为 0；9 文件 45 单元测试、类型检查、构建、双端启动冒烟通过。
- R00 浏览器采集：Windows 11 / Node v22.20.0 / 本机 Chrome 154.0.8037.58（headless），桌面 mouse.click 与 390×844 touchscreen.tap 均实际完成选角→购买→牌桌→出一手→演出中退出→重进出牌。
- F07 已由本机浏览器自动化复现：退出后 queue.running 保持 true；重进再出牌热度变为 60，但有 3 个 pending effects，结果文本不更新。此缺陷留给 R04，不以基线采集成功冒充修复。
- 手机模拟视口实际 canvas 为 390×219.375；出牌按钮仅 17.671875 CSS px 高，Joker 描述约 3.046875 CSS px，留给 R05。
- 六原图/头像对照、资产联系表、选角/商店/牌桌/出牌/重进截图、命令日志及逐发现复查表均在 `production/evidence/r00-2026-09-30/`。39 GLB 的完整预览留给 A00。
- 计划检查器自测通过（1 个有效、13 个无效样例）；计划结构检查结果见同目录 `plan-check.txt`。结构通过不代表玩法通过。

## 未运行与保留风险

Android 真机、iPhone Safari、真人操作/对标、美术批准、完整一局/恢复、目标机性能、逐 GLB 动画/透明边缘审查：**NOT_RUN**。支持矩阵已分别登记，不将模拟器视为手机验收。

`npm audit --json` 实际退出码 1：Vitest 3.2.7 → @vitest/mocker 3.2.7 开发依赖链的 2 项 moderate 告警，同一 GHSA。具体 JSON/链路已保存；未 force 修复，生产可利用性未确认，R06 需处理。美术仍按 ART 单独交 Astra，金样批准前不扩产。
