# 统一触觉与商店成功路径

产品提交：`11a7d776bc1e9da4327df7d96a535216d4ba8ca7`。独立分支 `dev/haptics-unified-20261017`，先从真实 main `43725f697b58ebb64bfa47197512d2d39fe46a48` 建立，再按追加授权正常快进合入商店候选 `c9f5f5342ec556e59026ab1958ab1887f33463ed`。本包未合 main；P08 仍为 in_progress。

已运行的触觉路径：既有 OwnedJokerInput 的触控长按拾起；ShopScene 的 BuyOffer / BuyBasicTool 在持久提交且非 duplicate 后请求购买节拍；商店 ReorderJokers 在保存成功后等待被拖牌的真实 tween 落位（减少动态时立即落位）请求落位节拍。失败、重复收据、关闭购买弹窗、取消、切场、后台、开关关闭和旧回调均不补成功触觉。后续菜单重试保存没有旧购买庆祝。

独立设置位于菜单“画面、声音与触觉”，存储键为 `dachoupai-haptics-v1`，显式关闭可重载保留，与声音和减少动态独立。无 Vibration API 时禁用并显示无振动能力；有 API 时仍显示设备/系统的不确定性。只有 visible + `navigator.userActivation.hasBeenActive` 才请求，不能确认激活时保持静默。首次触屏 pointerdown 不伪造激活，长按拾起错过的请求不在抬起后补播。

统一节拍按时长区分：选中 6ms、拾起 12ms、保存落位 16ms、购买 12/停30/18ms、关键乘倍率 22ms、最终结算 28/停45/36ms。API 不能设置硬件强度。同类/较轻事件在安静窗口内合并为首拍，乘倍率全局至少间隔600ms且每个 scope 最多三次；最终结算优先级最高。无计时队列或延迟补震，普通加分不逐项振动。API 返回 true 仅表示接受了请求。

## 验证

- [checks.json](checks.json)：7文件69项相关单测、TypeScript、构建通过。ShopScene 单测使用真实 `send → dispatchRun → SavedRun → store.commit` 路径，延迟/失败由内存 SaveStore 注入；包含 duplicate、后台/关闭/取消、保存后落位前取消与减少动态落位。Phaser 场景视图为测试夹具。
- [browser-report.json](browser-report.json)：产品提交上的干净生产构建，Chromium 153.0.8010.12 headless、390×740，10项通过。真实 CDP touch 首按/抬起激活、独立开关与重载、真实菜单关闭停振、自然新局第一笔购买、正常存档导入后第二笔购买、真实长按拖拽保存落位及 pointercancel。为了获得两张持牌，第二次购买前通过正常导入入口载入 gold=100 的明确资金夹具；不作为自然经济/平衡证据。菜单关闭使用层级 scope 夹具；无API提示使用能力缺失夹具，未运行 Safari。
- [runtime-settings.png](runtime-settings.png)：同版真实设置入口。截图与 API 观察都不能验证物理触感。

**NOT_RUN：实体 Android / iOS 设备、实际振动/力度/舒适度；GameScene 选牌、保存落位、计分和英雄乘倍率的触觉接线与同版运行验证。** 软件测试和浏览器 accepted=true 不签触感达标。不安装浏览器扩展、驱动或第三方触觉桥。

## GameScene owner 接线合同

导入 `Haptics` / `HapticScope` 自 `../haptics/Haptics`。每个交互、保存意图和真实计分 generation 在开始时创建 `Haptics.shared.createScope(signal?)`，保存这个 scope；不要等 async 成功返回或 impact 才新建，否则取消期间的旧意图可能被复活。新意图另建 scope，旧 scope 用 `cancel()` 永久失效。AbortSignal 应覆盖整代演出；scene shutdown/destroy、Escape、pointercancel、快进、回看切换、失败时取消。页面 hidden/blur/pagehide、菜单开关和设置 off 已由公共层主动停止并使旧 scope 失效；恢复可见后仅真实新操作建立新 scope。

| 接口 | 实际触发点 |
|---|---|
| `selectionChanged(touch)` | 成功改变触控选牌后；不对 mouse、重复选择、预览或取消触发。touch 来自真实输入类型。 |
| `pickup(touch)` | 已有长按确认抬起；OwnedJokerInput 已接，不要另加一次。 |
| `saved('placement', result.receipt.commandId)` | dispatchRun 持久成功、`!result.duplicate`；拖拽接 `pendingDrag.settle(true, () => scope.saved(...))` 的实际落位。普通按钮调序在成功渲染后调用。失败/取消/无位移不触发。 |
| `saved('purchase', result.receipt.commandId)` | 商店已接，场景 owner 无需重复接。使用全局唯一 commandId，不能用 offerId 或定义ID。 |
| `multiplierArrived(event.eventId)` | 正向 `multiply-multiplier` 的真实 impact。windup/transfer 结束且 abort 检查之后，沿 `impactAccumulator`/现有数字打击点。用 Rational 比较 after.M > before.M，英雄来源同一路径。普通 +H/+M 不逐项振动。 |
| `settlementArrived(score.rootId+'/final-score')` | award 的 convergeScore 到达且 abort 检查之后，最终值已显示的落点。每代一次，不在 enqueue 或 fastForward 补发。 |
| `cancel()` | 主动停止自身节拍并永久拒绝本 scope 的晚到回调；旧 owner 取消不会停止其他 owner 的新关键拍。 |

[GameScene-score-proposal.patch](GameScene-score-proposal.patch) 是基于本产品提交中 GameScene 的**未应用评分接线提案**，只读 `git apply --check` 通过；未在 GameScene 应用、编译或运行。它提供预先建立 scope、impact、award、EffectQueue abort、快进和 shutdown 的最小位置示例。连续计分 owner 应与其正在修改的时间线合并，并补齐上表选牌/重排路径及实际事件、取消、回看、失败测试，不能因提案存在便关闭该缺口。

正式依据：[MDN Navigator.vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)、[W3C Vibration API](https://www.w3.org/TR/vibration/)。
