# 已接入：有价牌型升级与真实无尽说明

本阶段承接已独审商店 `231e1440eb76fce49156b7912145ff4892855cf7`，在同一 `feat/shop-card-journey-20261014` 正常 merge 核心 PR178 `0b41f87618e0fca3016a352d59af62353a2acafa`，合并点 `4f7ee2b44d7193b6a4bbacd060937561e2bcb391`，无冲突。PR180最终包含178全部3个提交；两原head均为祖先，父可串行合178再180，也可审包含核心的180，不需重放/cherry-pick领域。未改178分支/PR、未合或推main。

服务现在在已有做牌工作区可操作：仅显示已发现、未30级的牌型，等级前后、优惠后实付来自原 `r2PracticeQuotes(run)`；确认发原 `PracticeHand`，expectedSeq用原报价，expectedLevel/shopSeq原样传入。保存成功消费真实 `hand-practiced` 再显示结果；失败不发布或扣款，菜单retry保存原候选，界面读取已保存的严格receipt。没有复制价格/优惠/升级/共享额度公式，没有生成库存T01。

服务、改牌、染色共用每店一次；买不起的已发现项仍可见、禁用并显示短缺，不伪装成未发现。满库存可升级，普通T01库存/随机位依然独立买存与使用。主入口不把阶梯升级价错写成工具2/4金；逐项权威报价在工作区和确认可见。原五槽比较/保存/工具选择链路保持。

父最新授权同时把 `EndlessContinuationCopy` 接到 `r2TargetPolicyFor(identity).multiplier`，仅换展示reader。新身份27/20，bounded11/10、原其他12/5均读取合同，不写死；Intermission/计分/目标公式未再改。

## 实际前后图与软件范围

| 变化 | 核心已合、尚未接线 | 已接线 |
|---|---|---|
| 320服务入口 | [无服务项](before/320-services.png) | [等级、真实实付、共享次数](after/320-services.png) |
| 390购买确认 | 原入口无此服务 | [实付3金、30→27、直接升4→5](after/390-confirmation.png) |
| PC1180 | [原做牌区](before/1180-services.png) | [服务与已有库存分列](after/1180-services.png) |
| 最低1金真实兑现 | 无服务项 | [高牌1→2、实付1金已保存](after/320-direct-saved-minimum-price.png) |
| 390无尽确认 | [误显示1.1](before/390-endless-confirmation.png) | [读取权威1.35](after/390-endless-confirmation.png) |

对照输入为同一核心身份与公开合法受控checkpoint。before冻结合并点4f7ee2b4，产品树 `c8782736aa0d5bb6899eea74bb1d2d52e7be4e13`；仅在隔离工作树复制观察器untracked，不改产品，报告为OBSERVED。查看/取消完整state/journal/IDB及应用localStorage相等，0命令。无尽胜利输入由父已提供自然C9文件的原命令前缀在新身份离线回放到八章终态，不是新自然局或旧档迁移。

最终服务/无尽原生运行冻结于 `e8cd3532d10aae783f4fb92e9c0ef9da1657f81d`，src tree `e0042f97d9183ca45be680bb92484496b80b5133`，tracked src/tests/harness未修改；后续只加观察器before模式及证据，产品树保持。

[报告](after/report.json)/[完整保存gzip](after/full-state-journal-storage.json.gz)含320×844、390×740、1180×757、1366×900四组，每组9笔原生事务共36笔：失败固定候选重试一次服务、原已持T01使用、随机T01买来存着、原刷新、改牌买存及刷新、直接服务保存、染色买存、原ContinueEndless。每笔完整state/journal/IDB.current与revision及应用localStorage（排除lease键）对原applyCommand/makeCheckpoint完全相等。两次服务每端分别覆盖原3金优惠与最低1金；无库存/RNG/章目标漂移；共4次完整冷恢复。

取消/关闭/Escape0命令；延迟保存时连点和Escape只留一候选，真实quota失败保原state/IDB，retry不重新计价。两个真实保存成功路径分开核：直接消费hand-practiced，retry读取durable receipt。服务使用后基础/染色禁购，先买改牌或染色后服务不再出现，真实刷新不重置；未发现同花及已30级三条均无可购项，不足金行仍显示实际短缺。满2/2库存仍可付费升级，原已持T01使用不扣金、随机T01按原报价买入库存，没有误套服务阶梯价或重开额度。

无尽四端实际取消不改保存，实际确认仅原ContinueEndless一笔，接续目标27642及完整保存同原领域。旧1.1错误的对照图保留。另新增测试核新1.35及既有1.1/2.4完整身份边界，不开展兼容工程。

原商店整链在核心新身份下又完成四视窗24笔回归：[报告](journey-core-regression/report.json)/[完整保存](journey-core-regression/full-state-journal-storage.json.gz)。它冻结于f17bb848，src树3bafef6c；之后产品差异仅主店入口价/底部共享提示两行，服务final原生已覆盖该新主店。没有借旧identity或旧截图签新自然体验。

全部PNG原尺寸、无后处理；已实际查看320服务/最低价结果、390确认/已保存/1.1→1.35及1180/1366服务画面。只签有限可读/可达和操作正确，不签整体美术。

## 检查、来源与未验

243文件3488项全量在f17bb848通过；最终两行入口显示后100项/11文件定向及build含tsc再次通过，内容目录和plan32保持，日志在[checks.txt](checks.txt)。[来源保护](integration.json)记录双方祖先/合并点与产品树；领域、application严格保存、content、RunLaunch逐对象等同178完整head。GameScene/Intermission/音频/资产/依赖/安全/CI/AGENTS/唯一计划逐对象保持main f651。

初次新增测试把三条错误写成three-of-a-kind，被原不变量拒绝；改为真实three-kind，未放宽guard。原入口测试期待旧工具2/4价，在新服务阶梯价入口已不适用，改为明确不误标服务价格，工具真实优惠价断言保持。无原生产品FAIL，原商店/核心其他FAIL继续按旧SHA保留。

服务核心依赖已解除，实际入口与交易已实现；不再标“待权威接口”。仍未验自然获得/长期平衡、真人理解、实体设备/触感/听感/短横屏和完整美学。未部署或合main。最终精确HEAD的CI在PR另核，旧231e1440和178绿灯不代签新接线。
