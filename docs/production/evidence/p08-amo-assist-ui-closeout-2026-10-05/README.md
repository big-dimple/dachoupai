# PR20 阿默 UI 有限收尾

从精确 a7870b5 接手，正常合入已审 d6da224。最终远端源码 `41efea9be856988245f71fb9a29eaff0d83381cb` 与冻结本地 `bb02bf1a9efa5d551e66e4dac4235400bc193ace` 的完整 tree 均为 `36e6f7772b79b87440fee75827ad4f781d617abb`。此目录为随后追加的证据，不改源码。最终 review head 与精确 CI 见 PR20，main 仍等待父独审。

[390十四牌](390-fourteen.png) · [320十四牌](320-fourteen.png) · [短横844×300](short-triple.png) · [390八牌](390-eight.png) · [320九牌](320-nine.png) · [桌面](desktop-nine.png)。六张通过图及[桌面原FAIL](desktop-nine-FAIL.png)均实际查看；PNG hash/source绑定见 summary.json。

- `flows.json`：最终六视口原生触控、bounds与每组候选遍历；390/320十四牌各10组，短横4组。规则入口≥44px，文字/控制/主手预览互不交叠，无预计总分。
- 390八牌、320九牌：AI只换主手清副组，整组undo、合法手改/交集清理、双排序与主副/undo清理、菜单保留；完整state/journal/export/RNG检查。390长按助攻详情身份和整组取消已核。三个动作均有420ms pointercancel和双指先抬主指取消。
- 390：真实resize及切换标签关闭返回保完整草稿；保存退出清草稿/undo、reload继续不恢复临时选牌；注入IndexedDB配额失败时旧state未发布，pending逐字段等于唯一PlayAssistedHand领域候选，retry保存同一候选，seq只增一。reload/上手详情和持久trace演出不改变状态/奖励；新手清主副且额度已用。
- `published-profile-ui.json`：真实冻结v10/v11普通UI无助攻入口，普通PlayHand、实际角色/Joker顺序、导入/恢复、旧档回看不重奖。来源23c13f0；后续仅修desktop助攻布局，未重跑这条390路线。
- 最终2315 tests/129files、content/type/build、桌面/手机标准smoke、plan通过，三个仓库gate与原生六视口的source/index/HEAD保持。标准smoke明确用系统Chromium，未改断言。

保留 `first-five-pass.json`、`desktop-before-FAIL.json`、`browser-missing-FAIL.json` 的原源码身份；旧检查点/FAIL不改。产品修改仅desktop助攻文案布局及合入F checkpoint校验；其余规则/profile/resolver/Shop/资源树保持。详见summary中的逐对象相等证据。

均为合法fixture/software Canvas，不是自然获取、平衡、真机、GPU、FPS或听感结论。其他五人、素材、旧存档和默认v11不动；P08仍in_progress，C04 D32及原门槛保持。
