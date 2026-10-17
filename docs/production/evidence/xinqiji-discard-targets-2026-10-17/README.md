# 辛弃疾换牌弃牌目标隔离

基线：最新 main `c4525b2c2faf77ad2df0b5486e0ea64276856d04`。独立分支 `fix/xinqiji-discard-targets-20261017`。本包只修表现层目标选择，不修改领域抽牌、概率、技能次数、规则身份或存档格式。

原问题：选中 `9♥ 8♥ 6♣ 10♣ 7♠` 准备出顺子，技能提醒返回后，旧按钮直接将牌桌 `selectedIds` 当作技能弃牌目标。

改动：复用秦琼的独立空选弃牌界面。辛弃疾从提醒返回或主动点技能，都先另选要弃的牌，再显示牌名、实际弃牌张数和成本，单独确认。Escape／取消保持原出牌选择与完整状态。确认仅向既有 `DiscardHand` 命令传新选目标；之后沿用原候选与 `ChooseRefill` 流程。候选说明显示领域返回的实际需留张数，去掉“留应补数”。

实际检查：

- `npm run typecheck` PASS。
- 5 个窄测试文件、50 项 PASS：`laohuan-discard-handoff`、`touye-discard-handoff`、`laohuan-refill`、`hero-skill-guide`、`hero-play-reminder`。包含关闭／生命周期或状态过期拒绝提交、双确认、已有一张手牌缺口时弃两张实际需留三张。
- 同一 e2e 构建，Windows Chromium 153.0.8010.12，PC `1366×768` 鼠标、模拟手机 `390×844` 触控，DPR 1，两例真实 GameScene 操作 PASS。受控首场八张手牌复现原顺子意图，不宣称自然长局或实体手机验收。
- 两种入口均从空选草稿开始；草稿 Escape 与确认页取消后，原五张仍选中，state、journal、保存槽逐字段不变。
- 新选 `2♦ 3♣ 4♦` 后，确认只弃这三张，原顺子仍在手中；PC 双击只提交一次。实际候选五张、需留三张；不足三张不能确认，完成后原顺子＋所留候选入手，其余两张进已用区，不再扣弃牌机会。
- 每次实际命令的完整结果与 `applyCommand` 比较，保存槽等于对应 checkpoint。页面错误为零。`git diff --check` PASS；`src/domain/`、`src/application/`、`src/content/`、`public/` 无改动。

[真实操作报告及被测源码 SHA-256](report.json)。[PC 空选草稿](1366-reminder-fresh-draft.png)、[手机确认只弃新选三张](390-confirm-only-new-discard.png)、[实际候选留三张](390-real-candidates-leave-three.png)、[完成后顺子保留](390-completed-straight-preserved.png)均已看像素。

[初次测试选择器错误](initial-selector-check.json)保留原始 FAIL：`data-card-id` 同时命中按钮和内部卡面。仅将测试定位改为 `button[data-card-id]`，产品代码和同一构建均未改，最终两例 PASS。

复跑：`PLAYWRIGHT_BROWSERS_PATH` 指向本机 Playwright 浏览器后执行 `node harness/laohuan-discard-handoff.mjs`；输出在忽略目录 `shots/laohuan-discard-handoff/`。`XIN_REUSE_BUILD=1` 仅用于产品源码未改时复用该构建。

未跑全英雄、长局、CI、实体设备或真人听感。不合 main、不部署；由父任务热修整合负责人接收本 dev 提交。
