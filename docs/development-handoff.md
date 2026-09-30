# 当前交接

## 当前任务：R03 / READY

权威指针：`production/plan.json`。唯一下一步：从 R02 最终交接提交建立 `feat/R03-run-economy`，读取 R03 与 RULES/ENGINEERING/UX，先补出弃牌、持续牌组、买卖与奖励的失败用例，再接入 r2 最小可操作 UI。

R02 分支 `feat/R02-rules-v2`，包基线 `006360901cfcae1ed8243484351b088bc18c3926`。**实际被测实现 SHA：`00e0cf0d5ae54bece673e005fb013ff01ac73f6c`**。本次证据/交接提交不改变被测游戏 SHA。

## R02 已交付与实际验证

准确有理数与单次 floor、12 牌型/等级、played/scoring/active/held、有序计分、六角色时点、可选押注、不可变 trace、有限 typed hook/schema、实例成长、深度 1/额外 4 次重触发与 512 事件诊断。r2 由同一 `applyCommand`/`RunController` 显式分派，schema=2、分数字符串、内容 hash 隔离；漏传装备默认全装和死常量已删除。

在上述提交上实际运行：`npm run verify`（14 文件 129 测试/typecheck/build）、`npm run test:rules`（60 项）、`npm run verify:content`（5 定义，上界 82）、G01–G15 金样与逐事件独立分数核对，全部 PASS。非法分母的内容反例真实退出 1。`npm run verify:smoke` 双端通过，**仅 r1 启动冒烟**。

证据权威入口：`production/evidence/R02-2026-10-01.json`；红/绿日志、反例、逐事件 trace 见其引用。r1 数值/余额/胜率原断言未降低，显式升级迁移差异已列在证据中。R00/R01 只保留证据指针，见各自 JSON。

## R03 边界与保留风险

r2 当前为计分命令内核，初始 `stage-ready`，可进入/出牌/押注/调序；商店、弃牌和网页 r2 路径待 R03，当前网页仍是 r1。不得用该启动冒烟冒充 r2 完整一局。R03 只做最小可操作流程，不扩 72 牌/Boss/终稿美术。

方案采用 `14be6d65eeffd3a0d97a9d76a6274112fe75585e`；main 基于审查 `9fd6e0b`。draft PR #4/#5 未合并，保留 PR 分层审查，不合并或强推 main。

Android Chrome/iPhone Safari 真机、真人核心体验/对标、美术批准、目标机性能：**NOT_RUN**。用户只在关键节点验 Android Chrome，平时连续推进工程；部署由用户处理，不准备部署交接材料。

R04 的存档/队列取消和 R00 F07 未关闭；R05 的 FIT 小字/原图预载未修；R06 的 2 项 moderate Vitest 告警与 CI 待做。r2 数值和角色公平性未校准。美术按 A00/ART 独立交 Astra，未制作或批准牌桌金样，不提前重画全部角色。
