# Astra 三项开发集成候选（2026-10-15）

分支 `dev/astra-integration-20261015`，共同基线 `4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`。本批仅正常合并以下三个指定来源，保留原祖先，无cherry-pick、强推或main合并。合并源码冻结点 `b9c48bb828e6a5f0402f3535184792198cf3aa4e`；证据提交只增加本目录。

| 来源 | 精确输入SHA | 正常merge提交 |
|---|---|---|
| 成长牌存量/新增区分及短倍率 | 7f56c8656db40c5fb051401bf68c58faaae992eb | fc439b50e540f2b3c6f98946c84c1954e2ae8587 |
| 升级基础热度/倍率展示 | 3db8b777a2b7e213f912fa9f980890c363c5b042 | c7c44ab2f7fc8e37affcd6a87fc92c70fc9044bb |
| 主动技能提醒/年轻成年群像后续计划 | cf430c845c5edde8dca437e68db190ef3ea145c6 | b9c48bb828e6a5f0402f3535184792198cf3aa4e |

## 来源与公共文件

[provenance.json](provenance.json)逐文件核对：最终差异恰为三来源差异的并集，每个来源文件在合并后逐Git对象相同。三项没有文本冲突，无人工改写来源。成长的GameScene/JokerExperience/JokerMemory/RouteStarter与升级的ShopScene/ShopPracticeService文件不交叉；升级新增的CSS仅作用于服务确认和升级结果，不改变成长卡短标签。DELIVERY_PLAN保持cf430c84原文，提醒与美术仍是后续计划，没有在本轮实施。

领域、application、content、platform、public、art、scoreText、package-lock、src/main.ts、.github与共同基线逐树相同。计分、保存、RNG、资源、renderer与CI timeout未改。

## 同版集成检查

所有新检查都在上述合并源码完成；源码/测试/观察器开始时干净，检查后仍无改动。没有重做自然试玩。

- [针对测试](tests.txt)：19文件243项通过，覆盖两包相关接口、16成长牌、短系数、路线读取、升级报价/receipt/共享次数与既有培养入口。
- [typecheck](typecheck.txt)、[build](build.txt)、[content](content.txt)、[32包计划检查](plan.txt)通过；原Vite大bundle警告保留。未以针对检查冒称全量CI或性能验收。
- [成长双端报告](growth/report.json)：1366×768/DPR1、390×740/DPR3，严格checkpoint原生导入、选葫芦/对子/同花、详情开关、真实受控出牌、冷恢复与受限槽位；完整state/journal/export/IndexedDB与原命令对照，越染越深读取已有+1、换布景读取后消耗、计分停用与新增独立。两端PASS，pageerror/network error均0，源码指纹前后一致。两张葫芦整屏图已实际查看。
- [升级15例报告](practice/report.json)：1366×768、390×844、320×568、390×568、844×300，group/straight/flush三路线。基础热度/倍率前后值、报价/已保存结果、文字滚动可达、44px按钮、取消、延迟双击、注入保存配额失败及固定候选重试、返回、刷新与冷恢复均PASS。每次原生升级完整state/journal/storage与领域命令对照；原始全量对象见[压缩报告](practice/full-state-journal-storage.json.gz)。
- 已实际view成长PC/390葫芦、升级PC确认、390×844已保存、320×568确认、390×568失败菜单、844×300已保存共七张整屏。短横正文仍按容器滚动，操作保持固定；全部本次截图随报告保留。软件Canvas/模拟触摸不等于实体手机或GPU验收。
- 独家戏1587/800、36501/16000及封顶的六窗口像素独审已获父限定通过；源码逐字节保留，本次不重复该独审。既有证据按[原来源SHA](../growth-selection-2026-10-15/coefficient-width/README.md)读取，不冒称为本次重新截图。

## 待追加分支快照

[远端分支快照](remote-branches.txt)与[待接入来源清单](pending-branches.json)只用于后续衔接，本批均未合入、未独立签收：

- `fix/shop-upgrade-base-stats-20261015` 已到 `3782da11788bcedf7722db09958715ba417039e5`，在指定3db8b777之上多了诊断de82cf40与软件WebGL→Canvas修复3782da11，涉及renderer与诊断workflow；按父指令留在原性能线程，等待后续明确追加。
- `dev/joker-drag-audit-20261015` 为 `b276b07e7b84880e0aa313251da8a0db874faf38`，同共同基线；包含OwnedJokerInput/Haptics及相关测试/受控证据，等待后续独审及接入指令。
- `dev/recommendation-cost-lifetime-contract-20261015` 为 `00b1d7285b310e24752ad65d6fb68a3cb1eda6de`，同共同基线；为analysis/测试/证据及DELIVERY_PLAN，后续接入需重点核公共计划内容，不在本轮擅自合并。

没有重试此前Forbidden的PR，没有改main或部署。远端最终SHA由交付回复核对；当前远端CI未确认，旧CI不代签本次。原各来源失败记录完整保留；本轮针对检查未出现产品失败。性能、实体设备、自然经营和整体验收仍未签。

## 恢复后的第二批追加

从6dfc2a63继续正常合入交易、拖拽、字幕，随后按追加授权合入软件renderer性能分支及技能提醒；精确来源、新HEAD检查、原失败和动态缩窗未修项见[第二批回执](wave2/README.md)。上文三项及待接入快照保留为其原时间点历史，不冒称本轮仍未接入。

## 第三批追加

从38885330继续合入动态触控、S04及B05完整历史，含高DPR控件/触控复核、来源去重、两份观察器FAIL及CI访问阻塞，见[第三批回执](wave3/README.md)。既有报告仍按各自SHA保留。
