# 六英雄说明一致可达：本批有限证据

基线 main `69f46e47f250ec3ad7bc55ed11f7888326eecf8f`；产品/夹具冻结 `3d8d874b45a1caa6439f390e9b2eb2e8ce7f5e87`，Draft [PR167](https://github.com/big-dimple/dachoupai/pull/167)。后续提交只补本目录证据；最终 SHA / CI 以 PR 精确 head 和交接回复为准。本批不改 DELIVERY_PLAN.md，读取到其顶部 PR163/164 未合状态与最新父授权不一致，按最新授权执行，不擅自同步计划。

## 已修入口与首层

| 页面/头像 | 原来 | 本批 |
|---|---|---|
| 选角六张角色图 | 轻点只选中，长按才有详情 | 轻点选中并打开该英雄说明，关闭后仍由玩家选路线、确认新局；主立绘也可点击说明 |
| 手机商店小头像 | 无点击入口 | 44px目标打开当前存档身份说明，返回商店 |
| PC商店立绘 | 直达培养页，没有英雄说明 | 打开英雄说明；培养保持原按钮可达 |
| 过关/失败/终局角色图 | 没有说明入口 | 仅在实际展示英雄图处接只读说明；没有英雄图的过关不伪造一张技能来源 |
| 培养手记/最终留影角色图 | 普通img，无入口 | 原立绘变为语义按钮；子说明在原手记上打开，关闭返回原按钮焦点，原手记保留 |
| 牌桌HUD头像 | 原六技能入口存在 | 本批正文原样；六角现有入口双端开关已核。统一首层及牌桌装饰立绘入口由独立patch交父集成 |

共享 `HeroExplanation.ts` 首层是原立绘、现有技能名、简短用途、何时能用、现在为何不能用；例子与完整限制默认收起，点击例子后才创建三步公共规则示例，不读未来牌、不模拟分数。文案通过当前存档身份读取；旧被动保原说明、不套新技能示例。无新立绘、雷达强度排行、机制或演出。本批不改规则/目标/价格/推荐/迁移/依赖/工作流。

## 定向与实际双端操作

`npx vitest run tests/hero-explanation.test.ts tests/hero-skill-guide.test.ts tests/hero-stage-continuity.test.ts tests/hero-opening-copy.test.ts tests/selection-layout.test.ts tests/stage-table-art.test.ts`：6文件33项通过。typecheck、build通过；标准本地smoke以系统Chromium桌面1280×720/DPR1和触控390×740/DPR3通过（`local-smoke.json`，冻结产品3d8d874b），`check-production-plan.mjs`通过且明确非玩法验收。保护树对基线逐字节diff无变化：`src/game/GameScene.ts`、domain/application/content、package.json/package-lock.json、.github、DELIVERY_PLAN.md。

`node harness/hero-explanation.mjs` 在干净源码 `3d8d874b` 通过；系统 Chromium软件渲染，PC1366×768、触控390×740、DPR1、低动态。**共96条观察记录；不是96局游戏。** 六英雄在两端均实际点击缩略图和主立绘、商店头像/立绘、打开/关闭/再打开/Escape；重复点击原头像坐标时只有一个说明，原场景没有穿透交易或出牌。关闭回canvas焦点，底部返回≥44px且在viewport内。例子首层未创建扑克节点，点开后实际创建三步，再收起。20张原尺寸图及hash见 `screenshots.json`；补充12条刚打开首层记录见 `first-layer-report.json`（截图在重复点击前拍摄，避免把重复坐标展开弹窗细则的状态误标首层）；全96记录及已记录只读前后SHA256见 `browser-report.json`。原通用入口 inspect 路径核完整state/journal/storage及关闭后的localStorage；原嵌套路径覆盖不足，不能将96条统一称为每次四项全部核过。

六角每端还实际打开培养手记角色图的嵌套说明，关闭回同一语义按钮，原手记未丢；失败终态最终留影同样核。公共手牌/12金币来自既有 `heroStageFixture`，用合法领域命令产生过关与四次单张出牌失败，严格checkpoint通过后用正常菜单导入。没有搜索种子、偷读未来抽牌或跑八章/18局。普通受控过关只有骰爷/谢幕实际展示角色来源，另四角标记 `NO_HERO_DISPLAYED_IN_THIS_CLEAR`；六角失败页面的实际立绘均已操作。六角牌桌HUD原技能入口各开/关/再开/Escape，完整保存无变化；此记录不证明父patch已接入。

首批观察器等FAIL保在 `initial-FAIL.txt` / `fixture-target-FAIL.json`；手机图框继承旧100%高度造成空白，本批局部CSS已改为自身高宽比，最终PC/390图已actual view。CLI token无效但授权开发分支git push成功，Draft通过已连接GitHub创建。

## 父集成与未验边界

`GameScene-parent-integration.patch` 从上述基线生成，`git apply --check`通过，**未应用到GameScene.ts**。最小接线：现有HUD头像/说明文字和桌面装饰立绘先进入共享说明，当前条件从既有 `heroSkillGuide` +实际selectedIds/草稿读取；“查看本场技能操作”转入原inspectRole。正在结算/换牌/未保存时可看说明但禁用操作按钮。原快捷技能操作、规则和保存均保持。父有独占GameScene窗口，应在其最新代码合适位置接入并核选择草稿/技能实际事务；本批未对未应用patch声称类型、浏览器或技能事务通过。

`.agents` / `.codex`在本环境为空，仓库没有`.agents/skills`，无相关SKILL.md可读；已读根AGENTS.md与CARD_AND_HERO_GUIDANCE_SCOPE.md及现行代码。无共享文件冲突观察；必要公共接线文件为DetailDialog/BuildKeepsakeView/BuildJourneyDialog/StageTableArt，未改全局style.css。

这是只读说明入口与局部可达性证据。六角现有技能条件人话说明已展示，玩家理解、完整旅程、自然经营/平衡、所有挑战/旧身份页面、实体设备、音频、美术总体与完整体验仍未验；测试或CI通过不代签这些项目。瞬时技能高潮/结算演出图层仍按原非交互时槽，本批没有改演出或允许在处理中发动技能。

## 集成收口勘误（2026-10-14）

上述96条是原源版本的历史观察；finale-keepsake原脚本只核嵌套弹窗/返回焦点，shop-keepsake未完整覆盖localStorage及重复/Escape。源worker所称额外12条最终HEAD留影复核只存在本地，未入库，不作为本仓库已知通过。集成版本扩展同一 `harness/hero-explanation.mjs`，在新冻结产品上重新核六英雄×两端嵌套关闭/重复/Escape与完整state/journal/storage/localStorage，并提交脚本、完整gzip和报告；具体SHA、结果与新牌桌接线验证见[集成证据](../hero-drag-integration-2026-10-14/README.md)。原截图/报告保持其原SHA含义，不将新结果倒签旧观察。
