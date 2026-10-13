# 结算恢复候选（待父审）

从 main `f23c1fc2389242bacbb8f5d35733f1c344610727` 独立恢复 PR133 `56aa86fcdeeaec75cc496399ad4387de81957325` 的已提交产品底座。旧分支、旧 evidence 和可能未提交工作未改，未声称取回旧线程本地工作。产品冻结 `eb8b4dd04be1290dd1ad247097708f7527155b01`；采集基础HEAD与实际blob映射见 [source.json](source.json)。当前计划文件、domain/application/content/audio、全局heatText、商店、头像、预加载未改。

只新增结算专用 BigInt 万/亿/科学短格式并标“约”，先设实际数字字体再单行适配；完整整数与H/M仍在详情/回看。复用旧完整人物、纸面分隔、来源与1秒运动；没有依不可读原图继续美学重做。31.93亿及2.17亿原图通过当前Library流程解析成功，但官方helper首次和一次明确本地目标重试均 download failed；本地无文件，未实际查看原图，未签依图修复或美学通过。

## 首个父审样板

- [390整屏](sample-native/native-erxiang-390.png)、[完整真实UI动作](sample-native/native-erxiang-390.mp4)、[入场帧](sample-native/native-erxiang-390-entry.png)。
- 二响/无尽13章暖场/同花葫芦是明确受控库存、等级与历史账；原计分器实际得到 **3,441,701,497（约34.42亿）**，不是用户 **3,193,089,021** 原存档或自然重放。原目标12,740,199与下一场19,110,298不改。
- 1×动作全段17.65秒（含原牌局出牌演出），结算运动独立实测1017.8ms；实际英雄未触发，人物不被假标为倍率来源。冷场自身×3，本局同点/同花各手前15场；精确完整链保回看。
- 原UI出牌后完整state与applyCommand相等，journal恰加一笔，IDB current.state相等；回看关闭与冷恢复保存相等。原音路录入短片，未试听或签设备/FPS。

首轮98项定向、typecheck/build通过；追加二响单测与其它视口/边界验收继续，最终精确HEAD CI另核。只供父独立审图/片；无美学签收、无合main/部署。
