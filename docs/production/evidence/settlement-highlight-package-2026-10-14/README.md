# 完整结算高光体验包（受控候选，2026-10-14）

**当前入口：** 父已拒收第一轮的重复脸/小框贴图构图；同一PR的[第二轮连续三镜头、实拍关键片与低动态采样更正](revision2/README.md)为当前审阅入口。第一轮旧图和记录以下按原版本保留，不代表已通过审美。旧 `heroes-after/erxiang-390-reduce-0.png` 是poststep绘制前错拍，第二轮已在未修改的旧产品上以postrender实图证明原静态面板可见，没有将采样缺陷冒称产品消失。

基线 `f651a04ef5eb68c29a413acf8b4d8a0e9bbcde09`；产品提交 `13c6c634`、百万标题收口 `7bf15367848b78786b34bc9318c54178ea541d75`。这是承接 PR171 的完整表现包：普通兑现 → 连锁来源聚焦 → 实际英雄技能 → 百万/亿分落定 → 胜败结果及下一步。独立开发分支 `dev/settlement-highlight-package-20261014`，本任务不合 main、不部署。

## 实际交付

- 普通、连锁、百万、亿分用不同数字落位强度；百万独立进入百万档，千万仍按实际数值命名。亿分保留单行精确主数、常驻朱红纸墨数字区、强落位与喝彩收束；科学计数法保留近似标识，原精确整数仍在 trace/详情。
- 来源焦点从“首个倍率来源”改成**最大实际局部丑牌因子**，用精确 Rational 比较、同值保持 trace 次序；不是反事实贡献排名，也不把累计 M 或过关加成归给这张卡。主来源原画、名字、实际局部收益与计数分层，英雄技能及真实消费在英雄栏。
- 每个既有实际技能/丑牌兑现分镜复用原立绘与独立头像：明亮纸墨斜分格、眉眼近景、原有一秒主体停留、局部收益和累计倍率。实际助攻/交棒/燃金/蓄势释放/赌约达成显示技能名；没有实际事件不能凭头像亮技能。没有重画脸或人为改变表情。
- 专属分镜移除整屏暗幕与原环形墨滴，改成分格边缘的稀疏墨线。原 GameScene 演出队列、事件顺序、墙钟主体停留、菜单快进/退出和计分输入都保留。
- 结果页直接消费已保存 trace，主数先设置数字字体再测宽，禁止换行，必要时缩放至既有安全宽度；整个短结果动效一秒内收束，主动作始终可用。低动态保留全部事实和静态层级。缺画回退写本张真实名字，原异步原画接入及离场取消保持。

运行时只改 `SettlementPresentation.ts`、`SettlementHighlights.ts`、`HeroClimax.ts`、`HeroClimaxLayout.ts`、`SkillPanelInk.ts`，以及 `IntermissionScene.ts` 两行实际百万标题接线。

## 前后原图与连续短片

所有图片均来自真实浏览器/Phaser 运行；输入是明确构造的合法受控状态，并经原生产导入与真实计分/操作，不是合成海报或自然试玩。

| 样例 | main 前图 | 候选后图 |
|---|---|---|
| 普通 390 | [原图](before/ordinary-390x844.png) | [原图](after/ordinary-390x844.png) |
| 百万 390 | [原图](before/million-390x844.png) | [原图](after/million-390x844.png) |
| 亿分 320 | [原图](before/billion-320x740.png) | [原图](after/billion-320x740.png) |
| 亿分 390 | [原图](before/billion-390x844.png) | [原图](after/billion-390x844.png) |
| 亿分 PC1366 | [原图](before/billion-1366x768.png) | [原图](after/billion-1366x768.png) |
| 科学计数法 320 | [原图](before/long-320x740.png) | [原图](after/long-320x740.png) |
| 燃金 390 | [原图](heroes-before/xiemu-390-normal-0.png) | [原图](heroes-after/xiemu-390-normal-0.png) |
| 燃金 PC1366 | [原图](heroes-before/xiemu-1366-normal-0.png) | [原图](heroes-after/xiemu-1366-normal-0.png) |
| 助攻 390 | [原图](heroes-before/amo-390-normal-0.png) | [原图](heroes-after/amo-390-normal-0.png) |
| 交棒 390 | [原图](heroes-before/erxiang-390-normal-0.png) | [原图](heroes-after/erxiang-390-normal-0.png) |

[阿燥释放](heroes-after/azao-390-normal-0.png)、[骰爷赌约达成](heroes-after/touye-390-normal-0.png)、[长期捧场](heroes-after/e11-390-normal-0.png)、[一次性招牌](heroes-after/f06-390-normal-0.png)、[后台眼神冷结果页](cold-source/backstage-390x844.png)、[失败落幕](curtain/boss-loss-390x844.png)、[低动态亿分](reduced/billion-390x844.png)、[低动态交棒](heroes-after/erxiang-390-reduce-0.png)。

同一亿分输入的完整原生短片：[main PC 前片](native-before/native-billion-1366.mp4)、[候选 PC 后片](native/native-billion-1366.mp4)，以及[390 低动态实际出牌到结果](native/native-billion-390.mp4)。短片含当时实际输出的原有音频，未换音乐；它们不是主观听感或 GPU 帧率验收。

## 输入与权威结果

| 档位 | 实际 finalScore | 输入边界 |
|---|---|---|
| 普通 | 1,296 | 当前 bounded-clear 身份、受控公开牌/库存 |
| 百万 | 1,699,627 | 当前身份、受控等级/版次/成熟库存 |
| 亿分 | 458,449,875 | 当前身份，独家戏保存系数 ×100，真实燃30金；自动过关加成仍只有 ×4 |
| 科学计数法 | 1,952,400,131,333,767 | **复用原有旧身份 scorer 输出，仅作科学计数法排版边界**；不签当前规则自然可达、不开展旧档兼容工作 |

三个当前身份样例的巨大库存/等级都不是正常随机经营获得的证据；科学生成样例尤其不能用来替新规则签高分可达性。前后 12 个同输入结果的完整 `state/journal/storage` 逐项相等，见 [identity.json](identity.json)。

“后台眼神”样例是本地合法受控冷结果页，实际 4,919 分；它证明本输入原画与真实因子能显示，**不是父线上 60,047 分存档的复现或修复签收**，后者未提供完整输入。

## 时间点记录

原始观测见 [timing.json](timing.json)、[英雄完整报告](heroes-after/report.json.gz) 与 [结果计时报告](timing-after/report.json.gz)。定时原图在一个页面回调内同步取实际 canvas 与 `performance.now()`，避免把截图请求前的时间冒充截图帧时间；画面相位是最近真实渲染帧的相位，不据软件截图推断设备 FPS。

亿分数字设计节拍是：0–120ms蓄势，120–360ms压缩数字落位，360–780ms喝彩，780–1000ms收束；精确最终数从头可读，不用浮点模拟计分。以下为实际采样时间，非理想时间：

| 视口 | 落位图 | 成形图 | 喝彩图 | 收束图 |
|---|---|---|---|---|
| 320×740 | [166.7ms](timing-after/billion-320x740-t160.png) | [367.7ms](timing-after/billion-320x740-t360.png) | [767.1ms](timing-after/billion-320x740-t760.png) | [1157.3ms](timing-after/billion-320x740-t1150.png) |
| 390×844 | [167.5ms](timing-after/billion-390x844-t160.png) | [367.7ms](timing-after/billion-390x844-t360.png) | [768.0ms](timing-after/billion-390x844-t760.png) | [1162.4ms](timing-after/billion-390x844-t1150.png) |
| 1366×768 | [174.8ms](timing-after/billion-1366x768-t160.png) | [375.4ms](timing-after/billion-1366x768-t360.png) | [784.3ms](timing-after/billion-1366x768-t760.png) | [1172.5ms](timing-after/billion-1366x768-t1150.png) |

未跳过的技能主体实际保持至退出相位：助攻390为1057.2ms、交棒1086.7ms、燃金1050.2ms、阿燥1048.6ms、骰爷1068.6ms；燃金320为1051.8ms、PC为1081.9ms。菜单快进与退出是明确用户输入，取消路径不强制等一秒。`native/report.json.gz` 中较早的普通 screenshot 请求采样只作历史观测，不当精确帧时间；定时图统一以本节同步 canvas 记录为准。

## 验证及不变项

- 最终 typecheck、build、7文件81项定向测试通过；见 [测试](logs/settlement-tests-final.log)、[类型](logs/settlement-type-final.log)、[构建](logs/settlement-build-final.log)。构建保原大块提示，不改预算/配置。
- 普通/百万/亿分/科学计数法 × 320×740、390×844、1366×768：正常12例、低动态12例；主数字单行、原精确值保留、文字/原画在视口，数字与操作矩形不相交。
- 当前亿分三端实际出牌；额外390正常1×和PC菜单快进：5例完整最终状态/原命令/journal/IndexedDB相等，回看/冷恢复不变。见 [三端](native/summary.json)、[正常1×](native-normal/summary.json)、[快进](native-skip/summary.json)。
- 五种实际技能及真实丑牌来源13个原生样例：主名称、局部收益、累计倍率、真实技能输入/扣金/保存、低动态、菜单快进/保存退出、冷恢复全核。见 [汇总](heroes-after/summary.json)。
- 当前身份连锁、Boss胜/败三端9例；后台眼神冷页三端3例；连点继续、快速返回、失焦、受控 hidden信号、4×、晚图、缺图、迟到离场、短横/320窄屏10例通过。见 [胜败](curtain/summary.json)、[冷原画](cold-source/summary.json)、[边界](boundaries/summary.json)。受控 hidden信号不冒称真实系统后台。
- `domain/content/application/platform/audio/GameScene/public/art/vendor/third-party/.github` 与基线树完全相等；package/lock/Vite配置相等；PR145原型目录在main不存在且本分支未加入。没有计分/成长/目标/经济、通用GameScene交互、AudioEngine、音乐、资产重画或安全配置变更，完整树证据见 [identity.json](identity.json)。

观察器首轮曾用旧英雄入口/旧交棒按钮名，分别打开说明页或找不到新G04按钮；已按main现有真实“英雄操作”入口和“第1张 · 8♠”按钮重跑，未改GameScene。另有基线跨root缓存启动失败、观察器布尔fallback错误，以及开发中热更新使进行中的页面重载；原失败日志留在 `logs/`，冻结源码后重新通过。首轮最大倍率焦点遗漏 rescue 类型已修正为实际前后倍率比的精确比较，原测试期望暴露了该问题；不放宽计分或保存断言。早期构造超成长上限/重复牌定义被原守卫拒绝，未削守卫，最终科学样例采用既有真实scorer输出。

## 参考图与验收边界

三张 Library 参考图只读定位成功，但本环境像素下载全部返回 HTTP 403，属于**已拒绝**，没有取得或声称看过原像素：`libfile_5749c75376e88191a1ab86a86e977f07`、`libfile_a30233b0d8e0819198d96dc97902f0ce`、`libfile_873a135609fc8191bd53d277aa6b8b81`。未把其元数据当看图、未复制任何人物/设定/资产；继续使用实际已看的仓库手绘头像和立绘完成分镜。

本包交付工程候选与可审查的连续受控画面；父/用户整段审美、实体手机、听感、自然经营/高分频率、完整游戏仍分别待验，不用81个测试或本地受控上亿替代这些签收。

## 复跑入口

```sh
npm run typecheck
npm exec vitest run tests/settlement-presentation.test.ts tests/hero-climax.test.ts tests/hero-payoff.test.ts tests/source-stage-art.test.ts tests/score-source-process.test.ts tests/score-review.test.ts tests/result-stage.test.ts
npm run build
SETTLEMENT_CLIMAX=1 SETTLEMENT_KINDS=ordinary,million,billion,long SETTLEMENT_SIZES=320x740,390x844,1366x768 node harness/settlement-presentation.mjs
SETTLEMENT_CLIMAX=1 SETTLEMENT_REDUCED=1 SETTLEMENT_KINDS=ordinary,million,billion,long SETTLEMENT_SIZES=320x740,390x844,1366x768 node harness/settlement-presentation.mjs
SETTLEMENT_CLIMAX=1 SETTLEMENT_KINDS=billion SETTLEMENT_CLIMAX_TIMELINE=1 SETTLEMENT_SIZES=320x740,390x844,1366x768 node harness/settlement-presentation.mjs
SETTLEMENT_CLIMAX=1 SETTLEMENT_NATIVE_ONLY=billion SETTLEMENT_NATIVE_SIZES=390 SETTLEMENT_NATIVE_SPEED=1 SETTLEMENT_NATIVE_REDUCED=0 SETTLEMENT_NO_CLIP=1 node harness/settlement-presentation.mjs
HERO_TITLE_CASES=amo-390-normal,erxiang-390-normal,xiemu-390-normal,azao-390-normal,touye-390-normal,amo-1366-normal,xiemu-1366-normal,xiemu-320-normal,e11-390-normal,f06-390-normal,erxiang-390-reduce,erxiang-390-skip,erxiang-390-exit node harness/hero-source-title.mjs
```

两份harness默认写 `/tmp`/shots，可通过 `SETTLEMENT_OUTPUT`、`HERO_TITLE_OUT` 分开保存；原图hash及全部交付文件索引见 [manifest.json](manifest.json)。
