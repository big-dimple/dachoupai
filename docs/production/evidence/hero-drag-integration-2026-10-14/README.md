# 三项已完成成果的集成：有限软件证据

基线 main `69f46e47f250ec3ad7bc55ed11f7888326eecf8f`。只在开发分支 `integration/hero-access-table-drag-2026-10-14` 集成，不合并或推送 main，不部署，不关闭源 PR，不重跑18局，不改唯一总计划。

| 已核源 | 精确 head | 保全方式 |
|---|---|---|
| [PR167](https://github.com/big-dimple/dachoupai/pull/167)，英雄说明入口 | `f6282cc6eb6cf443ca7560b27a65ea884c1bacaf` | 正常 merge，全部提交及原证据保留 |
| [PR168](https://github.com/big-dimple/dachoupai/pull/168)，牌局拖拽 | `ae7b733d819d6258a7e48c7c41610279e188d4f3` | 正常 merge，全部提交及原失败/证据保留 |
| [PR169](https://github.com/big-dimple/dachoupai/pull/169)，扑克增强说明 | `9bab8b3f01f67c8b1a96c2911b0047a692b4d92a` | 后续明确通知完成并授权纳入后正常 merge；未拉入其它未完成分支 |

远端 PR 元数据与 git fetch 均核到上述 head，三个源的 base 均为本基线，open/draft/unmerged。没有文件冲突。完整祖先、源产品文件逐对象保全及保护范围见 [protected-and-sources.json](protected-and-sources.json)。

最终原生验证冻结源码/脚本提交 `a6044c6a0b185f479681de2d98c745cadfde3fd8`，src tree `e3079583af23eb182faa9ff5f9e55486232b5050`，harness tree `586d5d0ad0c1589244f2e560da395fdd9f74604d`；各报告记录该 SHA，tracked src/tests/harness 未修改。后续提交仅归档本目录证据，产品与脚本树保持。最终开发分支 head 与该 head 的新 CI 在集成 Draft PR/交接回复另核，不能借源 CI、pre169 检查或本地检查签最终 CI。

## 必要产品接线

按 PR167 原 `GameScene-parent-integration.patch` 成功执行 `git apply --check` 并应用。HUD头像、既有说明文字和有实际装饰立绘的 PC 牌桌先进入公共英雄说明首层，再通过“查看本场技能操作”进入原 `inspectRole`。草稿读当前选牌及阿默副组、二响交棒牌、谢幕燃金档、阿燥释放选择；原快捷技能操作保持。处理中/结算中/未保存或只读可以查看说明，进入技能操作的按钮禁用。

另确认并最小修复 PR168 的一行悬停回归：新轨道原先用 `ownedReady` 拦鼠标悬停，骰爷待兑现时连查看也被挡住。现在只读悬停按可写、非演出和 await-input 门槛，调序仍严格按原 `ownedReady`，没有放开待兑现调序。对 PR168 的 GameScene 差异仅原英雄补丁及这一行，未重写共享拖拽组件。

计分/目标/价格/星级推荐/成长/随机/保存格式/旧档迁移、domain/content/application/platform、依赖、音路、资产、工作流、AGENTS及 DELIVERY_PLAN 全部逐对象等同基线。PR167/169的源产品文件逐对象保持；商店拖拽与两共享组件亦保持基线。

## PR167 证据收口

已收窄[源 README 的96条声明](../hero-explanation-access-2026-10-14/README.md)：原 finale-keepsake 只核嵌套与焦点，shop-keepsake 未完整覆盖 localStorage及重复/Escape，不能统称每次四项全部核过。源 worker 称额外12条最终HEAD留影核验只留本地，未入库，未当作已知通过。

扩展原 [harness/hero-explanation.mjs](../../../../harness/hero-explanation.mjs)，在本集成冻结 SHA 实际重核六英雄×PC1366×768/触控390×740。新的[120条报告](explanations/report.json)含14条明确无实际角色图/手机无装饰立绘的记录；这些不冒充入口通过或120局。实际展示的入口均检查首层英雄名/当前条件、默认收起且展开前无扑克节点、重复点原坐标不穿透、关闭/再开/Escape、canvas返回焦点及可见≥44px返回按钮。

六英雄每端各一个商店手记和失败终态最终留影，共24个嵌套入口，每个实际关闭/重开/Escape并返回原语义按钮；原父弹窗仍在。每个循环比较完整 state、journal、IndexedDB存储对象与未过滤的 localStorage，真实完整快照在 [explanations gzip](explanations/full-state-journal-storage-localStorage.json.gz)。公共手牌/现金及四次单张失败命令为合法受控夹具，不是自然六英雄整局。

## 六英雄草稿、实际技能事务和禁操作

[harness/hero-drag-integration.mjs](../../../../harness/hero-drag-integration.mjs)在PC1366×900和390×844用真实鼠标/触控/DOM按钮操作六英雄。夹具公开首场两对主手、剩余Q三条及15金；阿燥仅用一笔弱两对真实命令蓄一层，原400目标不改。未改阶段/账本去绕当前保存校验。

- 阿默实际选择三条副组并出助攻；二响实际选9点交棒出牌；谢幕实际选燃10；阿燥实际选一层释放。公共首层开/关/重开/Escape与返回原技能窗口保完整已选草稿，查看不消费机会或写保存。
- 老幻实际戏法弃1张，保存候选后从公开候选实际留够所需张数；骰爷实际选弃1张、选合法目标、取消不弃牌，再重新确认赌约弃牌。取消完整保存和草稿不变。
- 两端共14笔真实技能命令，每笔完整状态等于原 `applyCommand`，journal仅追加原命令，IDB.current等于 `makeCheckpoint`，revision仅+1，未过滤localStorage保持。
- 六英雄每端各一真实 `IndexedDbSave.commit` 延迟，共12个处理中禁操作窗口，发布state/journal/IDB仍为原值，首层操作按钮disabled，dispatch只有原一笔。二响两端另核实际计分presentation，按钮disabled且无新命令；谢幕两端另用真实controller只读状态核可看说明/禁进入操作。

[skills报告](skills/report.json)、[完整快照](skills/full-state-journal-storage-localStorage.json.gz)包括所有原命令、草稿和禁操作状态。观察器不替产品执行技能方法，只用原生界面操作，页面evaluate用于读状态/受控存储延迟及只读故障。

## 拖拽、保存失败和冷恢复

扩展并重跑原 [harness/table-owned-joker-drag.mjs](../../../../harness/table-owned-joker-drag.mjs)：PC1366×900、390×844、低动态DPR2的390×844三组均通过。16px/1.06拾起、二维跟手、插入让位/目标位、延迟保存、成功落位及快速释放保存首帧保持；每组3次普通调序、一次快放延迟和一次quota失败固定候选重试。

每组11项手机/9项PC取消边界（静止、同槽、出区、pointercancel、手机提前移动/双指、受控hidden、resize、Escape、blur、拖动中只读）保持完整保存且dispatch0；readonly、老幻待留牌、骰爷待兑现和实际计分演出不能提交调序。PC待兑现鼠标悬停现在实际打开预览，tap详情的左右移仍disabled。轨道外菜单手机原生滚动保持；不签全页pinch。

真实存储quota故障保持已发布state/journal/IDB及原顺序，原菜单出现“重试保存”；解除故障后只保存固定候选，刷新回title完整冷恢复相等。[drag完整gzip](drag/full-state-journal-storage.json.gz)保所有存储/原生输入/逐帧数据，[可读报告](drag/report.json)保摘要。此原拖拽观察器的localStorage只比较应用键、明确排除lease键；英雄/留影脚本比较未过滤localStorage，不混淆两种范围。

另提交并实际运行 [audit-snapshots.mjs](audit-snapshots.mjs)，独立离线重算全部15笔调序（包括3次失败后的重试）的完整state/journal/IDB与原命令，并核3次完整冷恢复及24个嵌套四项全保存，全部通过；[审计结果](snapshot-audit.json)。此审计不是额外一轮原生运行。

触感能力仅记录 `typeof navigator.vibrate`、secure context、pointer coarse；本云浏览器暴露function不代表系统允许或实体设备实际震动。src无新增振动调用，未签实机震动/宿主触感，也不否定用户已在商店实际感到触感。

## PR169 的受影响入口

在同一冻结SHA原样重跑 [harness/enhancement-reference.mjs](../../../../harness/enhancement-reference.mjs)：PC1366×768/390×844共84条原生查询/展开/返回观察，增强入口七项列表、玻璃/留声/金纸/返场/幸运用途与获得来源、玻璃面价格/消耗及受控玻璃/留声手牌实际长按详情；完整state/journal/IDB/localStorage相等，dispatch0。报告与全部原尺寸图在 [enhancements](enhancements/report.json)。又原样跑[源补充滚动观察器](../enhancement-reference-2026-10-14/rule-scroll-observer.mjs)，两端各三段关键次数/破碎/费用实际滚入可见区，完整保存相等；[滚动结果](enhancement-rule-scroll/report.json)。正常新局仅到首店，没有购买、赋予、触发或续跑游戏。

## 验证、截图和保留的失败

两组定向共21文件383项通过（[143项](checks/targeted-tests.txt)、[240项](checks/targeted-save-rules.txt)），[typecheck](checks/typecheck.txt)、[build](checks/build.txt)、[唯一计划静态检查](checks/production-plan.txt)通过；原大bundle提示保持，没有改依赖/阈值。

全部PNG为本地浏览器原尺寸截图，无后处理。[manifest.json](manifest.json)/[SHA256SUMS](SHA256SUMS)保大小/hash。已实际view_image查看以下最终像素及六角390草稿/禁用首层；这是局部可读/可达检查，不签整屏美学。

| 局部操作 | PC | 390 |
|---|---|---|
| 公共首层及已选草稿 | [骰爷HUD](explanations/1366-touye-table-HUD-first.png) / [装饰立绘](explanations/1366-touye-table-decoration-first.png) | [阿默已选助攻](skills/390-amo-chosen-first.png) / [谢幕已选燃金](skills/390-xiemu-chosen-first.png) |
| 处理中禁操作 | [真实计分presentation](skills/1366-erxiang-presentation-blocked.png) | [老幻等待保存](skills/390-laohuan-saving-blocked.png) / [骰爷等待保存](skills/390-touye-saving-blocked.png) |
| 拾起/跟手/占位 | [途中](drag/1366x900-slow-mid.png) | [拾起](drag/390x844-slow-held.png) / [途中](drag/390x844-slow-mid.png) |
| 保存中/失败重试 | [保存中](drag/1366x900-saving-delay.png) | [保存中](drag/390x844-saving-delay.png) / [失败菜单](drag/390x844-save-failure.png) / [重试成功](drag/390x844-save-retry.png) |
| 骰爷待兑现只读悬停 | [预览可见](drag/1366x900-pending-touye-hover.png) | 原禁调序保持，非手机hover验收 |
| 增强详情与关键规则 | [玻璃详情](enhancements/1366-glass-card-rules.png) | [玻璃详情](enhancements/390-glass-card-rules.png) / [关键规则尾部](enhancement-rule-scroll/390-玻璃牌-rule-tail.png) |

完整日志在[checks](checks)。原source三包历史证据保持，另保本轮未通过的观察：

1. [悬停回归FAIL](failures/pending-touye-hover/report.json)：集成补丁已应用但未修悬停时真实鼠标得到undefined。随后只修一行查看门槛，新冻结三组通过；这是本地产品回归，不是CI失败。
2. [pre169/skills FAIL](pre169/skills/report.json)：复用旧中盘夹具直接改stageIndex，当前route history校验拒绝。改为第一场合法受控手牌、原目标和真实蓄势命令，未改领域守卫。
3. [pre169/drag FAIL](pre169/drag/report.json)：新待兑现hover检查导入后controller换实例，观察器未重新绑定dispatch，造成0/1假失败。修观察器重绑定，无产品保存修改；新冻结三组及离线15笔完整审计通过。
4. [pre169/explanations](pre169/explanations/report.json)：`74c8a81817cc48efc83b7f9661fa89cdd904a2be` 的两项集成120条通过，原始结果和截图全部保留；收到PR169已完成通知后纳入并重跑最终版本，不借此签三项集成。

没有完整游戏体验、18局新身份平衡、自然供给/经营、人类理解、实体设备GPU/FPS、实机震动、听感或整体美术签收；这些仍待所属验收。自动检查、局部原生操作、CI成功只证明各自记录范围。
