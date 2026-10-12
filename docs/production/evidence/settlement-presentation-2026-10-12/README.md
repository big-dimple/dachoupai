# 独立结算表现候选

产品冻结 `2e214e25ddbedcdd450e9d6c769978051c41610a`，从 `be2ff12` 起步；父通知骰爷 P0 合入后，正常 merge `dc985f6a4f418e5751648f1d57f466163fbc2673` 得 `8c04902eea4601e1f3fb9e856f3a28d24a67702f`。随后正常吸收PR131纯文档main `0c71c5dabbc754516848d1a0acc931464db730a8` 得 `10a74918523f4ef8ecea6834145ba3e812311069`，产品树不变。五个产品/测试/harness文件字节不变，最终 draft 的精确 HEAD CI 由 PR 检查与交接回执单独记录。未合 main，父独立看画面/操作后决定美学是否通过。

## 文件边界与实际行为

- `IntermissionScene.ts`：纸面结算接线、既有来源/人物按需加载、直接相邻下一步区域的纸色与分隔。原命令、奖励身份去重、菜单/回看/恢复、主按钮语义沿用；一秒后不整页重画，以免销毁按住中的触点。
- 新 `SettlementPresentation.ts`：已保存事件事实、分强度构图、完整等比人物、来源卡、固定缺图留影、按实墙钟一秒的局部收束。静态结果与操作从首帧即可读；低动态直接落定；失焦/离场清理。
- 专属 `harness/fixtures/settlement.ts`、`harness/settlement-presentation.mjs`、`tests/settlement-presentation.test.ts`，以及本目录证据。

领域、计分、随机、供给/价格、身份/存档、GameScene、技能、ShopScene、全局样式、既有图像/音轨/库与父合骰爷15文件均逐树同 `dc985f6`。未扩世界观/全资产重画/3D/新外库或音效工程。复用 `selectionPortraitKey`、既有 Joker preview、p00 纸面、既有数字字体、`loadResultSourceArt` 和 `RewardCoinCue`；新运行图音文件为零。象牙/深墨/青蓝/朱红沿当前合同。

强度按验证过的末手 `finalScore` 与真实乘法事件分层：普通、至少两笔有效乘法的强链、千万、亿分。Boss保存身份另盖“压轴击败/未过”；失败明确本场累计、目标差额和最后一手。来源头像只附其自身事件因子/代价；累计 M、局级资历和已存热度加成分别标记。搭台阶实际 `热度+50`、`读取+100热度` 保持加区；资历读取本手之前的 S，不倒灌本次新增。

## 证据入口

所有 PNG 都是实际浏览器整屏，包含按钮/下一步/菜单；未裁切重构、未复制旧图冒充候选。每端坐标、显示文本和资产 ID 在对应完整 report 内；gzip只压缩序列化证据。文件哈希见 [manifest](manifest.json)，检查范围见 [checks](checks.json)。

| 用途 | 入口 |
|---|---|
| PC1366亿分前后 | [before](before/billion-1366.png) / [after](after/billion-1366.png) |
| PC1180亿分前后 | [before](before/billion-1180.png) / [after](after/billion-1180.png) |
| 390×844亿分前后 | [before](before/billion-390.png) / [after](after/billion-390.png) |
| 普通/强链/千万/长数字 | [普通390](after/ordinary-390.png)、[强链1366](after/chain-1366.png)、[千万390](after/million-390.png)、[科学计数390](after/long-390.png) |
| Boss胜败 | [胜1366](after/boss-win-1366.png)、[败390](after/boss-loss-390.png) |
| 缺图/低动态/加速/窄屏/短横 | [缺图](after/boundary-missing-art.png)、[低动态](after/boundary-reduced.png)、[4倍](after/boundary-accelerated.png)、[320](after/boundary-narrow.png)、[740×390](after/boundary-short.png) |
| 完整真实UI出牌→结算短片 | [普通1180](after/native-ordinary-1180.mp4)、[强链390](after/native-chain-390.mp4)、[亿分1366](after/native-billion-1366.mp4)、[Boss胜1366](after/native-boss-win-1366.mp4)、[Boss败390](after/native-boss-loss-390.mp4) |
| 全21前态/37候选case及原生保存 | [before report](before/report.json.gz)、[after report](after/report.json.gz)、[受控输入与原计分输出](after/controlled-states.json.gz) |
| 吸收main后必要只读图/存档 | [6例report](main-alignment/report.json.gz)、[亿分1366](main-alignment/billion-1366.png)、[亿分390](main-alignment/billion-390.png) |

普通、强链、千万、亿分、长数字、Boss胜败各在1180×757、1366×768、390×844用同一受控保存状态比较前后。自然 `310793589 / H977 / M≈318110.12` 只来自父提供的事实，完整原存档/trace尚未同步到本工作区，本包**没有声称重放了这笔自然单手**。上表全部是明确受控例；现行原计分器分别产出1296、41990、97467438、733884590、1952400131333767，原生实际出牌病例不等于自然购得、八章经营或18局试玩。

五条原生UI命令均以实际receipt的commandId调用原 `applyCommand` 对账完整state；journal只新增该笔，IndexedDB current.state相等。回看/关闭不改完整保存；冷恢复仍相等，`RewardCoinCue`没有恢复奖励cue。三连点“前往筹备”只多一次OpenShop、金币不变；双击快速返回与迟图离场不改保存；blur及受控hidden/focus后无锁死、无重奖；低动态无运动组；4倍偏好400ms时运动仍存在、1.25秒后消失。软件截屏/录屏保留实际音路，云端未真人试听，不签GPU/FPS/设备或人类美学。

吸收main后99项/7文件定向、typecheck与build通过；七组受控输入/输出和冻结版逐字段相同，6例只读原生图/完整保存相等，五产品文件hash保持。标准CI必须读取最终draft HEAD，不能借2e/8c或父骰爷旧绿灯代签。

## 保留的FAIL与修正

1. 首次缺图夹具拦了整个handdrawn目录，连manifest也拦截，白屏停在启动前；[真实FAIL图](failures/manifest-interception-FAIL.png)与[原report](failures/manifest-interception-report.json.gz)保留。夹具修正为只拦`.webp`；产品不扩大到Boot系统。最终缺图候选已通过。
2. 第一短横候选bounds虽过，实际像素仍有来源卡压人物、分隔线碰累计；[视觉FAIL原图](failures/short-overlap-visual-FAIL.png)保留。短横移除来源小卡并合并次级标签，让完整人物、主分数、H/M、累计与奖励各自分离；末手详情保持原入口。最终740×390已实际查看。

以上初候选源HEAD显示be2且工作树当时未提交，不冒充精确冻结SHA；最终图与完整report绑定2e，吸收记录绑定8c，哈希分别留证。整体美术、自然来源原trace重放、人类操作理解、设备/听感、其它页面与正式质量门仍待父/用户验收。本包独立draft，父唯一集成/部署。

## 首CI必要返修（保留原失败）

精确初draft HEAD `8c2fa1f7fb8ed54bd01c091ff9b4786dcaf2e84c` 的[CI38233780448](https://github.com/big-dimple/dachoupai/actions/runs/38233780448) domain有4个 `failure-audio.test.ts` 失败，原[完整log](failures/ci-8c2-domain.log)保留。该文件只用最小run桩并mock整个render来验证音频；本批失败页新增资源请求却在无挂载视图时读得分账本。返修仅让可选transport依赖已挂载的paint hook，失败页只请求身份图、不读计分来源；原音频代码及四条断言未改。

补核同源多次计分：五张K加演纸各自再计分一次，铁算盘实际10笔热+25，按原事件收成`热+25·10次`；有更多不同操作时显示另N笔，完整顺序不变、留在原回看。实际多次再计分也进入强链层。原初夹具误把每牌重触上限当全手上限，测试预计9而真实为10，已按五牌×原先/再计分两次补正；产品不改规则。

最终必要返修本地104项/8文件、typecheck/build通过；[6个只读复核](ci-repair/report.json.gz)、[缺图/迟到/离场3例](ci-repair-boundaries/report.json.gz)、[重复来源2例](repeated-source/report.json.gz)全部通过，已查看[390完整实图](repeated-source/repeated-390.png)。同源摘要变为有限高度，原普通/乘法/亿分布局没有重排，原全段短片和37例按各自source保留。复核期间各报告实际HEAD及当前文件blob hash单独登记在checks.ciRepair，不冒充初2e矩阵或初8c2CI已经通过新版本。最终新HEAD CI必须另核；仍仅draft，不合main。

## 父审拒收后的限定修正（当前待复审）

父实际看d990的三张最终图后拒收，**未签美学通过**。本轮只修人物/缺图构图、英雄成本归属、玩家文案、短竖屏、纯重触/双资历和源自身成长展示。领域、身份/存档、计分/随机/价格、GameScene和音频原样。父点名的旧图继续保留为拒收基准。

原正常失败PNG与report均含谢幕selection完整图（y375.2、height148.8），不是证实了网络缺图：真正问题是人物挤在左下，人物区与中心大量空白。本轮正常失败人物完整居中；独立拦所有人物WebP时，展示有纸框、实际已保存末手K♠和角色身份的静态留影，移除旧两行文字空区。燃金说明始终位于谢幕人姓名下、与冷场牌分列，冷场卡只显示自身×3。主层移除H/M/S/Lv缩写与长乘式，改为牌型等级、目标、两族完整短摘要；精确账仍沿现有回看入口。

390×660及320×640通过限定缩短次级下一步区域、48px主动作和紧凑来源卡保留完整人物/成本/来源因子，不用隐藏主要结果换无重叠。仅b06、对子12级的受控原计分器例真实1800过关，无其他增益Joker；两笔retrigger事件即时H/M不变，仍识别再说一遍并显示“再计分2次”。同花顺例同时显示顺子21场与同花21场。搭台阶非封顶50→60，源自身read50和手后60分开，在624/700/800及短竖屏完整可读；source/growth与奖励相交时至少8px纵向间隔。

[35例整屏与完整保存](parent-review-repair/screens/report.json.gz)、[正常/慢载/真实缺图失败3例](parent-review-repair/failure-art/report.json.gz)、[3条真实UI动作/保存](parent-review-repair/native/report.json.gz)、[检查和源blob hash](parent-review-repair/checks.json)。截屏绑定其报告实际HEAD与此处blob hash；不是自然18局，未声称自然310793589原trace重放。新HEAD CI另核；旧d990绿灯不能代签这轮修正。

- [失败390](parent-review-repair/screens/boss-loss-390x844.png)、[失败390×660](parent-review-repair/screens/boss-loss-390x660.png)、[真正缺图失败](parent-review-repair/failure-art/boundary-missing-failure.png)
- [亿分1366](parent-review-repair/screens/billion-1366x768.png)、[亿分390](parent-review-repair/screens/billion-390x844.png)、[亿分320×640](parent-review-repair/screens/billion-320x640.png)
- [仅b06](parent-review-repair/screens/retrigger-320x640.png)、[双资历](parent-review-repair/screens/dual-390x660.png)
- [非封顶成长624](parent-review-repair/screens/growth-624x768.png)、[700](parent-review-repair/screens/growth-700x768.png)、[800](parent-review-repair/screens/growth-800x768.png)、[320×640](parent-review-repair/screens/growth-320x640.png)
- [完整亿分动作](parent-review-repair/native/native-billion-1366.mp4)、[正常失败动作](parent-review-repair/native/native-boss-loss-390.mp4)、[仅b06动作](parent-review-repair/native/native-retrigger-390.mp4)

107项/8文件定向、typecheck/build通过，所有source/growth下界和实际字符图已核，未降低字体14px。当前仍独立draft，不合main/部署，父独立复审与设备/听感/人验保持待验。

## 320×640 安全区最后修正

父已通过上一轮人物构图、b06、双资历与成长方向；本轮仅收口 safe-bottom34 导致人物不足40px隐藏。短竖屏且有底部安全区时，把次级下一步压成一行32px、间距8px，恢复人物预算；主按钮仍48px且完全位于安全区之上。加入top34后同样保留完整人物、英雄自身成本、实际来源。失败页人物从实际末手文字下方起排，紧凑真实缺图框用实际末牌与总张数，不冒充新人物或虚构收益。

[bottom34三例](safe-area-final/bottom34/report.json.gz)、[top34+bottom34三例](safe-area-final/both34/report.json.gz)、[真实缺图/慢载三例](safe-area-final/boundary-both34/report.json.gz)、[无安全区三例复核](safe-area-final/no-inset/report.json.gz)、[源blob/检查](safe-area-final/checks.json)。全部实际Chromium 320×640整屏；安全区CSS在应用启动前写入。截图是受控原计分器例（亿分733884590），不是自然310793589或实体手机验收。正常三例回看关闭及亿分继续取消的完整保存不变，纯b06继续只增加一次命令且金不变。

107项/8文件、typecheck/build、production-plan和领域/音频/GameScene等边界检查通过。截屏报告记录采集基础HEAD 3dd8与修改后的源blob；最终提交和精确新HEAD CI在draft PR另登记，不借旧绿灯代签。仅draft，父独审后才能合main。

正常合入父新main f326a9b（PR134），身份和动作新时序原样吸收。其上[320×640 top34+bottom34三例](safe-area-final/main-f326/report.json.gz)再核通过，权威燃金30、谢幕×4与冷场自身×3归属不变，107项/8文件和build再次通过。无安全区三例的全部几何与父已看3dd8完全一致；安全区分支才压缩次级面板及启用紧凑留影。
