# 秦琼押注锁定展示修正

基线：main `43725f697b58ebb64bfa47197512d2d39fe46a48`。独立分支：`dev/touye-locked-skill-state-20261017`。

原候选 b8c89e8c 只改 `HeroSkillPresentation`、`HeroAbilityCue`、`TouyeWagerCopy` 和定向测试。当时 `GameScene`、`ShopScene` 由任务 `01a148ba` 独占，原候选没有编辑它们。以下原候选说明与验证保留；本次获释放后的场景接线见末节。

## 保存事实与显示

领域的 `touyeWager.resolution === 'pending'` 表示目标已随真实弃牌保存、等待下一次出牌结算，不是玩家还需完成押注。显示目标直接来自该条 `commit.target`，不由当前选牌推断。

| 状态 | 技能状态文字 | 辅文 / 依据 |
| --- | --- | --- |
| 未选弃牌 | 条件未满足 | 先选1–5张弃牌 |
| 当前可押 | 可用 | 弃牌前押牌型并换牌 |
| 当前不可押 | 条件未满足 | 当前不能押目标 |
| 换牌动画（显式临时阶段） | 换牌中 | 保存前不宣称已押；保存后保留真实目标 |
| 已押、等待出牌 | 已押顺子（或实际目标） | 出牌后结算 |
| 出牌动画（显式临时阶段） | 结算中 | 保存前不推算成败 |
| 真实出牌后 | 已用 | 只显示 `lastTrace.touyeWager` 已保存结果 |
| 挑战禁用 | 已停用 | 本场角色能力停用 |

锁定及动画状态输出 `actionable:false`、`attention:false`、`available:false`、`opportunity:false`。正常静态锁定状态无需修改现有 `GameScene.updateHeroControl`：原有 `pending` 红色分支不会再命中，已有可用性条件也不会再催促使用。`TouyeWagerCopy.status` 同时输出“已押实际目标 · 出牌后结算”，由已有状态栏调用读取。详细规则、概率、倍率、命令、RNG、存档及旧身份规则不改；旧押注身份没有新摸牌 `refill` 字段也正常锁定。辛弃疾待留牌仍是 `pending / 待完成`。

## 交给共享场景负责人的最小接线说明（待办）

静态锁定修正已由现有调用接入。为在动画中也区分“换牌中 / 结算中”，任务 `01a148ba` 需要接入已有的新展示参数：

1. 从 `HeroSkillPresentation` 引入类型 `TouyeSkillPhase`，给场景增加 `private touyeSkillPhase?:TouyeSkillPhase`。`create` 与 `shutdown` 清为 `undefined`，只保留在场景内。
2. 在 `updateHeroControl` 原有 `heroAbilityCue(..., draft)` 的 `draft` 中补 `touyePhase:this.touyeSkillPhase`。无需改其它角色草稿、命令参数或存档。
3. `discardSelected(..., bet, ...)` 通过现有前置检查后，在首次 `updateControls()` 前赋 `this.touyeSkillPhase=bet?'drawing':undefined`。沿现有 `lifecycle/intent` 检查在对应 `finally` 中清空，再刷新控件。失败/重复提交也走相同清理；旧异步回调不得清除新场景的阶段。
4. `playSelected` 通过提醒与现有前置检查后，在首次 `updateControls()` 前赋 `this.touyeSkillPhase=this.pendingTouye?'settling':undefined`。待 `presentTrace` 返回，在对应仍存活的 `finally` 中清空并刷新控件。清空不要仅依赖 `run.phase === 'await-input'`，因为最后一手也会离开该阶段。
5. 不要用 `playing && pendingTouye` 猜动画种类，两种操作都会满足。可在原有按钮启用表达式上追加 `heroCue?.actionable!==false`，保持当前真实命令可用性检查。

接口例：

```ts
heroAbilityCue(run, facts, ids, assistAvailable, {...existingDraft, touyePhase:'drawing'});
heroAbilityCue(run, facts, ids, assistAvailable, {...existingDraft, touyePhase:'settling'});
// 动画结束后省略 touyePhase，重新读取保存状态。
```

本分支没有代改共享场景；上述接线为待执行动作，原因是用户指定场景唯一负责人，非审批拒绝。父线程负责 dot 上实际押注、换牌、选牌、出牌与恢复的 UI 检查。本地没有启动浏览器或长局。

## 本地验证

2026-10-17，定向 `vitest` **7 文件、93 项全部通过**：

```text
npx vitest run tests/touye-locked-state.test.ts tests/hero-skill-presentation.test.ts tests/hero-ability-cue.test.ts tests/touye-new-core.test.ts tests/touye-wager.test.ts tests/hero-play-reminder.test.ts tests/laohuan-refill.test.ts
```

覆盖真实 `DiscardHand` 锁定、不同选牌不改变目标、存档往返、临时动画不推算成败、真实 `PlayHand` 成功及失败后的记录、条件不足/Q01禁用、旧押注身份及辛弃疾留牌待办。全状态快照断言包括 RNG，展示调用不写运行状态。测试使用已有明确植入的可见牌/牌堆分区夹具，仅证明有界展示责任，不代表自然供给或长局验收。

`npm run build`（TypeScript + Vite）通过；Vite 提示现有主包超过 500kB。`git diff --check` 通过。没有 main 合并、CI 查询或部署。

## 场景最小接线

普通合并提交 `b3ccf59011eb0b9f288a752aab3a2d4e233cd6a5` 原样纳入 b8c89e8c；合入携带的 44 个其他文件逐字节等于候选基线 `origin/main 43725f69`，6 个候选文件逐字节等于 b8c89e8c。场景接线提交为 `1607445bfdbcc3b492424beb3f0a5cc7e0d17714`，已普通 push 到 dev，GameScene 已释放。其余新增运行时改动仅在 `GameScene`，不改领域、计分、经济、存档格式或候选投影模块。

`touyeSkillPhase` 只活在场景中：通过真实操作前置检查后，押注弃牌设为 drawing、已锁定押注出牌设为 settling，传入已有 heroAbilityCue；换牌效果/计分演出等待期间不催促再使用。对应 finally 在仍有效的 lifecycle/intent 中清空并刷新控件，包括保存失败、重复提交和离开 await-input 的结算；create/shutdown 也清空。普通弃牌或未押注出牌不冒用此状态。锁定和两种动画阶段均不启用技能按钮、不亮就绪强调。

新增 `tests/touye-scene-phase.test.ts` 7 项，运行真实领域命令并延迟保存/演出边界，检查真实目标、下一手选牌、失败/重复、过期回调隔离、过关清理和普通动作。10 文件 108 项定向测试通过（原候选 93 项 + 场景/助攻入口/弃牌交接 15 项）。TypeScript 检查和正常 Vite 生产构建通过；325 模块，保留现有大 chunk 提示。增量源码 diff --check 通过。普通合入携带的三条历史日志末尾空行提示原样保留，没有修改其历史内容。

浏览器小范围检查由 [scene-check.mjs](scene-check.mjs) 提供：已验证的受控当前身份存档，通过真实菜单导入、鼠标/触屏选弃牌、确认押注、选下一手、冷继续与出牌；只读收集真实帧状态，无领域或场景动作后门。结果与源码哈希见 [scene-check.json](scene-check.json)。此前脚本菜单文字错误和按钮/卡面双匹配的失败单独保留，均在操作提交前失败；修正的是观察脚本，没有改产品逻辑。软件证据不代替自然长局、真人或物理设备验收。P08 仍 in_progress。

最终 1912×954 鼠标与 390×844 触屏两档 PASS，0 页错误。真实帧序列均为 drawing/换牌中 → locked/已押顺子 → settling/结算中 → used/已用；三个不可操作阶段按钮均 disabled、无 opportunity 强调。下一手选牌不改变完整 RunState，冷继续逐字段等于已保存押注状态，临时阶段为空；真实出牌逐字段等于领域命令产生的结果，包含 RNG 和计分记录。四个运行时源码哈希已与 1607445b 源码逐项核对相等；构建时同版源码尚未提交，不能只据其 build-info 的旧 HEAD 判断运行版本。

已实际查看 [桌面选牌后锁定提示](1912-selected-locked.png) 和 [触屏选牌后锁定提示](390-selected-locked.png)：技能状态均为灰色“已押顺子”，底部“已押顺子 · 出牌后结算”，出牌可继续。原始工具截图和商店证据未被替换。本轮没有 main push、CI、部署或域名操作。
