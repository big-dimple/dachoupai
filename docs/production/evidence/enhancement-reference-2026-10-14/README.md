# 增强与获得入口说明：本批有限证据

基线 main `69f46e47f250ec3ad7bc55ed11f7888326eecf8f`（PR163/164已合）。产品提交 `25bf187018d3820234c831ea50d5a4aec85b3813`，src tree `6f3fa266c186e25756dff95f8d4814bb1dc347aa`。本批只改独立图鉴/手牌详情纯文案与显示、定向检查和证据；唯一总计划没有改动。远端最终review HEAD/CI须按PR实际回执另核，不借基线或产品前序CI签最终HEAD。

## 本次改了什么

原图鉴只有大丑牌/道具/长期道具/牌型四类，没有扑克增强项。现在加入已有七增强的查询资料，并提供“增强怎么获得”入口：即使当前没有持有，也能查全部增强规则。没有新增卡牌、增强、稀有度或星级规则。留声纸保留既有名称与ID，在图鉴及手牌详情加“留牌加倍率”用途；“备用牌”只作生活例子，不是全入口定名或新道具。

图鉴先显示一句用途及例子，“从哪里获得”列真实商店菜单、对应工具、固定自选/随机现货差别、买后库存选牌与消耗。次数、永久损失和原始规则可展开。当前挑战Q10明确禁止获得/使用增强；旧身份没有基础自选时不编造该入口。当前普通局七增强均可通过对应现货工具获得，另有献纸随机路线；不是每店保证出现，也没有运行随机扫描寻找玻璃现货。

手牌详情复用同源短句和例子，并指向按保存局身份读取的图鉴入口。它的共用函数没有run参数，故不在这里假定旧局有新版固定自选。`GameScene.ts`、`ShopScene.ts`、英雄组件未改。39项全局toolInfo与12项itemInfo的完整投影和基线相等；仅独立图鉴覆盖七增强工具的首层文案。证据：[前后文案](copy-before-after.json)、[保护对象及权威源码hash](protected-objects.json)。

## 具体前后实例

以下原文出自对应基线纯函数，不用同名大丑牌推断；完整七项前后正文见JSON。

| 实例 | 原首层 | 新首层/新增说明 |
|---|---|---|
| 玻璃纸 | “玻璃纸：此牌打出且每次有效计分时，倍率×1.5；结算后1/4概率永久破碎” | “玻璃纸 · 加倍但可能碎：打出并计分时倍率×1.5；手后有1/4概率永久破碎。”例子：倍率10→15，手后可能永久碎掉。图鉴明确对应工具“玻璃面”，商店→道具→本店现货，随机出现、不在基础自选；买后库存选1张。 |
| 留声纸 | “留声纸：此牌不打出、有效留在手里时，倍率+1” | “留声纸 · 留牌加倍率：留在手里，每次出牌倍率+1；打出去就不加。”例子：打出一对，把带留声纸的另一张当备用牌留在手里，本手+1。对应工具“留个声”，现货买后库存选1–2张。 |
| 金纸 | “金纸：此牌有效留在手中过关+1金，每场最多5金” | “过关那手留在手里，每张+1金；每场最多5金。”例子：有效留两张得2金，没过关不发。明确不读后补的新牌。 |
| 返场纸 | “返场纸：选中计分牌额外计分1次” | “打出并计分时，这张牌再计分1次。”展开说明额外一次不再递归触发，与丑牌额外计分共用每张4次上限。 |

所有增强成功赋予后持续保留，不是每手重买工具。每张只占一个增强层，覆盖原增强会永久失去旧效果，独立版次保留。获取价格沿原toolInfo/r2Shop，购买费与使用费分开：七个直接赋予工具使用不另付金币、成功消耗1件；献纸永久牺牲1张，给1–2张未增强牌，每张各有1/7概率得到指定某一种，不能指定结果。没有调整价/池/推荐/算法。

## 权威规则来源

链接固定在基线SHA；[hash清单](protected-objects.json)证明这些执行来源本批逐对象未变。

- [工具T12/T13及目标/价格](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/content/r2-tools.json#L560)、[献纸权重与牺牲](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/content/r2-tools.json#L1405)、[七增强效果/重复/风险](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/content/r2-tools.json#L1904)。
- [实际能力开放与模式禁用](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/domain/r2ToolRuntime.ts)、[按合法目标筛选现货候选](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/domain/r2Shop.ts#L66)、[基础自选ID及身份门控](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/domain/r2GroupUpgrade.ts#L64)。不能只拿JSON的initialSupported列表认定玻璃未开放；实际runtime已启用增强能力。
- [成功赋予/工具消耗](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/domain/r2ToolCommands.ts#L96)、[有效留牌排除打出/助攻/失效](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/domain/scoreR2.ts#L180)、[普通/额外/留牌增强时钟](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/domain/scoreR2.ts#L233)。
- [玻璃仅对实际计分原牌手后判一次，未过关也判](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/domain/scoreR2.ts#L415)、[金纸读取成功手的实际留牌快照](https://github.com/big-dimple/dachoupai/blob/69f46e47f250ec3ad7bc55ed11f7888326eecf8f/src/domain/r2Run.ts#L477)。

## PC/390实际局部操作

本地Chromium、Canvas、DPR1；1366×768鼠标、390×844仿真触屏点按/长按。详情正文需要时由浏览器DOM滚动至可读区域；不是物理手机滑动或真人理解测试。前后各从正常菜单建二响成组局到首店，固定一次本地种子，无自然玩法续跑/买用/扫描。

最终产品在clean源码 `25bf1870…` 上渲染，build时间 `2026-10-14T00:22:29.683Z`、内容 `quality-r2-bounded-clear-v1 / json-fnv-v1:7f60ad479f68b033`；基线也独立记录真实build身份。每端42条观察记录：菜单→图鉴→增强入口、按名字查玻璃/留声/金纸/返场/幸运、详情用途/例子/三段获得方式、展开规则、返回保留查询、玻璃面原价格/消耗完整规则。每次查看返回后完整state/journal/IDB/localStorage相等，dispatch调用0。完整初终和字体/文本边界、全部原图hash在 [after/report.json](after/report.json)；对应基线见 [before/report.json](before/report.json)。

首次打开原菜单会写既有 `dachoupai-fullscreen-hint-v1=true`。报告把正常新局、开菜单后及图鉴关闭后的快照分开：菜单前后state/journal/IDB仍完全相等；图鉴阶段完整localStorage也保持。没有为过断言改产品或偷偷排除此偏好。

另用每端同一validator通过的受控增强手牌checkpoint，实际长按玻璃/留声牌、展开规则、关闭，完整保存不变，dispatch为0。它只是增强牌显示样本，不是自然买到、实际赋予或实际计分触发证据。

可直接核读的原尺寸图：

| 局部 | 原基线 | 最终产品 |
|---|---|---|
| PC 玻璃现货规则→增强获得入口 | [原玻璃面详情](before/1366-玻璃面-old-detail.png) | [玻璃增强用途/获得](after/1366-玻璃牌-purpose.png)、[完整规则](after/1366-玻璃牌-rules.png) |
| 390 玻璃获得入口 | [原玻璃面详情](before/390-玻璃面-old-detail.png) | [随机现货/库存选牌/牺牲路线](after/390-玻璃牌-acquisition-1.png) |
| 390 留声生活例子 | [原留个声详情](before/390-留个声-old-detail.png) | [用途与备用牌例子](after/390-留声纸-purpose.png)、[每手一次/失效与助攻限制滚动实图](rule-scroll/390-留声纸-rule-tail.png) |
| PC 长按玻璃手牌详情 | [原首层](before/1366-glass-card-purpose.png) | [新首层](after/1366-glass-card-purpose.png)、[新例子及入口](after/1366-glass-card-rules.png) |
| 390 长按留声手牌详情 | [原首层](before/390-voice-card-purpose.png) | [新首层](after/390-voice-card-purpose.png)、[新完整说明](after/390-voice-card-rules.png) |

上述PC/390用途和入口图已实际查看像素。首轮手机“已展开”图只显示规则开头，没有显示下方次数与费用，因此不能用它们证明完整规则可读；原图保留，不删失败或倒写验收。

补充实际滚动证据在 [rule-scroll/report.json](rule-scroll/report.json)，渲染review `021858f8df5c2ec3959822acdbb51f6ece8308e5`、clean、同一src tree。两端各3条真实查询/展开/浏览器滚轮滚动，将玻璃每原牌一次/失败手仍判、留声每手一次、玻璃面5金与消费1件的段落滚入可见区；关键短语逐行Range边界均在滚动窗口内，完整state/journal/IDB/localStorage相等。已实际查看 [390玻璃规则](rule-scroll/390-玻璃牌-rule-tail.png)、[390留声次数](rule-scroll/390-留声纸-rule-tail.png)、[390玻璃费用/覆盖代价](rule-scroll/390-玻璃面-rule-tail.png) 原尺寸像素；PC对应图亦归档。可从仓库根运行 [补充观察器](rule-scroll-observer.mjs)，它不改产品/规则。这里只签这些可读段落，不签整屏美学或完整体验。

## 针对性检查与保留的失败

- [typecheck](checks/typecheck.log)、[定向113项/4文件](checks/targeted.log)：catalog、tool-info、enhancement-tools、实际score时钟；[最终clean build](checks/build-final-clean.log)通过。早期build记录在 [build.log](checks/build.log)，不当作clean产品身份。
- 新增两项图鉴合同检查只核live持久牌组计数不读抽牌顺序，以及旧身份/当前固定自选/Q10禁用入口区别。计分与赋予规则使用既有测试，不复制另一套规则。
- [第一次旧夹具期待FAIL](failures/old-fixture-expectation.log)：group-upgrade旧身份无基础自选，新测试却期待当前入口；改测试为正常新身份，并保旧身份负例，产品没有改门控。
- [第一次观察器FAIL](failures/observer-no-controller-send/report.json)：SavedRun接口是dispatch，观察器误找send，未进入图鉴。修观察器，不改产品。
- [首开菜单偏好观察FAIL](failures/first-menu-preference-observer/report.json)：按上方三阶段快照纠正观察合同；原FAIL及图保留。基线同因的旧图另外保存于failures。
- [保护对象](protected-objects.json)：domain/content/application/platform/audio/public/art/依赖/工作流/禁止场景与英雄组件/AGENTS/总计划逐对象和基线相同。没有共享文件冲突，没有main推送/合并或部署。

七增强与对应七工具事实足够而修；其余32工具、12长期道具和同名丑牌文案保持，不按名字猜用途。七增强全量静态说明/旧计分规则已核，但本批原生详情只覆盖玻璃、留声、金纸、返场、幸运及玻璃面；热度/倍率增强仅查询列表与静态投影，不借五项代签七项全体验。实际增强购买/赋予/触发、全部39工具的完整路径、玩家是否看懂、自然获得率、真机/听感/整体游戏仍未由本批验收。不重跑18局，不迁移旧档。
