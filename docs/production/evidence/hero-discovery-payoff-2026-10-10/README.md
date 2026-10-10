# 六英雄机会入口与真实兑现：有限软件证据

2026-10-10。基线为父06:25UTC已正常FF的 main `a9e8f3b05065b1fa0a88ba2a8c656ba708516069`，部署另由父核。本包保持6.1 Medium串行，没有子工作者。六行产品 `fb0e27e`；补缺图回退产品 `3b58648`；PC六行像素/保存测试在 `db1e54f`，手机六行返修及320/740入口在 `fb0e27e`；第二手/大数/中断在 `248d73d`。前述六行之间仅清空白及手机技能重复前缀、阿燥已选短句；后续3b58648仅把真实缺英雄图的静态来源回退也接实墙钟等待/事件去重，命令方法保持。精确最终HEAD CI由draft PR核，本文件不预签CI或main。

使用现有六立绘、头像、来源原画及音路；不新增图、音源、视频，不改领域、经济、随机、身份、存档或牌型。七棵保护树逐对象同main，见 [protected-trees.json](protected-trees.json)。新舞台长倍率复用已上线数字摘要，以≈明确近似；精确事件、公式、总分仍原样保存。

## 六行实际操作与结果

以下均为有效当前身份、公开手牌/补牌顺序的受控存档，原UI操作成功保存。并非自然随机获取或整章自然流程。阿燥一层由此前真实两对命令蓄成，谢幕20金为明确受控本金；骰爷原下一手确成三条，老幻用原ChooseRefill回执，未造计分收益。

| 英雄 | 入口和保存事实 | 实际效果 | PC / 手机 |
|---|---|---|---|
| 阿默 | 助攻直达原选组方法；四张两对主手＋K♠K♥副组 | 副组×2，M2→4，380分 | [PC](amo-1366-payoff.png) / [手机](amo-390-payoff.png) |
| 阿燥 | 已有真实一层，原释放选择及出牌确认 | 消耗1层×1.5，M2→3，本手285分 | [PC](azao-1366-payoff.png) / [手机](azao-390-payoff.png) |
| 二响 | 原交棒选8♠及出牌 | 8点普通热度转倍率，M2→10，430分 | [PC](erxiang-1366-payoff.png) / [手机](erxiang-390-payoff.png) |
| 谢幕 | 原燃10金档及出牌 | 金20→10，×2，M2→4，380分 | [PC](xiemu-1366-payoff.png) / [手机](xiemu-390-payoff.png) |
| 老幻 | 原戏法弃1张，候选多看2张，再原确认留1张 | 实际留下A♦；明确不增加计分 | [PC](laohuan-1366-payoff.png) / [手机](laohuan-390-payoff.png) |
| 骰爷 | 弃牌旁“押注换牌”，原押三条/最终确认弃2张 | 下一手三条真实达成×2，M3→6，684分 | [PC](touye-1366-payoff.png) / [手机](touye-390-payoff.png) |

[proof.json](proof.json)列出12行：机会未选needs-selection→合格ready，四种出牌前能力chosen；老幻/骰爷进入原pending/已用状态。未用合法机会即温和4秒边框，不等所有牌选好才提示；低动态静态，弹窗、结算、不可用、已用、后台暂停。阿燥零层、谢幕不足10金、停用身份等负例有定向测试。旧被动身份不新增主动入口。

12行的完整initial/final state、journal、storage与main同输入逐字段相等，每笔事务再次与原applyCommand逐字段相等，存档校验不放宽。原始完整对象在 [PC及原手机报告](native-pc-and-original-phone.json.gz)、[最终手机](native-phone-final.json.gz)、[main基线](native-main-baseline.json.gz)。只读选角预览用于先加载已有头像，再导入有效控制存档；不拿未加载的fallback头像代签六角色画面。

## 每次真实事件与边界

六角色每次舞台实际主体可见1000.7–1016.5ms；以render update的真实墙钟计，不随4倍播放缩成250ms。入场250ms、必要packet100ms及退出180ms分列；新事件rest为0，替代原短impact及额外500ms空等。同一手按真实eventId顺序交接；不同root不被首次/前五手/120秒限制吞掉，回看同事件不重复播或奖励。

[完整边界报告](native-boundaries.json.gz)包含：

- 同一有效局中同两张来源f09/f06连续两手：每手两个真实乘法事件，四个独立舞台均≥1000ms、顺序同trace；PC4倍和手机低动态。第二手图：[PC](multi-1366-1-payoff.png)、[手机](multi-390-1-payoff.png)。回看完整state/journal/storage相等，舞台数仍四个。
- 有效旧身份终场真实f09×1.5，倍率≈2537.3→≈3805.9；[手机实际大数画面](large-390-payoff.png)可读，精确trace不变。不是自然达成终场或概率证明。
- 普通第一手对子无能力选择、无乘法来源，不进英雄高光；普通骰爷×1.15、押注未成×.85和阿燥仅蓄层也由真实命令单测排除。
- 手机在实际特写中快进、390→320缩窗、受控document.hidden/visibilitychange中断：保存先完成，清理后完整tuple与该保存对象相等，无残留舞台。后台一项仅软件信号，不冒称物理切后台。

[320/740六角色入口报告](native-entry-boundaries.json.gz)有12个只读尺寸行及选择态，完整state/journal/storage相等，44px快捷触点/字在范围内。五个可见手机技能提示及阿燥已选短句与目标行间隔8px；阿默沿原姓名/副组工作面和已选按钮，不装作同类主动按钮文案。例：[骰爷320](touye-320-entry.png)、[阿燥短横选择](azao-740-selected.png)、[阿燥已选](azao-390-chosen.png)。容量8/9/14及1280/1366/1920/768、811/812、390/320/740仅有定向矩形断言，实际浏览器本轮用8牌；不能借此签原PC容量实机验收。

## 定向检查与原始失败

最终7文件87项定向及typecheck通过，见对应日志；全仓库最终测试、内容、build及三引擎smoke由精确HEAD CI完成，不重复本地全仓库回归。有限PNG已实际查看；[manifest.json](manifest.json)记录原文件大小/sha256，完整原始报告压缩保存，无长录屏或软件GPU帧率结论。

[original-failures](original-failures)保留：首次遗留closeOpening类型错、测试夹具牌守恒/乱改runId被存档校验拒绝、测试ScoreBeat类型字段错；浏览器观察器不存在字段、阿燥按钮旧正则、低动态destroy先清data导致漏结束值，修正观察器后实墙钟通过；补大数源码时本地Vite重载令观察失败，最终在固定源码重取。手机重复“技能”前缀换行与目标行碰字则是真实视觉FAIL，修短句后8px分离，原PNG保留。没有把这些改成“原来都通过”，没有放松领域、存档或时间断言。

真人观感、设备流畅度、音频听感、自然获得/稳定率、六英雄完整旅程、所有W0–W9仍OPEN。这里是六行当前受控能力、入口和事件的软件工程证据；draft由父独审、协调main，绝不自动代签用户满意或实机通过。


## 冻结后缺图回退返修（父独审f930f4c期间）

只读复核发现所有三个英雄图片key均不可用时，旧静态来源回退仍用scaled tween等待。原f930f4c即使CI绿也不能据此签全部一秒合同。受控textures.exists缺三个key、原来源图片仍可用、PC4倍真实f09事件仅约547ms，是真实表现FAIL；原[报告](original-failures/missing-portrait-fallback-547ms-FAIL.json.gz)与[PNG](original-failures/missing-portrait-fallback-547ms-FAIL.png)保留，不冒称网络自然故障。

产品3b58648只改两处条件：任何已画出的真实payoff/burst来源主体（含旧静态回退）都实墙钟等待并按eventId去重；默认完整英雄路径条件效果相同，不改规则或默认视觉。无heroClimax对象的render update单测也补满一秒。87定向/type再次通过；[原生回退报告](native-missing-portrait-fallback.json.gz)的PC1366和手机390低动态都4倍，实际可见1152.3/1016.7ms，完整final state/journal/storage仍与该保存对象及原applyCommand相等。例：[PC回退](missing-portrait-1366-fallback.png)、[手机回退](missing-portrait-390-fallback.png)。素材缺失本就按原合同降级成可读静态来源，不捏造立绘或色块。

f930f4c冻结已明确撤回并通知父暂不合；新最终HEAD将重新核CI，旧SHA结果与独审不能借签新提交。主路径六行/双端与第二手证据不伪装成此次缺图重取；新增原生只复测上述两项受影响路径。
