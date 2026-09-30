# 当前交接

## 当前任务：R02 / READY

权威指针：`production/plan.json`。唯一下一步：读取 R02 小节、RULES/CONTENT/DECISIONS，先建立 G01–G15 与数值服务/schema 的失败金样例，再实现显式 r2 计分和角色。保持 r1 回归与 r2 新合同分开，不改预期分数掩盖错误。

## 基线与实现

方案采用提交 `14be6d65eeffd3a0d97a9d76a6274112fe75585e`；main 仍基于审查 `9fd6e0b`，未合并 PR #3 或强推。R00 已完成，交付 `bbf205077ccf06b714133edd9cb1d2561fbe9766` / draft PR #4（base 为质量方案分支）；基线缺陷与未运行项见 `production/evidence/R00-2026-09-30.json`。

R01 工作分支 `feat/R01-domain-commands`，**实际被测实现 SHA：`54d7655190bc80dd0b55ae5def3563a8540d5125`**。后补证据/交接提交不改变被测游戏 SHA。

领域权威入口在 `src/domain/run.ts`，完整状态包括真实牌区、阶段资源/终局、货架、Joker 实例/顺序、四 RNG 游标、回执和最后分数。`RunController` 提交同步事务并提供冻结 checkpoint；场景只读状态/播放确定结果。旧 `src/run/runState.ts` 仅为 `RunSummary` 纯函数摘要。规则角色与资源 URL 已分离。

机器人已移到 `src/testing/bot.ts`，只从公开信息选命令，和 UI 共用 controller/reducer；旧独立出牌循环已删除。r1 数值与原断言未降低。RNG 保持黄金序列，抽牌方向统一 pop；骰爷结算实际随机值，商店游标可 JSON 恢复。r2 当前明确拒绝，留给下一包。

## 在被测 SHA 上实际运行

- `npm run verify`：退出 0，typecheck / 10 文件 **68 测试** / build 通过。
- `npm run test:domain`：退出 0，25 项通过，包含 1000 固定生成案例的牌区守恒和 JSON 恢复后继续执行一致。
- `npm run verify:smoke`、`npm run shot`：退出 0；桌面/手机模拟端启动冒烟与截图通过。截图生成不代表人工批准。
- `DOMAIN_EVIDENCE_DIR=docs/production/evidence/r01-2026-09-30 npm run test:domain:browser`：退出 0。Chromium 153.0.8010.12，桌面 mouse.click 与 390×844 touchscreen.tap 实际用二响完成三场；各 20 条命令、7 手出牌，最终总热度 6062、金币 15。UI 日志 headless 重放完整状态一致，关键 checkpoint 和最终 hash 均一致：`json-fnv-v1:90343630e3596064`。快速二次出牌只产生一条领域命令。
- 规则边界扫描无 Phaser/DOM/Audio/时钟/Math.random 或反向 game 引用。计划结构检查见证据目录。

证据入口：`production/evidence/R01-2026-09-30.json`；实际命令输出、先失败的日志、三场命令/状态/hash、截图见 `production/evidence/r01-2026-09-30/`。原 RNG 的 snapshot 缺失已先真实跑红；测试金向量来自旧源码取样。

## 未运行与保留风险

Android/iPhone 真机、真人体验/对标、美术批准、目标机性能：**NOT_RUN**。当前只证明 r1 状态和命令迁移正确。

R04 尚未实现 IndexedDB/中断取消/恢复，R00 的队列重入缺陷仍开放；R05 尚未解决 FIT 小字和原图预载。r1 旧独立 scoring 的漏传装备默认全装仍由 R02 移除，当前 UI/机器人命令已总是显式提供装备。R00 的 2 项 moderate Vitest 开发依赖告警留给 R06。美术在 R05 后按 A00/ART 独立交 Astra，未生产或批准金样，不扩产。
