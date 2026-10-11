# C2-B 有界本地实施与交付记录

2026-10-11 UTC。**未提交、未推送、未建PR、未合main、未部署。** 工作树 `/workspace/dachoupai-c2`，分支 `c2-route-growth-local`，固定基底 `6d2d954d1b41cddf632dfdce86fb75374e8f7e54`。最近一次直接只读核实 main 为 `56f5ad5e175ad16b1f89adc544c3332eed6ffb71`；parent最新通知为 `e48fd07a6e7b4575067dc356ad28cb0a94fe15e9`（含PR118/119/120），本轮未fetch或集成，不覆盖GameScene入口返修。此记录是冻结合同的本地软件候选，执行计划仍由 parent 维护。

修复后新候选身份：`quality-r2-route-growth-v1` / `json-fnv-v1:3e788b6aba71306e`。原未发布候选`cb22e412a59fde6e`及其证据保留为`*-before-p2`；增加有界主手来源属于保存合同变化，旧候选hash不迁移/不补来源。所有已发布旧身份保持。完整未提交文件和字节摘要见 `manifest.json`；实际scorer与保存证据见 `scorer-and-save.json`，可用同目录 `export-evidence.mjs` 有界再生成。

## 优先建议（供 parent 接续）

1. **P0 已做成本地候选：先闭合成长与保存。** C2-B属于run，普通成组、顺子、同花按真实清场成长，卖牌和换槽不丢路线历史。采用冻结三率及六卡修正；先审精确因子、第四次清场旧快照、Boss/挑战只禁Joker和原子提交，再接体验验收。代码入口：`r2RouteGrowth.ts`、`scoreR2.ts`、`r2Run.ts`、`checkpoint.ts`。
2. **P1 自然经营可达性：由 dot 的18实玩补证。** 起手保供、九种自选共享额度、价格和随机池仍用现有合同。记录自然现货、买得起的时间、刷新和利息代价、成熟核心可抽到的次数；不能用固定六张增强核心或N14的离线容量签自然供给。若剩余断点仍集中于第一场顺子成型，才安排单独有界修补；本包没有临时四张顺子。
3. **P2 换槽、改牌和资源同账。** e11取消卖其他牌重置，但销售仍取消该场自身+0.1；新买实例仍从初始成长开始。裸卖起手牌不消C2历史，也不保证新商品更强。玻璃风险、版次成功率、永久少手/少牌及共享商店额度全部保留，先核真实净现金与下一手续航。
4. **P3 关卡压力最后校准。** 阿默G 28903/45000、S 329/600、F 50132/60000是特定失败证据；其余构筑尚在实玩，不能把所有路线判死或全表加数。先看成长与经营改变后的真实瓶颈，再按明确章节安排局部比较。本包未改任何目标、全池价格、英雄倍率或经济曲线。

原PRODUCT/CHARACTER/BALANCE与独审数学证据保留。原准备资料在 `/workspace/dachoupai/docs/production/evidence/growth-candidates-2026-10-11/` 的文档分支；其中“未批准/未实施”原标记没有修改。66839、111596688等旧受控证据属于原身份与输入，尤其111596688未认证自然取得，不能借本包算例转成自然上亿承诺。冻结C2只承接明确合同，没有把全部独审建议实现或批准。

## 冻结规则及落地

- G：对子、两对、三条、葫芦、四条、五条、同花葫芦、同花五条；S：顺子、同花顺；F：同花、同花顺、同花葫芦、同花五条。以实际主手的权威判型为准，失效牌仍按原判型规则参与，助攻不改变family。同花色四条仅G，高牌没有family。
- 每个合法主手记录本场主手类型与资格。真实清场结算此前全部资格，各family至多+1；不只看致胜手。G→F后清场可以同时+G/+F，G→高牌致胜仍+G。
- 每个family读取 `min(10^12, f^max(N-3,0))`；G=27/20，S=7/5，F=13/10。BigInt Rational，只在最终H×M时floor一次。每条先封顶再相乘，双family最大10^24，不再压乘积。因子表最多106次精确乘法到顶，极大N不直接求巨大幂。
- 在所有整手Joker本体与各自版次完成后、原阿默post/助攻post之前，匹配family各读一次。逐牌重触发不重读规则；B13倒序只改变Joker段。B06、B15、B16和挑战指定禁牌只禁Joker，B08只按旧合同停角色。
- 不要求起手牌持有，不受openingRoute限制；三个起手实例均没有新增乘法系数。换路线先赚该路线真实清场，不能把F资历直接当普通S资历；同花顺合法读取S与F。
- 新run必有 `routeGrowth={clears,G,S,F,settlements}`；按递增stageIndex记录真实清场和family，重算账必须吻合计数，跳场不在账内，过去不可跳Boss必须有清场记录。各N≤真实clear总数，三个N之和允许超过总数。
- 新stage必有 `{handTypes,eligible,sources}`，最多7笔来源，每笔保存原Command、实际主手选牌快照及当时fourStraight/fourFlush判型规则。每笔重新evaluate并绑定已有receipt的commandId/seq/fingerprint；其类型/资格、顺序、最后主手及其previousHandType、普通顺/同花历史标记均须吻合，journal截短或为空时也不依赖单独的类型标签。新trace必有 `{before,factors}`；actual、preview、AI缓存及回看共同使用计分前N，新身份缺字段拒绝，不补0。
- 清场后state已+N，lastTrace保持该手before。恢复时按本次结算扣回计分前快照核验，验证全链累加器及唯一final floor；因子位置、重复读取、伪造资格、篡改N和新增字段均拒绝。
- 清场数、资格、trace、receipt都在原事务候选内。`SavedRun`写成功才发布；quota失败保留原state/storage，retry写同一个候选，重复命令不再结算。512事件及4096位诊断沿原边界拒绝整笔消费。
- 新身份显式继承当前六英雄、首店路线保供、基础/染色九选一共享quota和现行工具价格。正常有路线新局转到新身份；无路线原API、旧创建/恢复/retry仍走各自冻结身份，不迁移、不回填。

| 六张牌 | 本包行为 |
|---|---|
| 满堂彩 | G整手+90H，包含三种升级成组型 |
| 搭台阶c04 | S固定+50H；S后+10H、cap100，下手读；任何主手读已有H |
| 越染越深c06 | F后+0.5M、cap6，下手读；任何主手读已有M |
| 借东风 | S∪F整手+1.5M，含升级型；没有逐牌×1.25 |
| 长期捧场e11 | 卖其他Joker保留系数；含准备店销售仍取消当场成长；卖自己移除，重买从1 |
| 救火f10 | 未出牌时第一次成功弃牌即arm，不要求此前缺成型；下一次合法主手Q×3，否则过期；第二次弃牌不重arm，封禁仍consume，原成本保留 |

## 少量实际scorer结果（精确同输入比较）

以下是**四个独立主手的容量和，不是胜出后还能继续打四手的游戏日志**。统一Lv1、无英雄/助攻/留手加成/版次/重触发、N14，即指数11；倍率纸数量2/2/1/1，共6张不同核心。G成熟b10=100H，S成熟c04=100H，F成熟c06=6M。旧身份F用原cap4。三条路线手牌及每个input/trace完整存在JSON。

| 路线 | 原冻结身份四手合计 | 新C2各手 | 新C2合计 | 裸卖起手牌各手及合计 |
|---|---:|---|---:|---|
| 普通对子QQ/JJ/TT/99 | 4892 | 39901 / 39901 / 26600 / 26383 | 132785 | 25243 / 25243 / 16829 / 16612 = 83927（仍有b10） |
| 普通顺子3–7/4–8/5–9/6–10，非同花 | 5790 | 97189 / 98809 / 75321 / 76536 | 347855 | 48594 / 50214 / 38875 / 40090 = 177773 |
| 普通同花2/5/8/10/K等，四组点数35/36/30/28 | 7592 | 43907 / 44158 / 36560 / 36129 | 160754 | 25090 / 25233 / 18280 / 18064 = 86667 |

可复算示例：QQ两倍率纸，`floor((35+20+100+90)×(2+4)×(27/20)^11)=39901`。缺b10且纸2/1/0/0仍只有23615/15743/7871/7763，合计54992，不保证过60000；全缺仍更低。

- F14而此前未持c06，晚购Lv5普通同花的自身成长从0开始：52868/45090/36380/38710。全局资历来自真实先前经营；不是给新实例伪造成熟。F14、S0，新c04普通顺子仍1600；四个真实S clear且c04自有H40后，第五手2688。
- Lv5同花点35、两倍率纸：旧c06存6为84589；卖旧后新多彩c06自身0为79303；同一旧实例成功多彩为126884。资历保留不消除丢自身成长和商品获取代价。
- 同一核心有效替换：G四条9，满堂彩133167→b09 212590；S第三原牌玻璃+多彩，c04成熟218676→d11 254211；F末K玻璃+多彩，c06成熟150675→c07 276720。重触发都按真实逐牌顺序，玻璃只每原实例检查一次。
- N14双路线：Lv1同花顺两倍率纸4481487；同花葫芦三倍率纸7696791。只有F14时分别110665、283555，不借另一family资历。
- 更大但仍有限受控手：G17、四条9、三倍率纸及末张玻璃多彩、b06+a06+b09+满堂彩，实际9288801；F17、Lv5、末K双pass玻璃多彩、借东风+c06存6+e11×1.7+c07，H305、实际1186639。末K是两次pass，不能误加第三次；这些没有自然取得认证。
- 各family封顶首次N：G96、S86、F109；MAX_SAFE_INTEGER输入也按有限因子表返回，双family可以达到10^24。此为数值边界，不是正常八章里可获得这些N。

## 完整清场、保存证据与检查

`scorer-and-save.json`含24笔明确输入的actual scorer traces、五笔受控真实清场完整checkpoint（含state/journal/receipt/checksum），以及首笔quota失败前后state与storage、pending候选、retry后相同候选、storage及duplicate结果。

五次清场的G：state.N 1/2/3/4/5，trace.before.N 0/1/2/3/4，因子1/1/1/1/27÷20，实际得分1458/1458/1458/1458/1968。第四次clear恢复保留1458；新场才×1.35。夹具植入成熟b10、满堂彩及两倍率纸并固定可见对子，**只验证计分/真实结算/保存合同，不验证这些材料从自然经营中可得**。

原P2修复前观察：13个定向文件、251项PASS（12:43:34 UTC），仅属于原候选。P2修复后最终受影响检查：6个文件、141项PASS（13:38:58 UTC起，7.75s）；`npm run typecheck` PASS；`git diff --check` PASS；有界证据导出PASS。未重跑全251或旧矩阵。范围：新C2 scorer/run、group upgrade及保存、combo growth、起手、染色及基础quota、AI公开预览、演出符号、Rational、launch、SavedRun恢复。旧v10/v11/843f/e7d fixtures完整重放state/RNG/receipts/journal/checksum不变；所有旧identity拒收route字段。

用例覆盖第三/第四clear、不同致胜型、双family、失败/跳场/放弃、买卖/重买/刷新、恢复/retry/重复命令、B03/B04/B06/B08/B13/B15/B16、挑战Joker封禁、助攻不记G、f10已成型首弃/非法/无钱/再次弃/首手过期/封禁消费、e11准备店销售不增长但不重置，以及禁牌后 additive growth仍落盘。数长边界使用人为4096位stage热度；清场事件预算边界使用真实scorer结果补齐事件的注入，另以schema合法高事件内容实际验证512上限。两种注入都只是原子诊断检查，不冒称自然可达手牌。

原FAIL保留说明：初始测试夹具误写不存在的`multiple-paper`后改为实际`multiplier-paper`；Boss夹具一开始违反章节池/商店visitIndex，改为合法章节快照；初始高牌clear容量不足400，加第三笔真实高牌；Q对子被B04失效，改用合法9对子检查第四clear。相关旧起手测试曾仍期待旧定义和0.25，现按新身份期待覆盖定义和0.5，旧identity replay没有改。证据导出首次手写RNG标签被拒，最终直接用SeededRng；导出关闭Vite自动依赖发现，避免无关页面扫描。P2新增旧九选用例首轮140项中139PASS/1FAIL，typecheck也FAIL：测试误写不存在的rank-up操作，改为实际shift-rank后通过。这些失败不隐藏，也不拿夹具修正宣称产品曾错误计分。

## P2修复及P3覆盖（本轮）

独立Sol6.1 xhigh原审确认P2：QQ对子→3单张后的存档，只把较早`pair→flush`和`G→F`成套修改并重算checksum，保留journal/receipts/最后trace，原候选接受；后续两个A单张清场热度411，却写G0/F1。不能把原251自检当该严格恢复合同已签。

修复仅新增本场有界主手来源，来源与类型/资格同实际Play事务进入候选，再与trace/清场N/receipt一起原子保存；不重做账号级防作弊或密码学。`r2RouteGrowth.ts`负责逐手重判与receipt绑定；`r2Run.ts`负责记录和历史/最后trace一致性；`checkpoint.ts`严格限定来源字段、动作、牌和规则。被判型的牌含失效牌，助攻不进入来源主牌；已有四张成型库存规则仍按当时规则记录。成长公式、六张牌、因子顺序/末次floor、原价格/RNG、旧身份未改。

新增反例包括原独审411夹具、成套类型+family变更、缺来源/额外字段、来源命令改ID/选牌或逆序、previousHandType变更；完整、截短及空journal均拒绝。第三手后修改最早资格仍拒绝，覆盖不只靠lastTrace.previousHandType的路径。正例包含pair→flush并带不相关助攻、历史牌快照与后来deck不同、清场前后恢复、失败F清场保存保持原G来源、冷恢复/retry/duplicate。

P3补4项原`quality-r2-basic-suit-choice-v1`显式身份用例：真实4金染色买用、染色/基础工具两方向共享九选quota、使用后付费刷新/恢复不重开，下一店重开；失败购买保存/retry/duplicate保持旧身份。原五选和C2测试保留，不改旧身份产品行为。

`p2-recovery.json`完整保留合法前档、仅成套改类型/资格并重算checksum的异常档、实际拒绝结果及合法后档。当前异常返回`{ok:false,code:"Run invariant: route stage qualification"}`；合法同命令清场热度仍411，G1/F0，后档恢复通过。`scorer-and-save.json`已按新身份/来源更新；24笔scorer容量和五清场1458/1458/1458/1458/1968均保持，quota失败/相同retry/duplicate一次仍通过。原JSON及manifest/报告原文保留`*-before-p2`，不抹原独审FAIL。

修复后独审复核状态：待同一审查者直接读取冻结文件，不能以作者141项PASS代签。自然经营与UI等未签范围保持。来源快照用于有界保存一致性，不承诺抵抗整份命令、回执及快照被一起重造。

本轮复核命令（已有依赖，非自然游戏）：

```sh
npx vitest run tests/route-growth-run.test.ts tests/route-growth-score.test.ts tests/fixed-suit-dyes.test.ts tests/route-starter.test.ts tests/group-upgrade-save.test.ts tests/recovery-save.test.ts --reporter=dot
npm run typecheck
node docs/production/evidence/route-growth-c2-2026-10-11/export-evidence.mjs
git diff --check
```

## parent集成边界与未签项

- GameScene只有AI score输入传routeGrowth和trace来源名“路线资历”两个局部变化；不碰pendingRefill后inventoryButton enabled、入口动画或技能控件。parent按这两个hunk与PR119串行整合。
- 新卡片文案读取实际定义；路线事件显示合格clear数与精确因子，乘法packet标×M。仅软件/文案必要接线，未做双端原生、设备、视觉/听感、人类观感或全旅程验收。
- 没有实际18完整游玩、种子扫描、大模拟、全旧矩阵、CI、发布或自动化。自然取得、换槽后稳定抽到核心、上亿路径、完整美术仍OPEN，由dot与parent接续。本轮停止，不再扩方案。
- 原英雄可用性/时序全部继承当前合同；本包只放置C2全局因子，没有另起骰爷相反规则或擅改未来英雄post方案。全关卡/价格/权重/经济、短演出边界、原资产/音路未改；临时四张顺子明确不实现。

给DELIVERY_PLAN的建议合并段（只提供，不写计划）：

> C2-B本地软件候选：新身份quality-r2-route-growth-v1/3e788b6aba71306e，run真实G/S/F清场历史、不依赖起手实例，三率27/20、7/5、13/10按N−3分别cap10^12后相乘；全Joker/版次后、原阿默post前读取计分前快照，第四clear仍×1、下场起×f。六卡修正、严格旧档隔离和原子clear/receipt已落到未提交diff；原251定向属于修复前候选；P2修复后141受影响/type及actual scorer/完整受控checkpoint证据通过，严格独审复核另签。未推送/合main/部署；自然18局、设备/原生UI、人验、美术与自然上亿可达仍OPEN，依赖parent独审集成和dot补证，不以四手容量代签实战或全部独审建议。
