# 当前交接

## 当前任务：R03 / IN_PROGRESS

权威指针：`production/plan.json`。当前分支 `feat/R03-run-economy`，包基线 `651d2e6b84d2c985574d952fd0b73c11aee2717e`。唯一下一步：在本包实现检查点上运行完整 verify、test:run、真实双端主流程与回放、shot、内容/计划检查，保存对应 SHA 证据后进入 R04。

## 本包实现与已跑检查

r2 已成为网页默认路径：首店、每场 4 出牌/3 弃牌、持久实例跨场、加权不放回货架、实际支付价、确认买卖、递增刷新、奖励/利息幂等、库存调序。演出读取 r2 trace；公开押注预览不接收规则 RNG；分数字符串只在 UI 格式化。保留 r1 原数值回归。

先跑红的 11 组主流程/经济用例、2 项物品 schema 边界及缓存回执越过内容版本问题都有实际日志，见 `production/evidence/r03-2026-10-01/`。当前工作树 `npm run test:run`（36 项）和 typecheck 已通过，双端真实 mouse.click/touchscreen.tap 完成买入→弃牌→出牌过关→回店→调序→出售→替换，日志 headless 完整状态一致。正式被测 SHA 和日志在本包关闭时补齐。

增强六种 ID、T01–T18、U01–U12 只保留 schema/命令边界；效果未启用即明确拒绝，商店不售无效条目。没有制作全池 JSON 或扩展 Boss。

## 保留风险与用户安排

R00/R01/R02 已完成，详细证据只见各包 JSON；R02 被测 SHA `00e0cf0d5ae54bece673e005fb013ff01ac73f6c`，draft PR #6，未合并。方案采用 `14be6d65eeffd3a0d97a9d76a6274112fe75585e`；main 未重置/强推，PR #3/#4/#5/#6 均由用户审查。

R04 的 IndexedDB/中断取消/恢复未做，R00 F07 仍开放；R05 的 FIT 小字/17px 按钮/原图预载未修；R06 的 CI 与 2 项 moderate Vitest 告警待做。当前只验证一场自然工作流，未验证全章/Boss、平衡或手机品质。截图经工程目审，不是人类批准。

Android Chrome/iPhone Safari 真机、真人核心体验/对标、美术批准、目标机性能：**NOT_RUN**。用户只在关键节点验 Android Chrome，要求连续推进工程；部署由用户负责，不准备部署交接材料。美术在 R05 后按 A00/ART 独立交 Astra，未批准牌桌金样，不提前重画全部角色或量产。
