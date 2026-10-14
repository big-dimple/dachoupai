# 旧结算/P1B有界收口候选

基线 main `69f46e47f250ec3ad7bc55ed11f7888326eecf8f`；独立分支 `dev/p1b-settlement-20261014`。当前授权仅开发分支commit/push与Draft PR，不合main、不push main、不部署、不修改唯一 DELIVERY_PLAN，不跑18局。PR170已由父设为可审查，本任务没有再改它。

## 可读取来源与复用

- [PR133远端最终head](https://github.com/big-dimple/dachoupai/commit/56aa86fcdeeaec75cc496399ad4387de81957325)可读、未合。复用其 `SettlementPresentation.ts`、结算接线、既有一秒实墙钟收束、公开受控配方与测试；原父视觉拒收/修订/最终safe-area证据仍在其[固定源README](https://github.com/big-dimple/dachoupai/blob/56aa86fcdeeaec75cc496399ad4387de81957325/docs/production/evidence/settlement-presentation-2026-10-12/README.md)，不倒签本候选通过或旧稿美学已签。
- [PR163](https://github.com/big-dimple/dachoupai/pull/163)的 `7d49940390ee5e7d2b38a2dfc9fa9cf9d6069824` 已合，merge `009c747bd324b5cd7b0df9986be44a58d5e41429`。当前main的 `ScoreSourceProcess` 与 `formatScoreReview`接线保留，不用PR133旧版本覆盖真实factor/累计值/诊断回看；所有 `getR2Stage`/`stageIdentity`保main当前身份参数。
- PR133接线仅有一处scoreText导入冲突，按main保共享诊断模块、结算只取heatText修复。无GameScene或商店接线改写。

最终局部运行冻结 `c5ff7d4035fb89d13831ce1aa30c3b727d8fc040`，src tree `2b84606e0d598d26fefbad9953b167f886e63eb6`。后续仅证据提交，运行产品与脚本保持；最终开发head及其新CI以Draft PR/交接回复核，不借PR133/163或main的旧CI。

## 本候选实际产品范围

仅 `IntermissionScene.ts` 和结算专用 `SettlementPresentation.ts`。保本场已保存结果、原奖励/下一店/无尽/回看/退出操作；结算动效不拥有命令回调或等待锁。普通、小链、千万/亿分以原真实finalScore/实际乘法与重触事件选择原tier；纸墨/原人物/原卡面/一秒收束复用，没有新资产、音路或效果库。

手机主数值先使用真实得分字体再实测缩字号，显式清除word-wrap，必要只缩单行比例；原长分数科学格式旁仅在丢掉非零尾数时加“≈”，exactScore仍存文本data与原诊断完整trace。来源从真实事件读取，不把累计倍率归给人物/丑牌；同源读取与手后已存成长分开。丑牌放大来源数从完整已保存trace按实例去重，PC前三项只是摘要，超过三项明确“部分来源”；手机版不塞完整长清单，原回看保全有序事件。

当前bounded身份写“过关加成 · ×实际因子”，不把现行max规则写成旧S/F独立无限资历。旧身份继续显示其原已存资历与规则，不迁移、不修改原保存。

[来源与保护对象](sources-and-protection.json)：GameScene、商店、英雄说明/共享高光、ScoreSourceProcess/ScoreReview、ResultStage及其资源loader、domain/content/application/platform/audio、全部runtime资产、依赖、工作流、AGENTS、总计划逐对象同基线。

## 父当前自然观察与共享补丁

父报告线上69f自然第四章暖场葫芦400×62.4=24,960/3,600，来源高光主标题阿默、实际来源长期捧场×1.3。这是可信的父观察输入，本线程没有取得其完整存档/原图或自行重播该自然手，不用新夹具代签它。

当前独立样例用合法公开葫芦、阿默无助攻、e11已存系数1.3，在**当前身份**真实PlayHand得到3,931；结果页清楚分开“阿默 · 本局角色”和“长期捧场 ×1.3 / 手后1.3→1.4”。这是同类可读性输入，不是重建父的24,960或自然获取1.3。

原大标题问题位于共享 `HeroClimax.ts`。按父要求只交[最小接线补丁](HeroClimax-parent-source-title.patch)，没有应用到共享文件：实际具名丑牌来源当大标题，英雄名移为“某英雄 · 来源兑现”，数值/累计值/时长/动作不改。`git apply --check`通过、内存compiler host类型通过（[patch-typecheck.json](patch-typecheck.json)，sourceWritten=false）；**未应用、未浏览器验证，不称该牌桌高光已修**。父拥有共享编辑窗口，应集成后核该自然输入或有界实际事件。当前结果页收口不依赖应用此补丁。

## 冻结局部软件证据

均为系统Chromium软件Canvas，PC1366×768及触控390×844，非实体手机。脚本 [harness/settlement-presentation.mjs](../../../../harness/settlement-presentation.mjs)只用公开受控库存/等级/既有合法历史账本，由未改计分器生成真实PlayHand trace，不扫种子、不编造得分事件。

| 来源身份与样例 | 实际结果 | 证据界限 |
|---|---|---|
| 当前 `quality-r2-bounded-clear-v1`，阿默/e11 | 3,931 | 真实×1.3、英雄没有实际技能事件、手后1.4；不是父自然24,960复现 |
| 当前身份三源/燃30 | 41,990 | 冷场×3、包场×1.8、独家×1.5与谢幕燃30×4分开 |
| 当前身份受控成熟上限 | 6,876,748 | 同一旧高分配方在现行身份读×4，不能写成当前亿分 |
| PR133继承 `quality-r2-route-growth-v1` / `json-fnv-v1:7414228d95059959` | 普通1,296；亿分733,884,590；长分1,952,400,131,333,767；Boss失败130 | 已有旧身份配方用于大数字/回看/恢复显示。**受控旧身份亿分，不是当前自然试玩、自然G14或新身份亿分可达证明** |

- [14张最终整屏/几何摘要](screens/summary.json)，[完整报告](screens/report.json.gz)和[完整配方/前后状态](screens/controlled-states.json.gz)：每张主分数的实际wrapped line数=1、wordWrapWidth=0；原样保存不变、实际来源/人物/奖励/主动作在其界内。当前/旧身份清楚记录。
- [6条原生输入](native/summary.json)/[完整快照、命令与冷恢复报告](native/report.json.gz)：两端各当前e11（1×）、当前链（4×）及继承亿分。真鼠标/触控选牌、Xiemu原入口燃30、实际出牌→结果；PC亿分在真实长演出中点原菜单“快进当前手”，手机亿分用低动态；每笔完整状态等于原applyCommand、journal只一笔、IDB保存相等。回看关闭不变，正常刷新→title→继续回结算完整快照不变。
- [10项过场边界](boundaries/summary.json)/[完整报告](boundaries/report.json.gz)：重复继续只一笔OpenShop、受控blur/hidden、低动态、4×时400ms观察仍有收束、1250ms后已撤下、慢图/缺图、快速返回退出、320窄竖/740短横；查看/收束/退出保持完整state/journal/IDB。hidden/blur是受控DOM信号，不是实体后台测试；没有增加跳过短结算按钮。
- [audit-saves.mjs](audit-saves.mjs)实际离线重算6笔出牌和重复继续的一笔OpenShop，完整state/journal/IDB.current等于makeCheckpoint、revision+1，全部7笔通过；[save-audit.json](save-audit.json)。这是快照复算，非额外自然游戏运行。
- [78项/6文件定向](checks/targeted.txt)、[typecheck](checks/typecheck.txt)、[build](checks/build.txt)、[计划静态检查](checks/plan.txt)通过。缺席文件名不计文件或测试数；原大bundle提示保持。

## 可审的实际画面与短片

以下最终PNG已用view_image实际检查；不是只凭文字/bounds签美学。原尺寸截图无后处理。实际软件帧短片保原声输出采集，**未试听、未签听感或物理FPS/GPU**。

| 可见对象 | PC | 390 |
|---|---|---|
| 当前e11来源归属 | [整屏](screens/current-e11-1366x768.png) / [原生短片](native/native-current-e11-1366.mp4) | [整屏](screens/current-e11-390x844.png) / [短片](native/native-current-e11-390.mp4) |
| 当前多来源 | [整屏](screens/current-chain-1366x768.png) / [短片](native/native-current-chain-1366.mp4) | [整屏](screens/current-chain-390x844.png) / [短片](native/native-current-chain-390.mp4) |
| 继承身份亿分 | [整屏](screens/billion-1366x768.png) / [真实长演出快进短片](native/native-billion-1366.mp4) | [整屏](screens/billion-390x844.png) / [低动态短片](native/native-billion-390.mp4) |
| 超长数字近似显示 | [整屏](screens/long-1366x768.png) | [单行整屏](screens/long-390x844.png) |

每段原始软件JPEG帧归档在对应 `original-screencast-frames.tar.gz`，帧序列/墙钟时间保在gzip报告；解压到对应native目录即可对应原frame paths。WebM是原声采集容器，不是另一个自然录屏。原始散帧仅挪到ignored shots临时目录，仓库有完整字节archive及哈希。[manifest.json](manifest.json)/[SHA256SUMS](SHA256SUMS)覆盖全部最终与历史证据，不改runtime资源目录。

## 未通过记录与仍未验的事

1. [旧配方误用当前身份的首轮5 FAIL](failures/imported-current-identity-excerpt.txt)：上限/双族max与旧无限资历期待不同，不是新规则bug。继承配方固定回其原身份，单列当前反例；没有改计分器去过旧期待。
2. 原生录像首轮相对输出路径被ffmpeg concat相对二次拼接，[真实错误日志](failures/native-relative-clip-path.log)/[完整失败报告](failures/native-relative-clip-path/report.json.gz)保留。使用绝对输出路径后6条原生及完整保存审计通过，没有修改shared native-clip工具或产品。
3. [pre-final](pre-final/screens/summary.json)保 `c4174a0c` 的16图/6原生/10边界完整记录，未冒充最终head；随后补完整trace来源计数，最终 `c5ff7d40` 全部必要局部验证重新冻结。
4. [一次fixture identity键名误写version/hash导致typecheck失败](failures/identity-key-typecheck-excerpt.txt)，已更正为既有StartOptions的contentVersion/contentHash；未变更任何保存/API合同。

仍未签：父对整段构图/美学的最终审图、上述共享标题补丁集成后实际可读性、完整声音听感、实体手机触感/后台/GPU/FPS、自然亿分/八章/18局、完整旅程与整体游戏体验。成功CI、受控数字和局部截图只证明各自记录范围；旧结算没有因此成为main已发布或W0–W9整体验收通过。
