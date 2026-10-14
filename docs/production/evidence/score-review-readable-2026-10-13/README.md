# 菜单上一手回看：易读数值与真实来源

实现基于最新main `2ef9180c066308e06d7d09850983ea469aa67fd8`，独立分支 `fix/score-review-readable-2026-10-13`。本包只改显示，未合main、未发布、未试玩整局。

产品源码冻结在 `0cd326b1a2c1f3a420ce9bc0c7efcc28e294f2a7`；最终局部截图/观察器冻结在 `78c3c4de`（完整SHA见[native/report.json](native/report.json)，dirty为空）。两者src和tests树完全相同，新增后续提交只归档本包证据；精确最终PR head及CI由实际远端回执单列，不能借早期绿CI代签。

## 行为与范围

新增独立纯显示 `src/game/ScoreReview.ts`。菜单“回看上一手”在筹备/过场的后备文本，以及牌桌菜单“上手详情”，共用一份显示：易读最终热度/倍率、已入账整数、中文来源及该来源实际操作次数。近似值带≈，不把显示近似相乘写成精确等式。巨大整数用科学计数法，普通数值分组，不转换为浮点计算。

首层只读已保存事件。角色/丑牌/清场来源先列，扑克普通点数与增强合组；同名丑牌分别标第N张并分别计次。读取、随机检查、实际触发和结算后记录分开；重触的“额外再计分N次”与该操作实际执行次数分开。原缩略图复用，不生成/下载新资产。未满足但没有记录的条件不会算成触发次数；后续金币/现持成长不解释旧手。

“成组资历”等改为“本局成组/顺子/同花清场加成”，列出该手事件的此前有效清场数、真实因子，解释它归本局。倍率不归给某张丑牌、也不从初选路线推算。没有写死1.35^N、准备期、未来×4上限或双族叠乘政策；该手有几个factor就列几个。数学线程已获授权的最高族/×4候选尚未接入本包；既有保存及本次旧规则projection仍如实显示实际值。

精确最终分数、完整分子/分母、floor公式和原始事件JSON按保存顺序放在默认关闭的“诊断：精确分数与原始事件”中。诊断展开也换行；原保存/计算数据未改。

GameScene只改inspectLastTrace接入及删除已无调用的回看专用formatBreakdown/导入；动态结算、HeroClimax、选角、评分域未动。[保护树](score-review-protected.json)核domain/content/application/platform/public/art/audio/HeroClimax/CharacterSelect/DELIVERY_PLAN/package-lock/.github与input main相同。

## 有限核验与画面判断

[定向日志](score-review-tests.log)：64项，formatter/既有数字精度/真实route scorer/共享DetailDialog；[typecheck](score-review-typecheck.log)通过。首轮错误期待和视觉拒收均保留在[FAILURES](FAILURES.md)，不回写全绿。

`SCORE_REVIEW_OUTPUT=/tmp/score-review-readable-complete node harness/score-review.mjs`：在全新隔离Chromium软件Canvas上下文，以1366×768、390×844、320×740检查以下范围。没有clear存档、没有发新PlayHand/购物命令、没有自然局或整局试玩。

| 样例 | 数据/动作 | 结果和边界 |
|---|---|---|
| game-win | PR130既有受控mature-win保存，两对412分；原菜单上手详情 | 默认中文/计次、诊断完整、开关只读；每尺寸刷新继续完整state/journal/storage相等 |
| game-loss | PR130既有受控mature-old-core保存，两对175分 | 显示赌约输约×0.85，真实读取/扑克计分次数；无虚构正收益 |
| menu-final | PR134既有受控谢幕燃金28404分保存；过场菜单回看上一手 | 不再把英文reasonKey/operation当默认解释；查看/关闭与每尺寸刷新继续完整保存相等 |
| giant-projection | 当前scoreR2Hand直接生成781,589,829分、长精确比例、重触、多来源、双族21次记录 | **仅只读绘制投影，未导入或保存，不证明自然获得率/新×4规则/平衡。** 检查≈、两张红线各真实6次、重触1次、实际清场来源与完整原分数 |

[report.json](native/report.json)含12行完整before state/journal/storage、输入出处行号、SHA256、逐行默认文本、DOM宽度和相等断言；9行是既有合法保存视图，3行是明确标注的直接scorer显示投影。6行冷恢复全部完整相等。所有行默认诊断关闭，默认无英文事件键；展开正文逐字等于formatter的完整诊断。默认/展开dialog和scroll均无横向溢出，正文不缩到14px以下，关闭/原主操作始终在可见底部。

实际查看了原尺寸PC/390/320默认、来源和诊断PNG：首屏已从普通点数大卡片改为实际来源；亿分摘要、≈倍率与同名丑牌各自次数清楚；本局清场加成显示真实因子，不写成累计M或某张丑牌收益；诊断长分子/分母纵向折行，固定关闭可达。只签本包局部可读性，不签整体美学/玩家理解/物理手机/音频或完整游戏体验。

可直接对照：

- [390 默认亿分回看](native/390-giant-projection-default.png)、[390 实际清场来源](native/390-giant-projection-route-sources.png)
- [PC 默认亿分回看](native/1366-giant-projection-default.png)、[PC 清场来源](native/1366-giant-projection-route-sources.png)
- [320 精确诊断换行](native/320-giant-projection-diagnostic.png)、[390 输约详情](native/390-game-loss-default.png)

## 给父任务的接入/范围提示

共同文件仅GameScene.ts回看方法/相关导入和RunMenu.ts非game回看后备分支；直接摘取新formatter并最小接入即可，不需要重构GameScene。唯一主执行计划未改，开工卡/证据独立落在本目录供父整合。

具体相邻范围：`src/game/IntermissionScene.ts:inspectLastHand`自己的“回看最后一手”还用旧精确展示/完整计分明细；它不是本次菜单后备入口，且属结算线程共同文件，本包未顺手修改。建议父/结算owner按同一formatter做最小接入，避免该独立入口与菜单显示不一致。没有其它实现阻塞或权限拒绝；未做main合并/强推。


## 同批补完（2026-10-13，按父新授权）

上方Intermission未接入提示仅属于bf394交付时点，现已在不动其它结算代码的前提下最小接入同一formatter。原按钮、结果canvas像素及完整保存/冷恢复已局部对照；新SHA/软件门/失败记录和手机PC图另见[结果页补完证据](intermission/README.md)。旧测试与截图不回写为新SHA，最终新CI以PR160回执另核。
