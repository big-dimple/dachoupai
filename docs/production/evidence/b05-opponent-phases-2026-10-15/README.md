# B05 人格与镜头事件层增量

最终产品及浏览器源码：`af08a36ab45fc3a60edd0dd8c902ddfd85496db5`。分支 `dev/b05-opponent-sample`。事件层实现为 `6d49fb73ffa13e3b3ccd9a26de9bc5747193d01e`，恢复后输入修复依次为 `653d23c2ec87133907c0cfd4ba4679260137a344`、`af08a36ab45fc3a60edd0dd8c902ddfd85496db5`。本目录最后的提交只保存验证证据。

前一轮 `5f469422` 复核了候选已有规则和交互；追加检查完整“登场→关键招式→真实结果→反应”时，确认换型反应原先在真实结果呈现前播放，且缺少明确的表现阶段、态度和结果事件锚。前轮结论不能外推为完整人格镜头完成。本轮没有重跑旧 95 项 B05 检查或原 13 场矩阵。

## 事件与人格接线

| 阶段 | 权威依据与实际接线 | 表现态度 |
| --- | --- | --- |
| 登场 | `OpponentPresentation.ts:53` 使用实际 stageIndex/commandSeq；原 GameScene 入场确认后才执行 EnterStage，不伪造计分事件 | composed，从容迎战 |
| 关键招式 | `OpponentFacts.ts:43` 生成纯 view cue；`GameScene.ts:2028` 在匹配的真实 halve-base-heat 事件前排队 | telegraph / focused，认真接招 |
| 真实结果后换型反应 | `OpponentFacts.ts:19` 必须取得真实 finalScore / final-score 的 eventId；`GameScene.ts:2030` 的整个 award 完成后才串行播放 reaction | respectful，认可玩家换招 |
| 胜败反应 | 实际终态及热度/目标，绑定同一 final-score；`GameScene.ts:2039` 排在全部计分与资源事件后 | 玩家赢时 conceding，玩家败时 confident |

稳定身份为 B05“回音墙”、同行高手。`OpponentPresentation.ts:70` 输出 opponent、phase、attitude、placement、eventId 和 artMode；缺真实结果锚时不编造换型或终态反应。同场首次同型限制/首次换型去重、850/900ms 原时槽、回看、abort/快进与低动态控制保留，普通后续同类手不新增特写。入口眉题为“同行高手 · 文字演出”，无新人物/眼神图或假机制动画。

## 恢复后实际修复的输入缺陷

旧失败不是单纯的观察脚本问题。保留原 390→320 回看/快进→390 再选牌/出牌步骤后，读取到画布已经 390×740、牌位 y=536.4，但透明手牌输入层仍是旧 320 比例：x=9.84375、y=411.71875、width=300.296875、height=85.65625。真实触控因此落在输入层外，选牌为空。完整诊断见 [resume-input-diagnosis/summary.json](resume-input-diagnosis/summary.json)。

- `HandSelectionInput.ts:52` 观察 canvas 实际 CSS 尺寸，`syncBounds` 只重算透明输入层位置，不重置选牌/gesture；销毁时断开 observer。修后选牌成功。
- 随后的“出牌”触控又暴露 Phaser displayScale 仍按旧 CSS 尺寸换算；`updateBounds()` 本身不重算该比例。`Viewport.ts:19` 在最终 CSS 写入后更新 bounds，再按 Phaser 本地 refresh 的同一公式更新 displayScale，两个分支均覆盖，不另发 resize。

原失败保留于 `initial-observer-failure/`（继承原目录名，不再称为纯观察器错误）、`pre-resume-resize-failure/`、`resume-input-diagnosis/`。`after-surface-fix-failure/` 保留仅修输入层后，真实选牌通过但按钮未命中的中间失败。没有调换验证顺序或削弱选牌/保存断言绕过问题。

## 验证及实际图审

[checks.json](checks.json) 记录：事件协议新增 5 项测试及当时 typecheck 已在暂停前通过，没有重复；恢复后手牌输入文件 21 项、viewport 文件 14 项及最终 typecheck 通过。两个输入回归均先在未修代码复现失败，再通过修复。Sol 6.1 只读独审对两处输入修改无阻断发现。

最终 [final/summary.json](final/summary.json) 与 [完整 report](final/report.json.gz) 为源码 `af08a36a` 的三个增量浏览器案例，全部 PASS，src/夹具/harness SHA256 前后不变，产品 dirty 为空：

- PC1366、390：真实 final-score award 先于反应；反应出现时本手 **31**、累计 **113** 均已落定，旧中央 landing 已撤销，B05 / respectful / after-result / text-only 元数据正确。
- 390→320 回看并快进→390：真实触控命中透明输入层，完整选中两牌、实际 PlayHand 成功，后续手 **78** 分，同场已经展示过的 changed 类型不再加特写。
- 390 低动态无动画；回看/快进清理 cue，完整 state/journal/IndexedDB 保持已提交结果；320 使用原严格 padding 与 Range 行框检查，没有放宽面板边界。

root 实际查看最终 [PC](final/1366-changed.png)、[390](final/390-changed.png)、[320](final/320-reaction.png) 三张截图：反应发生在实分落地后，文字没有越出窄屏面板。截图等 140ms 入场动画结束后拍摄，不用半透明过渡帧代签稳定字位。

## 父集成窗口与未验边界

`GameScene.ts` 仅改 import 及 `presentTrace` 中 2025–2039 的 cue 排队接线。`ShopScene.ts` 零改动。另有独立 OpponentFacts、OpponentPresentation，以及本次真实输入失败所需的 HandSelectionInput 与 Viewport 修改。领域、内容、保存格式、规则、目标、RNG、图音素材相对候选均零改动。

人物立绘与眼神特写仍无可读字节，本轮没有生成、下载重试或购买素材。当前明确使用文字演出回退；阶段/态度协议和软件图审不等于人物表演或完整电影镜头。最终人物/眼神美术与镜头合成、真人理解、物理手机、自然试玩、听感和整体游戏验收仍 OPEN。仅推送开发分支，不合 main、不部署、不创建或重试 Forbidden PR。

## 高 DPR 后续补充

上述矩阵使用 DPR1，不外推为 DPR2/3。高 DPR DOM 二次缩放问题与低动态几何/缩窗证据另见 [2026-10-15 density 补充](../b05-opponent-density-2026-10-15/README.md)，保留各自源码和采样边界。
