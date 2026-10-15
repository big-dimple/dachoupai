# B05 回音墙：本地受控遭遇样板

基线 `4a52fd0b0fb9ac0a49b8cb5e79abc8db4326e2d7`。PR177–182 保持；只新增对手表现/纯映射、测试与证据，GameScene 仅入场/基础事件/结束前接线，及父后续明确授权的 inspectHandRules 身份参数。HandRuleReference 的计分顺序文案已按保存身份补正。FailureSummary、Intermission 失败分支、domain/application/content/目标/RNG/保存/声音/六英雄/商店与图音素材均未改。

## 直接操作

在本分支 `npm ci && npm run dev -- --host 127.0.0.1`，打开本地地址。菜单 → 进度与存档 → 导入本局，选择本目录 `final/choices-controlled.json`。这是通过严格当前身份检查的受控第三章 B05，植入公开历史/已持 U01（九张手牌）及公开牌区排列，**不是自然遭遇或自然取得资源**。

菜单 → 规则 / 物品：

- 同型硬闯 · 对子：选择 2♠2♥；回到牌桌点原“出牌”，实际 **43**。等级后的基础 `35 → 17.5`，普通点数 `+2 +2`，倍率 `×2`，最终向下取整。
- 换型避开 · 高牌：选择 A♣；回到牌桌点原“出牌”，实际 **31**。本手没有减半事件；保留 2♠2♥。避开限制不代表本手更高或必胜。
- “自己选牌”取消弹框；两个选项只改本地选牌，均不自动出牌，不改保存或 RNG。

同输入手牌：2♠2♥A♣5♦7♣9♥J♠Q♦K♣。上手对子由真实 PlayHand 生成；无增强/版次/丑牌/主动，本手成长因子 ×1。重新导入同一文件可独立比较另一应对；原始完整事务/保存见 `final/report.json.gz` 和 `baseline/report.json.gz`。

其他可操作文件：`entrance-controlled.json` 在 EnterStage 之前显示已锁目标/针对范围，取消不抽牌；确认入场后才给当前已成型选择。`won-controlled.json` 为公开同花 Lv30 的真实过关前一手，`lost-controlled.json` 为真实剩最后一手的失败窗口。它们均通过 makeCheckpoint/readCheckpoint；没有合成 trace、破解奖励、额外加分或改目标。

## 实际呈现

- 原来首个基础事件落地后循环跳过所有 base；现在仅略过已画的首个 base，B05 的真实 `halve-base-heat` 进入原 showScoreEvent，热度从 35 实际滚到 17.5，倍率保持 ×2，再加两张普通点数。
- 首手 null 为首手，不叫破解。换型反应必须来自已保存 B05 trace、非空 previousHandType、不同 handType、且没有减半事件。缺失 trace/context 不推断破解；同型缺权威事件仅显示已存结果。
- 同场首次真实同型受限/首次换型各一个可快进的短特写；普通后续只走原事件。胜败态度由实际终局 phase 与已存热度/目标派生，结束前展示，不接触结果页失败摘要。
- 首登可以取消；回看可重复；低动态静态显示；快进/缩窗/离场中止由 EffectQueue abort 清除 DOM。恢复不自动重放，也不重计分。

## 有限证据与边界

B05 完整矩阵产品源码为 7dfebc1e；随后仅新增牌型规则只读文案与唯一身份接线，增量产品/原生详情源码为 9e7bbdc4。各报告保自身 SHA，不把旧图冒称新增文案的截图。精确结果和比较见 `final/summary.json`、`comparison.json`、`protected-trees.json`。PC1366×768、390×740、320×568 原生 mouse/touch 操作、完整页 PNG 与真实事件时间线；对比三视口两种输入的完整 initial/committed/after state-journal-storage。原基线权威减半事件没有进入 showScoreEvent，候选实际进入 windup/impact/rest。

`first-pass/` 保留早期 FAIL：低动态回看时调整样式引发 Vite 导航，不能冒称通过；`pre-compact/` 为后续13项通过但弹框过高的版本；最终按 final 的源码身份阅读。初夹具保留旧店货架被 shelf references/capacity 严格拒绝，修夹具而不削保存守卫；初选择更新缺三个类型字段被 tsc 拒绝，已补齐。原 B05 53 个相关测试/7文件；身份文案补正后的合并定向 84 个测试/10文件、typecheck 与 production-plan 检查通过；最终精确 CI 看 draft PR 的当前 HEAD，不借基线绿勾。

没有访问正式站，没有重跑18局，没有修改规则或数值。仅软件 Chromium/原生输入，未签物理手机、真人理解或总体平衡。父侧备用立绘/眼神的 Library 请求被 403 scope_violation 拒绝，未看图、未接图、未绕过；未借用六玩家脸、火影角色或造几何人像。当前是无人物素材的真实交互/事件样板，**人物/眼神/最终美术与镜头合成验收仍 OPEN**。待父提供可用合法素材后沿独立表现层接图，再作实际手机图审。

## 父追加：按保存身份显示计分顺序

当前骰爷押约／谢幕燃金／阿燥释放，在整手丑牌及各自版次、相关族加成后；骰爷未押约普通加成仍在前，二者互斥。旧 route-growth 身份保持角色在整手丑牌前，不用当前身份倒灌旧局。阿默 before-joker／after-joker 单张×3 与 assist-v1 助攻分开；当前助攻局没有单张×3。二响交棒仍在对应牌普通点数步骤，老幻戏法弃仍是补牌操作。只改完整规则文案，不改入口、数值或计分。

`hand-rule-order/` 共8项原生：当前与旧谢幕 PC/390/320，当前骰爷/阿燥390，均走选牌→怎么凑牌→完整牌型规则→展开→关闭，完整 state/journal/IndexedDB 与本地选牌不变。9项新专项以三角色新旧实际 PlayHand 保存事件验证角色早/晚顺序，合法 checkpoint 均通过。首次旧骰爷夹具“mature-win”在旧规则已能凑目标，被原规则拒绝；改为旧规则合法未成型夹具，不削规则。原生首轮是观察器嵌套 locator 无匹配，修定位而不改产品；两项原 FAIL 保留在 hand-rule-order-first-fail。

新立绘 `libfile_e987d3b4f244819182e0adb15d0f932e` 与眼神 `libfile_68f2c8b2c0b881918a90cc386ed232c6` 均正规 prepare_materialize 成功，但实际授权 GET 返回 HTTP403／curl22，没有文件、没有核 SHA 或看像素；未重试或换路径绕过。见 asset-blockers.json。新素材输入仍未可用，人物/眼神接入与最终美术继续 OPEN。

## P2 320短屏裁切返修（2026-10-15）

父独审确认原 final/320-repeat-key.png 与 320-changed-key.png 末行越过面板；原13项PASS只覆盖viewport与保存，**不代表面板containment通过**。原图/报告保持，最新关键帧请看 containment-repair/final。

正规回放 a2a469f0：host bottom312.390625、p bottom316.453125，确实超出4.0625px；新检测在此版本实际FAIL，并同时抓到标题越界。矮面板只收紧留白、将反应字改18px、明确行距和底部对齐，三行完整保留；未增高面板覆盖下方操作。新检测要求面板和三行真实存在，逐一核元素及Range文字行框位于父面板内边距区域。首次修复仍有字体行框超过内容顶界约0.94px，原FAIL也保留，未放宽检测。

最终产品70c0fe0d：两种320关键帧p bottom均309.390625，距host bottom3px，全部文字行框也在内容区内。PC/390/320全13项原生重新通过，低动态/回看/取消/恢复/终局保持；13项全部已记录的完整state/journal/IndexedDB与trace逐字段等同旧交付。43定向/type通过；新精确HEAD的CI另核，不借a2a469f0旧绿勾。GameScene/映射/规则详情/夹具/domain/application/content/audio/样式全局及其他独占窗口对象均同a2，只有OpponentPresentation局部布局和harness改变，见protected-objects.json。没有再次请求403素材，也未接入图像。
