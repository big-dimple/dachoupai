# 有限倍率显示修复（Sol独立候选）

归唯一 DELIVERY_PLAN 的低阅读与真实成长呈现；不增加新研究/数值方案。父只串行集成，本包不合main或部署，也不签整体美术/真人理解/实机/听感/18组合。

- 基线：`41d0990bf94698110446d0e4caeebd54d327a972`，已合PR110/112/114。
- 冻结产品：`ec57f2fe9da05e5f79d890cfb706d7c01d234ea6`；src tree `6b61fdeac71ff49b684cb16c1d25aa30d5773950`。后续证据/计划提交不改此树。
- 只读参考PR113：`b6617e9b2c36df2b8f481242528b3e5d7000766e`。ResultScoreNumber采用截断，极小正值仍可能≈0，本包未复用其实现、未cherry-pick、未引入其未验美术；PR113保持冻结未合，不计Sol结果为Astra验收。
- 交付前再fetch核main/PR113；main仍41d0990，A/B/数量文案未回退。父报告main CI38127406182成功、09:27 UTC生产浏览器版本C03 41d0990bf946/build09:11:22.210Z/dirty package-lock.json；这是父版本核验，非本云新版操作验收。

## 显示合同与真实入口

| 入口 | 首层合同 | 精确详情/来源 |
|---|---|---|
| GameScene实时H/M、落点、回看演出；ScoreLanding | 通常最多2位小数；近似乘积用“入账”连接已保存最终分，不使用错误等号 | 原完整计分明细保留完整H/M，并明确向下取整入账；award仍使用trace.finalScore |
| IntermissionScene结果摘要 | 同一可读格式；不动PR110关卡身份、下一场提示及画面结构 | 原“回看上手”入口给精确热度、倍率、取整入账分行；完整来源事件保持 |
| JokerMemory持牌标签/底部来源提示；r2Help首层当前值 | 保存成长直接显示≈2.62等有限小数，不再只退回“状态›” | memory.saved、r2JokerStateText、规则/回看详细事件使用精确函数 |
| BuildGrowthProgress/GrowthPayoff、HeroClimax、SourceImpact/JokerKeyHighlight、ScoreEventCaption | 同一首层显示；原PC来源caption可保持1位小数。成长是否存在及多读取一致性仍基于原精确值 | 原保存/trace保留。ResultStage不再把舍入后文字相同误当成“没有变化” |
| ScoreTextLayout数字栏空间回退 | 原空间/科学计数法触发条件保持；丢有效位时补≈，保负号，避免重复≈ | fullText原值/原trace保持 |

`exactFractionText`（原fractionText兼容别名）与`readableFractionText`明确分开，不全局替换详情。精确函数保留原至多4位精确小数的合同；不能在4位内精确表示就给完整、带千分位的分子/分母；超过15位也不把详情分子/分母缩成科学计数法。

首层采用BigInt四舍五入（半值远离零）；整数与最多2位可精确表示的小数不虚标≈。绝对值≥1e15或<0.01用3位有效数字科学计数法；科学计数法本身若精确也不标≈，舍入进位正常调整指数。极小非零值不写成≈0。零、负号、负分母正常化、循环小数、千/4096位整数与长分母均覆盖；零分母明确拒绝。formatter不把任意长BigInt转成Number；滚数动画仅在分子分母都≤MAX_SAFE_INTEGER时转换，大比例直接落权威值。中间动画舍掉小数才标≈，落点回到保存值。

heatText的得分科学计数法门槛/实现保持；不加零、不改存分、计分、成长数值、乘区、保存格式、概率、随机、价格或资产。14个src/game文件只做以上必要显示改动，src/domain、content、application、platform、public、art与基线逐树无差异。

## 两个报告值的同尺度像素

**全部为受控、已公开的手牌/等级/现金/已有成长，按真实导入→PlayHand→保存→过关→详情→刷新运行。不是自然447110那局的重放，也不是第5局二响顺子的重放或自然获取/成长率证据。** 两端均CSS像素截图、DPR1、软件Canvas、低动态；PC1366×768、手机390×740，不拼成设备性能验收。

| 报告样例 | 原显示 | 候选显示 | PC | 手机 |
|---|---|---|---|---|
| 二响成组447110 / M36639/64 | 36,639/64 | ≈572.48，已保存得分仍447,110 | [前](before/group-1366-result.png) / [后](after/group-1366-result.png) | [前](before/group-390-result.png) / [后](after/group-390-result.png) |
| 独家成长839523/320000 = 2.623509375 | 牌面回退“状态›”，底部系数×839523/320000 | 牌面×≈2.62；底部系数×≈2.62 | [前](before/straight-1366-table.png) / [后](after/straight-1366-table.png) | [前](before/straight-390-table.png) / [后](after/straight-390-table.png) |

成组夹具是Lv30两对、b10热度64、20金/e03及校准a06系数；领域实际保存H781、M36639/64、floor=447110。顺子夹具是公开3–7与指定已有a06系数839523/320000，实际保存H150、M839523/80000、1574分；该结果不当作自然第5局分数。原规则[PC精确成组](after/group-1366-details.png)/[手机精确成组](after/group-390-details.png)、[PC精确顺子/成长](after/straight-1366-details.png)/[手机精确顺子/成长](after/straight-390-details.png)可查看完整分数。

## 有限验证与失败保留

- 118定向测试/14文件通过、typecheck通过；最后trim精度标志与harness帧采样的小改再跑相关24项/3文件及typecheck通过。覆盖格式边界、实际消费者、已保存floor、来源不篡改、空间回退、成长、落点与细节。
- [before/report](before/report.json)四案与[after/report](after/report.json)四案实际PlayHand通过；候选的initial/final state、journal、storage逐字段与基线相同。原[完整before](before/states.json.gz)/[完整after](after/states.json.gz)供独审，非只比finalScore。打开详情为只读，reload保存完全相等。两个尺寸公式/存分实际bounds内且互不遮挡；主要前后与详情PNG已实际view。
- [normal/report](normal/report.json)另一个PC普通速度成组，完整保存同原命令、读数帧无NaN/Infinity、[最终图](normal/group-1366-result.png)。不把低动态证据代签正常动画，也不声称手机正常速度/快进/18局全验。
- [原FAIL记录](original-failures.json)：旧9.375首层期待、新测试选了可整除的分子、测试context类型遗漏、baseline观察器误认实际label入口均保留；最终修正后通过。首精确公式增加floor(...)后手机过长，[原像素FAIL](detail-long-formula-FAIL.png)保留，最后分三行精确H/M/入账；未缩字或换布局遮盖。
- 最终标准CI仅在冻结交付HEAD的draft PR创建时触发一次，不逐改全回归；运行结论在交付消息按精确HEAD报告，不借基线CI签本候选。

复查命令：`npm run typecheck`；`npx vitest run tests/score-text.test.ts tests/readable-multiplier-source.test.ts tests/score-event-caption.test.ts tests/score-text-layout.test.ts`；`MULTIPLIER_OUTPUT=/tmp/multiplier-review node harness/readable-multiplier.mjs`。普通速度仅PC一案：`MULTIPLIER_NORMAL=1 MULTIPLIER_OUTPUT=/tmp/multiplier-normal node harness/readable-multiplier.mjs`。

剩余边界：当前低成本样本未重放自然局、未验证18路线/真人设备；4096位详情保证文字不截精度，未拍4096位整屏或单独审其滚动。超过2位的极细成长可能前后都显示同一个近似值，实际变化仍按精确值选择/报账，精确详情可辨。大分继续用既有heatText；整套得分科学计数法/资产/控件重做不在本包。PC原来源caption的一位小数合同保持。
