# 当前交接

## 当前任务：R02 / IN_PROGRESS

权威指针：`production/plan.json`。当前分支 `feat/R02-rules-v2`，包基线 `006360901cfcae1ed8243484351b088bc18c3926`。唯一下一步：在实现检查点提交上完成 R02 全量回归、真实启动冒烟和 G01–G15 证据，关闭后进入 R03。

R02 已实现准确有理数、12 牌型、四集合、六角色时点、有序有限 hook、实例成长/重触发上限及不可变 trace。r2 通过原 `applyCommand` 的版本分派和同一 `RunController` 执行；独立 schema=2、内容 hash，分数存十进制字符串。r1 数值与黄金 hash 保留，漏传装备默认全装已删除。

当前 r2 是计分命令内核，初始 `stage-ready`，可进入/出牌/选押注/调序；商店、弃牌与可操作 UI 由 R03 接入。当前网页仍运行 r1，不能把启动冒烟写成 r2 全局验收。不扩 72 内容，不做 Boss/声画/美术量产。

## 已有证据与本包进展

R00、R01 已完成，详情只见 `production/evidence/R00-2026-09-30.json`、`R01-2026-09-30.json`；draft PR #4/#5 均未合并。方案采用 `14be6d65eeffd3a0d97a9d76a6274112fe75585e`，main 仍基于审查 `9fd6e0b`，未重置或强推。

R02 先失败日志在 `production/evidence/r02-2026-09-30/`：缺失模块，以及命令版本尚未启用/非法 schema 空操作崩溃。之后在包基线 + 当前 diff 上实际执行 `npm run typecheck`、`npm run test:rules`（60 项）、r1 scoring/domain 回归（25 项），均通过。`verify:content` 实际验证五张定义，保守展开上界 82 < 512；金样脚本初次运行通过。完整检查与最终被测 SHA 尚待本包关闭时记录。

## 未运行与保留风险

Android Chrome 真机、iPhone Safari 真机、真人核心体验/对标、美术批准、目标机性能：**NOT_RUN**。用户只在关键节点验证 Android Chrome；平时连续推进工程。部署由用户处理，不准备部署交接材料。

R04 的保存/恢复/队列取消仍未实现，R00 F07 仍开放；R05 的手机 FIT 小字和原图预载仍未修。R06 处理 Vitest 开发依赖 2 项 moderate 告警与 CI。r2 曲线和六角色公平性未经平衡验证。美术到 R05 后按 A00/ART 独立交 Astra，未制作或批准运行时金样，不提前重画全部角色。
