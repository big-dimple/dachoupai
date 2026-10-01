# 开发 Agent 入口

本项目以《小丑牌》（Balatro）的构筑深度、操作准确性、信息可读性和连锁反馈为质量标杆。功能做完不等于达到标杆；未经实测不得宣称持平。

2026-09-30 的质量重置建立了审查、策划与任务协议；审查中的 Phase 2B 是固定历史快照。当前整改进度只以 plan 和 handoff 为准。旧文件已归档，禁止继续照旧交接里的“直接做 Batch 2C Boss”扩建。

## 新会话只先读这三处

1. 本文件。
2. `docs/development-handoff.md`：当前任务、基线、证据、阻塞。
3. `docs/production/plan.json`：找到 `currentTask`，读取该任务的 `reads` 和 `WORK_PACKAGES.md` 对应小节。

其他文档按 `docs/production/INDEX.md` 的路由按需读取。不要每轮吞下全部策划和历史；不要只读 TODO 标题就开工。

## 权威与冲突

- 用户最新明确决定 > 已采用的设计决策 `docs/production/DECISIONS.md` > 对应设计合同 > 实现和测试。
- 实现是“现状证据”，不是“需求正确性”的证明。**禁止为了迁就代码而降低策划要求、修改预期结果让错误测试变绿。**
- 本计划在此分支被明确采用或合并后作为整改合同。数值表是 r2 初始参数，不是已验证平衡；按质量流程调参，不可偷偷改机制。
- 发现冲突：记录合同、代码、影响与建议；在当前任务中解决或标为 BLOCKED。涉及核心玩法、存档兼容、整体美术方向的变更需先更新 DECISIONS，再更新规则/测试/实现。
- `docs/archive/` 只供追溯，永不作为当前指令。审查报告是固定快照，不随整改抹掉历史问题。

## 一次只做一个有边界的工作包

`plan.json` 是任务状态唯一来源；handoff 只是当前指针和交接摘要，TODO/ROADMAP 不重复勾选任务。

开工先检查 `git status`、当前分支、HEAD、远端变化；不得重置、覆盖或夹带别人未提交的修改。使用 `feat/<任务ID>-<主题>` 或 `fix/<任务ID>-<主题>` 分支。美术使用独立分支，不与工程 Agent 同改文件。

先打印：任务 ID、依赖是否完成、本次范围、禁止顺带做的事、拟运行检查。修改规则前先补失败用例或金样例。工作包过大时在包内拆子步骤，不私建平行路线图。

结束时必须同时交付：实现、测试、可核对的证据、plan 状态、handoff 更新。没有真实运行就写 NOT_RUN；截图存在不等于真人认可；检查脚本通过不等于产品质量通过。未满足验收保持 IN_PROGRESS/BLOCKED，不能写 DONE。

## 工程红线

保留 npm + TypeScript + Phaser 的 H5 主线，不为素材包改成全 3D。领域规则不得依赖 Phaser、DOM、音频、时钟或动画回调；UI、机器人和回放共用同一命令入口。规则随机必须可快照、可恢复，演出随机不得消耗规则流。结算事件只演示已确定的结果。

禁止把普通 `number` 的 Infinity/NaN 当合法分数。禁止省略 joker 参数时自动装上所有牌。资源通过 BASE_URL/资产注册表引用；原始大图和 GLB 不因存在于仓库就进入首屏下载。

禁止无依据引入 ECS、联网后端、付费抽卡、实时多人、运行时 3D、六套独立 UI 或复杂插件平台。确有需求先写决策与替代方案。

## 当前可用检查

```bash
npm ci
npm run verify
npx playwright install chromium firefox webkit
npm run verify:smoke
npm run test:e2e
npm run test:v00:sample
npm run test:v00:browser
npm run verify:ci
node scripts/check-production-plan.mjs --self-test
node scripts/check-production-plan.mjs
```

`verify:smoke` 只覆盖选角→商店→进入牌桌。`test:e2e` 用构建产物检查三引擎和实际触摸的暖场事务、失败、资源降级与中断。`test:v00:sample` 固定120局公开信息策略诊断，随后 `test:v00:browser` 用其三种代表种子检查完整两章/B01–B04/跳场/六种最小物品与恢复；CI 强制三引擎。八章/无尽仍在后续工作包。`verify:ci` 报告未纳入的资产/平衡/真人项；不得以此替代手机或真人验收。其他计划中的命令在工作包落地前一律视为尚未实现。

`release:checked` 只执行只读 `verify:ci`，`--plan` 只列计划、标 NOT_RUN。它不提交、推送或合并；正常小分支提交与 PR 审查仍需执行。提交/推送前运行轻量 `jiepi-clear`，只纳入评审过的文件。不得擅自合并自己的 PR、强推或推送 main。

## 完成定义

机器检查、目标设备操作、保存恢复、素材验收、平衡留出样本、真人对标六类证据都必须按阶段通过。最终发布标准见 `docs/production/QUALITY.md`。人类验收未完成时，允许推进不依赖它的工程任务，但不得把相关美术批次或产品关卡标成通过。
