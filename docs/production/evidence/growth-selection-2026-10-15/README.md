# 成长牌选牌展示：存量读取与新增成长分开

独立分支 `fix/growth-selection-semantics-20261015`；指定基线 `4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`，产品/测试/观察器提交 `5d4c406b1d1cefbf0dcaf4eb955ca0aebfc63dde`。没有假定此前UNKNOWN任务已启动或有人修复。已读当前AGENTS/DELIVERY_PLAN；workspace/repo没有任务自带.agents/skills（node_modules自带Playwright技能不属仓库执行合同）。不改全局排程，不合main、不部署、不自然试玩。

## 实际问题与实现

`selectionExperience` 原来直接用growthOpportunity决定整张牌的readiness/label；`refreshJokerLabels`随后又被starterSelection的“需要同花”覆盖。结果阿默出葫芦时，越染越深的已存+1倍率实际正常计分，选牌却暗示必须同花。

现在按身份绑定的definition读取真实计分hook条件：本手读取/即时效果/新增成长分别呈现；新增、封顶、成长次数已用、关末或交易资格失效均不关闭已存读取。只有真实读取条件和计分停用能挡本手读取。所选条件仍不预报总分，不读未来牌堆或RNG。

GameScene使用上述本手状态与可容纳的完整短语，手机五槽保“读热+40”等数值；路线起手不覆盖成长牌或计分停用。starterReady/starterLabel仍保留为路线成长事实，避免旧专项观察器接口回退。RouteStarter同花提示明确“可新增成长/不新增成长”，不再称“需要同花”。

## 16张逐一核对

产品按hook推导，下面不是运行时ID白名单。测试锁定当前恰为16张，并对每张核真实PlayHand保存trace中的read值与源存量相等、读取可用、停用独立、查看不写state与隐藏随机流不影响显示。

| ID / 牌 | 本手读取条件 | 新增成长的独立时点 |
|---|---|---|
| a05 熟面孔 | 任意牌型，读取已存热度 | 手后，同型接续 |
| b03 老搭档 | 任意牌型，读取已存倍率 | 手后，同点成组 |
| c04 搭台阶 | 任意牌型，读取已存热度；即时+50另按顺子家族条件 | 手后，顺子家族 |
| c06 越染越深 | 任意牌型，读取已存倍率 | 手后，同花家族 |
| d03 等得住 | 任意牌型，读取已存热度 | 手后，实际留牌数 |
| e05 置办行头 | 任意牌型，读取已存热度 | 成功买其他大丑牌 |
| a06 独家戏 | **两对及以上**才读取系数；对子/高牌不读取 | 每场首次合格异型接续；本场次数与读取分开 |
| c05 换布景 | 任意牌型，下一次实际读取蓄热后消耗；场末清空 | 成功同花弃牌 |
| e06 旧物新用 | 任意牌型，读取已存倍率 | 成功卖其他大丑牌 |
| f05 越说越顺 | 任意牌型，读取已存倍率 | 手后比较实际比分；可能归零 |
| b10 练对子 | 任意牌型，读取已存热度 | 手后，同点成组 |
| d09 回声越来越近 | 任意牌型，读取已存倍率 | 手后，实际额外重触发 |
| e11 长期捧场 | 任意牌型，读取已存系数 | 实际过关，无出售资格；当前身份卖其他牌只影响新增 |
| e12 淘旧摊 | 任意牌型，读取已存热度 | 成功付费刷新 |
| f11 越挫越会 | 任意牌型，读取已存热度 | 手后，实际低比分条件 |
| f12 真正的压轴 | 任意牌型，读取已存系数 | 最后一次出牌实际过关 |

## 实际验证与范围

- [9文件151项针对测试](targeted-tests.log)通过：含16张真实scorer读值、阿默葫芦+1/同花新增、零存量/封顶、接续/已用/售出资格、独家戏对子负例、换布景实际消耗、搭台阶即时+50；既有route-growth-run/score、route-starter、plain-copy与detail-steps保留。
- [构建](build.log)通过（含tsc）；构建时HEAD还是基线、工作树为本次源码，产品字节与5d4c406b一致，不把日志冒称洁净HEAD构建。Vite原有大bundle提示保留。
- [content](content.log)通过；[plan检查与自测](plan.log)通过（32工作包，1有效/13无效夹具）。
- [保护树](protected-trees.json)逐Git对象相同：domain/application/content/platform/public/art/audio/package-lock；数值、规则身份、存档与RNG实现没有修改。
- [最终浏览器报告](browser/report.json)记录精确HEAD `c351a7f4ce3f38ec44a55371c7fe3117833f2cb4`（仅在5d4c406b后增加观察器缓存隔离/启动诊断，产品src逐字节相同）的Chromium151软件Canvas：PC1366×768/DPR1、手机390×740/DPR3。都是明确人工存量/公开手牌、严格checkpoint校验后经正常菜单导入，不是自然获取或自然试玩。
- 双端原生选葫芦/对子/同花、所选条件打开关闭全state/journal/export/IndexedDB完全不变；标签真实bounds不超分配宽/屏幕，5张成长牌不退泛化“状态”入口。PC/手机代表实图已实际view：葫芦c06为“本手倍+1”、手机换布景“读热+40”、独家戏对子“不读取”、停用“计分停用”。
- 双端原生葫芦出牌完整state逐字段同applyCommand，trace读取c06已有+1而不新增；c05真实读40并消耗至0；reload完整保存相同。
- 最终报告保留PC三条/手机两条console 404，pageerror均为0；随后[单PC诊断回放](console-diagnostic.json)记录console.location，三条均为`/favicon.ico`，不是成长逻辑或卡面错误，未改产品补图标。
- 双端另导入严格有效B06当前身份夹具：c06在受限槽位。所选同花显示计分停用，同时新增成长仍可用；实际原生出牌完整state同applyCommand，trace无c06 read-growth，但手后从1增至1.5。计分停用和成长时点保持原规则。

## 真实失败及限制

[first-test-FAIL.log](first-test-FAIL.log)：新夹具错误地向禁用节目模式提交ChooseProgram，另有5个旧期待仍把新增成长当成计分状态；修夹具并把旧期待分别改为读取状态与growth状态，未放宽领域断言。[second-test-FAIL.log](second-test-FAIL.log)保留其中f05存量已为4却期待unmet的遗漏，最后补正为读取ready、成长waiting。

[browser-loader-FAIL.json](browser-loader-FAIL.json)：首轮观察器禁自动依赖扫描却漏显式Phaser预构建，页面未启动；补include:['phaser']，不改产品、超时或断言。[初轮报告](initial-browser/report.json)的native流程通过，但[手机原图](initial-browser/390-fallback.png)暴露三张热度长标签退成“状态”入口；随后加完整短语候选，最终报告严格拒绝该回退。旧记录均保原身份，不覆盖为新PASS。

仅软件与受控保存事实。自然三路线经营、实体手机、玩家理解、美术整体、GPU/帧率和听感均未签；本任务明确未自然试玩。[额外启动超时](browser-cache-startup-FAIL.json)保留：151测试与content/plan检查并发时浏览器尚未进入title，没有页面异常或产品动作；content检查也使用默认Vite缓存，现场只留deps_temp目录，缓存冲突为推断而非产品定案。观察器随后隔离自己的cacheDir并加console/network/启动失败截图诊断，超时和产品断言不变，再顺序执行。main保持不动。GitHub PR查询已实得 `Post "https://api.github.com/graphql": Forbidden`；已准备[PR正文](PR_BODY.md)，提交/push/PR操作和精确远端CI以最终交付回复为准，不以本地通过代签远端CI或PR已创建。
