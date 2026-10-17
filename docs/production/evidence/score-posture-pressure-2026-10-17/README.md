# 计分姿态、可见高光与 Boss 压制辅助模块

基线 `f81724b57736c7d4f299cf1d95705a7ba3ef9497`；开发分支 `dev/score-posture-pressure-20261017`。独立模块提交 `4c1a542e` 后，收到父线程交接，正常 merge `f6edb41b1cd0591c6835cbc8f01965c74844e2e0`（merge `00e7d121`），再独占完成 GameScene 最小接线；秦琼取消恢复、等宽底栏与理牌组、AI 同 key 复用和过期校验保留其祖先提交。本次没有手改 ShopScene、领域规则、存档、音频或素材。现有 J/Q/K 灰罩、封禁红章和失效标记已由父线程在旧版远端确认，本包针对范围映射、状态清理与可读性修改，不把该能力记为从零新增。

## 已实现接口

- `ScorePosture(animate).play(container, {context, arrival, duration, ordinal, reducedMotion, faceGlow?, edgeGlow?})`：传入现有 `animate.bind(this)`；以单一 owner 写 y/angle/scale，18px、交替 ±2.5°、一次回弹；取消、快进、重触发恢复捕获的原姿态。已中止旧代的迟到调用不影响新 owner。
- `bossCardPressure(context, cardId)` / `bossJokerPressure(context, instanceId)`：直接消费 `r2DisabledCards` / `r2OrdinarySuppression` / `r2ScoringDisabledJokerIds`。返回范围标签和详情，不把“计分失效”“普通点数归零”“计分与版次封禁”混为不能出牌。B06 跟槽，B15 跟实例，B16 读目录 rarity。
- `mountBossPressure(scene, container, width, height, pressure)`：灰罩、交叉锁链、朱红范围印；不捕获点击、不改变规则。重复挂载替换旧层，返回 cleanup。详情沿现有查看入口使用 `pressure.detail`。
- `scoreContributions(event)`：从已保存 before/after 提取热度加法、倍率加法或乘法；支持下降因子与 route-factor，不把 afterHand 成长演成当手收益。
- `HeroClimaxValue.contribution` 与 `mountClimaxContribution`：在不透明高光底之上的 skill / landing 层绘制来源连接、局部数值反馈、累计 before→after 及倍率最高 1.54 脉冲。连接线裁去数值、标签和来源图区域；没有足够空隙时隐藏移动文字包，保留细线及安全处的移动点。固定眼图不平移缩放。阶段与贡献跟同一 Tween 时钟，减少动态直接稳定落位，dispose/reduce 清理所属对象与 tween。
- `NumberImpact.peak` 的乘法档改为 1.50 / 1.52 / 1.54，消除旧 1.36–1.40 对默认峰值的覆盖。数字仍优先适配可用区域。

## GameScene 已完成接线

按方法名定位：

1. `illuminateCard` 使用场景持有的 `ScorePosture`，取代原 y/scale/angle 动画和 finally 写入，传现有 arrival、`timing.impact`、已出牌位置 ordinal、EffectContext 与牌光对象。`showScoreEvent` 对同一有效牌只调用这个入口，去掉并行 `focusSource(card.container,...)` 的姿态写入；joker / hero focus 仍走原入口。原顺序队列等待本次姿态完成再进入下一事件。
2. `cardPiece` 的手写 B03/B04 判定及覆盖牌角的 emoji 印替换为 `bossCardPressure` + `mountBossPressure`。`refreshSelection` 在选牌变化后重算 B02（第4/5张）范围，清理已解除的旧层；回看使用记录的 Boss / 手牌快照同步背景和失效标签。
3. `renderJokerRack` 挂 `bossJokerPressure` 的 overlay；`seal-joker` 按实际事件目标实例挂层。回看使用 trace.cards / sourceJokers / bossContext，不读取下一场或已清除的封禁。挑战禁用保留原入口。
4. 牌和大丑牌原详情入口使用 `pressure.detail`。J/Q/K 仍可选、出、成型；B02 仅停普通点数。B06/B15/B16 的静态资源、经济及 afterHand 成长仍按条件执行。
5. 原 `transferToAccumulator` / 120ms、.0045 短震和音阶主路径保持。高光自己的 contribution 已接入，不用下层被不透明底遮住的线条充当可见证据。

## 实际检查与边界

- 合入负责人并接线后，定向 15 文件 135 项通过：game-score-pressure、score-posture、boss-card-visual、score-contribution、score-geometry、hero-climax、hero-climax-focus、score-source-process、score-energy、c03-boss-score、touye-discard-handoff、hand-action-controls、ai-hand-candidates、ai-hand-action-cancellation、saved-boss-impact。
- 模块阶段 88 项及姿态 5 项复测通过；最终接线的 135 项通过后修正新增测试 Map 的类型声明，相关 2 项复测、类型和构建均通过（311 modules）。相对负责人交接版本，ShopScene、AiHandCandidates、TouyeDiscardChoice、layout 与交接测试没有差异。没有全量、长局或 CI 检查。
- Boss 测试已删除测试内部自写判定，调用产品辅助模块和真实 scorer 验证：B04 四条仍成型但失效核心不计分、A 正常；B02 受限牌增强仍计分；B06 被禁 b10 真实 afterHand 成长仍存在；调序和 B15 实例封禁各按实际规则。
- 本地 Edge 只确认了独立 Phaser 场景能加载、三牌静止状态恢复。连续截图采集在用户改为远端验收后终止，未取得可交付帧，**不能签 18px 动态、线条可见、无重叠或实机性能通过**。代理/localhost 连接与 Vitest 临时目录问题均为执行环境问题，不改变产品断言。
- P08 仍 in_progress。本包没有整体完成率、自然获取率、真人理解、听感或真机结论。

## dot 远端最短待验入口

在 dot 远端检出此 dev 分支（或父线程一次整合后的分支），启动 Vite；隔离模块入口 `/harness/score-pressure.html` 默认 900×660；实际牌桌入口仍为 `/`。隔离入口不进生产主入口、不写存档，不替代实际牌桌验收。

1. “逐张计分”：三张依次完成 420ms 姿态；连续帧应看到 18px 高点、左右交替约2.5°、回弹后回到330px基线；播放中点“取消”应立即恢复，重新触发不漂移。
2. “高光乘倍率”：现有受控 fixture 经过真实 PlayHand 命令生成 trace；固定眼图和不透明底保持，来源连接可见，本次数值反馈后累计从 cue.before 变 cue.after，脉冲不越文字区。不得用 `shot` metadata 变化代替实际像素证据。
3. “高光加热度”：使用同一真实 trace 中的热度事件，检查加法和累计热度落位；这是隔离事件展示，不是自然首手收益或触发概率证据。
4. 仅对同一短乘法分别点倍速到2×、4×及“减少动态”；前者阶段顺序不丢，后者稳定值、无线条飞行和缩放；无须重复完整截图矩阵。
5. “Boss受压”：J/Q 灰罩、链条与计分失效印，A清楚；第2槽大丑牌显示计分封禁。点击受压牌读准确范围。B02/B03/B15/B16 以定向测试为本包事实，普通牌桌接线后另核实际入口。
6. 接线已完成，在实际入口的短计分及受压存档核一次普通牌桌与高光衔接、快进/回看/resize/后台恢复；保存结果不变、不复活取消动作、无重叠卡顿。此项当前 pending，未合 main、未部署。
