# 辛弃疾候选补牌阻断：原局可恢复修复

**已复现、已修复。** 用户13:55截图的Q♥、K♦、10♥三张候选、状态选补牌、无确认入口，在未改GameScene的main `da671af2e59bac6877a954b000ba4c527fddcf7f` 上复现：[原故障截图](baseline/broken-three-only.png)、[原故障录像](baseline/continuous.webm)、[基线完整状态和错误](baseline-report.json.gz)。控制台真实错误为 `TypeError: Cannot read properties of undefined (reading 'visual')`。

根因是 SceneView 的 handWindow 回调使用 `run.handOrder.length`。技能弃5张后原保留3张、候选7张，布局只建3个座位，renderHand遍历第4张候选时异常；后续refreshSelection、候选说明和“确认留5”更新未运行。刷新恢复同一pending-refill仍会再次异常。保存的7张候选完整，既不是漏牌，也不是对话框被关闭或确认按钮单纯在屏外。旧测试弃3留5、候选同为5张，数量恰好相等，没有覆盖该错误。

最小产品补丁 `80b8dab4df781f46efd4020e5fc7f873441e6775`，分支 `dev/xinqiji-refill-recovery-20261017`。GameScene仅新增handLayoutWindow getter并让SceneView使用它，布局数量与实际hand getter一致。没有修改规则、存档或清掉pendingRefill；没有覆盖源牌、英雄/c12/音频改动。整合可先单独接80b8dab4，后续提交只补测试和证据。

新版本重新进入原pending-refill保存即可显示全部候选，不需要重开、弃存档、迁移或再次支付技能。收起后显示原保留牌，继续选择后按候选数重新布局。

## 修复版实际短流程

干净提交 `65f3558056f73f80094b510625ae8efc233eda1b` 编译；相对80b8dab4产品源码无变化，只扩展测试至确认后的真实下一手。三组完整通过，[完整状态/journal/storage与正式命令逐字段比对](fixed-report.json.gz)：

|流程|结果|
|---|---|
|手机390×844，真实技能弃5张|7个候选/7座位，菜单开关、收起/继续、技能入口、刷新恢复可用；选4张仍不能确认，选5张可确认；补回8张后真实出下一手，回await-input；[录像](phone-five/continuous.webm)、[7候选](phone-five/all-candidates.png)、[可确认](phone-five/confirm-enabled.png)、[下一手](phone-five/actual-next-hand.png)|
|手机390×740，直接恢复已保存pending-refill|导入的原pending状态不变，菜单/收起/重新进入与刷新不写入命令；选5确认后8张，真实下一手可出；[录像](phone-restore/continuous.webm)、[恢复候选](phone-restore/restored-candidates.png)、[补回8张](phone-restore/continued-eight.png)、[实际下一手](phone-restore/actual-next-hand.png)|
|PC1366×768，真实技能弃4张|6个候选/6座位，要求准确留4；同样完成菜单/收起/恢复/确认及实际下一手；[录像](pc-four/continuous.webm)、[候选](pc-four/all-candidates.png)、[下一手](pc-four/actual-next-hand.png)|

三组均0页面错误。DiscardHand / ChooseRefill / 后续PlayHand的完整state与正式reducer相等，持久checkpoint与journal相符。ChooseRefill无额外金币/弃牌成本，RNG完全不变；菜单、收起/继续、刷新没有新增游戏命令。候选确认前后都保持同局身份、原保留牌、实际弃牌和未留候选去向。

19项窄测试通过：`refill-layout-recovery.test.ts`、`laohuan-discard-handoff.test.ts`、`laohuan-refill.test.ts`。新增回归按正式技能结果验证弃4/5张与checkpoint恢复，覆盖收起/继续及正常/演出显示牌座位。`npm run typecheck`通过。

复现与修复均为明确控制的虚构牌序，未读取或上传用户真实存档/Library截图。基线夹具6金，修复夹具显式3金；实际正式目标均480，与用户截图600不同，未修改规则目标，两者均走相同pending-refill渲染分支。手机为真实浏览器触屏输入模拟，未冒签物理手机/Safari或整体视觉验收。此修复只解决本次可继续局阻断，不扩其他英雄或演出需求。
