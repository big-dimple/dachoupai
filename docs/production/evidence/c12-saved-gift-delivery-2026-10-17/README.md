# 锦上添花：保存数据核对与当场到账组件

**确定场景未复现漏发。** 正式规则与 SavedRun 实际提交：同场普通同花700，再普通顺子580，累计1280超过原章节2目标1000，T04 方片染直接入道具箱；满包时该次染料不入包，改收2金。没有调整目标、发奖规则、随机、存档或自动使用染料。未取得用户怀疑漏发的原局存档，这不是对那一局的否定或已修漏发结论。

产品分支 `dev/c12-saved-gift-flight-20261017`，基线 main `934477727201a83b7b2590ee9a2a4645b5f45606`。独立呈现模块实际编译与动态检查源码为干净提交 `fc84d5438bdd3e3db7aeca16c4133240cc6bbb32`；后续 `f2761600140aae1647bba3e0a244c31ed3d7bbc2` 仅改正式结算核验脚本。**本分支未修改 GameScene，组件录像不能代签 GameScene 接线完成。** [接线合同](../../C12_GIFT_DELIVERY_HANDOFF_20261017.md)

## 数据证据

- [正常入包完整保存数据](phone/saved-data.json.gz)、[满包完整保存数据](full/saved-data.json.gz)：含初态、第一手、第二手前后状态、真实命令/收据/事件、checkpoint、重复结果及恢复结果。
- 普通入包：实际 `owned/c12`、`onStageClear/reward-consumable`、T04、库存0→1，新工具实例真实存在；金币为30。
- 满包：原T01/T17保持，实际 `onStageClear/add-gold`、rewardDefinitionId仍为T04、该笔30→32；没有新T04，仍消费同一次奖励随机。
- 四个染料由正式等长固定池T03/T04/T05/T06与 `rng.integer(0,3)` 决定；实际不同奖励游标已覆盖全部四种，UI不抽随机。
- [47项相关窄测试](checks/narrow-tests.log)通过，包含正常入包、满包、普通同花+同花顺不足“普通顺子”资格、真实失败、保存失败保留旧公开状态、重试使用原候选不重抽、重复命令/存档恢复不重发与演出去重。`npm run typecheck`退出0。

`savedC12Gifts(before,result)` 仅消费 await SavedRun 成功且!duplicate后的新过关事件。失败保存无事实可播；读档/查看lastTrace不触发模块，也没有新增“领取”命令。内部保存和诊断不变。

## 动态证据：独立编译组件

[完整组件报告](component-report.json.gz)，Edge143.0.3650.80，真实Phaser编译产物；数据来自上述实际规则与保存，来源摆动使用明确的测试回调。来源采用仓库现有c12牌图，飞行载荷为程序绘制染料瓶/花色或金币图标，0新素材。

|流程|结果与证据|
|---|---|
|PC1366×768|PASS，[连续录像](pc/continuous.webm)、[来源摆动](pc/source.png)、[转移](pc/flight.png)、[到账](pc/arrival.png)，102帧|
|手机390×844/DPR2触屏|PASS，[连续录像](phone/continuous.webm)、[转移](phone/flight.png)、[到账](phone/arrival.png)，101帧，来源→道具箱、方片染+1、0→1/2|
|手机满包|PASS，[连续录像](full/continuous.webm)、[金币到账](full/arrival.png)，104帧，来源→金币、“道具箱已满 +2金”、30→32，库存仍2/2|
|减少动态390×740|PASS，[连续录像](reduced/continuous.webm)、[静态关联与数量](reduced/arrival.png)，56帧；来源姿态恒0、无flight，保留来源到去向的静态关联|
|快进/重复|PASS，[连续录像](cancel/continuous.webm)、[清理](cancel/clean.png)，中途abort后无到达回调、无节点、姿态恢复；所有五组重复同一事实均返回duplicate、无第二次到达|

正常三组观察到测试来源内层抬起14px并倾斜，连续flight有30/30/31帧；这不是对正式GameScene动作幅度的签收。到达图标逐帧不与实际道具箱/金币框相交，读数保持可见。没有修改状态来补动画，演出前后完整after状态相等。

组件 `StageGiftDelivery` 只管理有限 overlay，来源姿态交 `pulseSource` 回调，由 GameScene 当前唯一动作owner接内层。真实事件槽内await play；来源/去向用实际Box，快进/代际取消/hidden/blur/shutdown销毁；取消后原事实不再排尾队列。关闭或减少动态不飞行，直接保留可读关联。无自动使用、无全屏粒子、无新音轨/触觉。

## 删除玩家查询入口

IntermissionScene 已删除“赠品去向”条件按钮及 inspectGift 专属弹窗，成功过关使用原“本场详情”，末关共用渲染也没有额外赠品查询入口。没有换名重建流水页；结算带可直接显示实际奖励短句，内部 StageGiftReceipt/事件留作保存诊断。

[正式结算报告](settlement-report.json.gz)：干净源码 `f2761600140aae1647bba3e0a244c31ed3d7bbc2`，PC1280×720普通入包、手机390×740满包两组均PASS；均实际两手清关、断言无“赠品去向”可见文字、打开的为原“本场详情”，关闭和读档无状态变化，直接前往商店后库存、金币和奖励随机与清关后相等。[手机满包结算截图](overflow-740.png)。这两组没有自动或手动使用染料。

独立组件与数据通过不代签正式GameScene当场航线，仍需01a147ec在实际c12事件槽接组件并验证来源/HUD定位和换场。真实设备、听感、触觉、用户审美、低端性能、Safari未验；未扩其他赠品或经济系统。

## 保留的失败

首轮程序报告为PASS，但目视为FAIL：[缺图占位](initial-visual-failure/missing-source-texture.png)、[到账图标遮库存字](initial-visual-failure/obscured-inventory-label.png)、[原报告](initial-visual-failure/programmatic-report.json.gz)。修复测试页相对资源路径，并将实际落点移到入口外侧；新增真实c12纹理加载和图标不遮目标的断言，最终五组重新编译通过。没有把旧占位图当正式证据。

首次普通结算检查已实际入包并进入普通“本场详情”；读档后保存状态一致，但观察器把可选金币图异步加载造成的14.2px文字偏移也当成数据差异。观察器改比事实、文字与可见范围，[原失败报告保留](initial-visual-failure/settlement-observer.json.gz)；没有为适配断言改结算布局或数据。
