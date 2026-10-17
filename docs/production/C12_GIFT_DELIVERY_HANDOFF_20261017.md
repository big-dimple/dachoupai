# 锦上添花当场到账：场景接线合同

本批仅 c12；不改规则、随机、存档或染料使用。数据窄检查暂未复现漏发：普通同花700后普通顺子580，原章节2目标1000，实际成功后 T04 直接入包；满包该次 T04 未入包而转2金。四个等长池位置与满包仍消费一次奖励随机均来自正式规则，不在 UI 再抽。未取得用户怀疑漏发的原局存档，不据此否定该局报告。

`SavedStageGift.ts` 从**已 await 的 SavedRun 成功且 !duplicate**结果中投影事实：

```ts
const before = controller.state;
const result = await controller.dispatch(action);
const gifts = savedC12Gifts(before, result);
```

仅新成功过关的实际 `onStageClear/c12` 事件可生成事实，含 eventId、commandId、clearId、sourceInstanceId、实际染料 ID/名称、tools/gold 去向、该笔 before/after/amount、实际新工具实例ID。恢复、查询 lastTrace、失败、重复均不得调用演出。保存失败重试若继续演出，须保留原 before；不得从待保存 export 候选提前播放。无需为演出写任何存档字段。

GameScene 当前由 01a147ec 持有，本分支**未修改 GameScene，也未把下述 hook 代签为已接入**。

## 唯一来源姿态 owner 与现有计分队列

场景创建一个 `StageGiftDelivery(scene, options)`：

- `parent`：现有 view.root。
- `source(instanceId)`：解析真实 jokerViews 的当前可见牌框，按 root 坐标返回 Box；可复用 ensureTraceSource，不能按定义ID取另一实例。
- `inventory()` / `gold()`：现有工具包按钮和金币读数的真实 Box。
- `pulseSource(instanceId, context, duration)`：调用你拥有的 `playOwnedJokerScoreMotion`，用本事件的 `ownedJokerMotionCue(trace,event)`；由该唯一 owner 摆动内层、外槽位/命中/拖动保持。不要再运行旧 animateJoker/focusSource 同时抢姿态。
- `reducedMotion()`：同时包含减少动态与关闭演出模式；组件变为静态来源→去向关联与真实数量，不摆动、不飞行。
- `blocked()`：现有菜单/对话框/只读/隐藏条件。进入阻塞即取消，没有恢复尾队列。
- `arrived(fact)`：只更新现有标签的显示值。正常包数用 fact.after/capacity；满包用该笔 gold before→after；**不能 dispatch、再次发奖或自动使用染料**。

新持久成功结果生成 gifts 后，和当前 score presentation 同代保存；在对应 `onStageClear` event 槽内 await `delivery.play(fact, context)`，替换该 c12 的旧普通 toast/无去向交易呈现；同一事件只播一次。不要在排队时开播，也不要把来源动作和航线拆进另一条无代际队列。该组件需来源220ms、转移540ms、到账阅读800ms，归入该事件已有演出时隙。其他赠品不扩。

`play` 返回 complete/cancelled/missing-anchor/duplicate；其 overlay 上有 gift/delivery、gift/path、gift/payload、gift/arrival 名称及 event/source/destination/before/after 数据。只分配有限 Graphics/Text，不加载新素材。真实来源缺失时不伪造卡牌；返回 missing-anchor，应检查 ensureTraceSource/生命周期。

快进/回看/新代/场景退出调用 `delivery.cancel()`，并沿既有 HUD 刷新显示真实已保存库存和金币；shutdown/destroy/blur/hidden 组件自清理。原 context abort 永久终止该次来源回调与航线；同一事实不会因再次调用而重播。销毁调用 `destroy()`。

## 已删除玩家查询入口

IntermissionScene 成功/末关共用路径不再显示“赠品去向”按钮，删除专属 inspectGift 弹窗及跳转。原“本场详情”保持原功能，没有换名重建赠品流水入口。实际奖励短句仍可在结算带显示；内部 StageGiftReceipt、保存事件、诊断数据保留，不用于新增玩家查询入口。历史 w3 测试改走普通本场详情及直接继续商店。

## 验证边界

`tests/c12-saved-gift.test.ts` 使用正式 reducer、SavedRun 和 checkpoint 恢复，不自行模拟发奖；覆盖正常入包、满包转金、普通同花+同花顺不足资格、真实失败、保存失败重试、重复命令/恢复、四种实际奖励与演出同代去重。

`harness/c12-gift-delivery.mjs` 编译独立 Phaser 组件，使用上述真实保存数据与受控来源动作回调，检查PC/手机/满包/减少动态/快进取消。它可证明独立组件路线、实际数量和清理；**不能代替 GameScene owner 接线后自然出牌、HUD位置和换场的最终短流程证据**。本批不要求玩家查询流水，也不主动扩历史回放。
