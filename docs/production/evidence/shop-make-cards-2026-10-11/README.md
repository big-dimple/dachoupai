# 商店做牌主入口：有界 UI 批次

输入产品 main `e7ba47805f35590439dbf5d710ec8daba650299a`（C2与推荐已联合合入）；父随后合入 `89484f46f392cb26a6f7358bcb31ab730d71a995`，只有唯一计划文档变化，产品相同。本包在 `feat/shop-card-workbench` 独立实现。父最新授权覆盖旧计划条目“待18局”的等待条件，不替dot自然试玩，不扩规则。唯一计划由另一任务维护，本包只回交验收段。

## 范围与实际结果

PC将原库存侧入口整合为朱红“做牌 · 库存N”，保留原库存提醒；手机将原“购买道具”分类位变为朱红“做牌”，库存辅助查看位置保留，不新添一排购买按钮。新工作面复用实际库存、每店自选、现货、报价及原购买资格。同名现货只有一个选购座位，按真实现货报价/资格确认；基础自选额度与现货额度保持原规则。

PC左右同时显示库存与选购，在1366×768本工程九项自选全部首屏可见，无强制翻页。手机390×740用“已有工具/选购工具”分区和双列纸卡滚动；复用既有手绘工具图片、中文字与纸墨色，不添资产。金币、库存、2金改牌/4金染色及资格可见；没有按路线锁工具。

从做牌购入明确点击“购买并选目标”后，购买单独保存，直接进入原目标选择，保留实际付款与“未使用”提示。已有库存直接接原选择。提交前取消购买零写；购后取消目标保留付过款的库存，返回做牌；再次打开空草稿。确认使用或“替换增强”才消费，保留原完整预览与不可逆覆盖损失。保存后保留原实际牌面结果，接“继续做牌”，不重放购买/消费。

只在这条做牌路径将原目标面提前，将原插图/用途折叠保留到“工具卡与用途”；节点只在打开时移动，选择时不重建目标面、不跳顶，原筛选/排序/目标顺序与工具资格保持。PC原前后预览并列，手机原“选择对象/变化与代价”与固定覆盖风险、确认区保持。普通道具箱路径未改。

确认后正在提交时已不能取消那笔操作：本工作面锁返回并拦Esc，显示“保存中 · 请稍候”；原存储候选/重试协议不变。失败仅保存一个临时UI接续在Phaser registry，恢复时必须同run、下一序号、最后保存命令完整匹配。恢复购买显示实际付款/未使用并接目标；恢复消费显示原成功前后结果。该UI接续不入存档，不能自动消费；浏览器重载会丢掉临时接续，保存状态仍以原协议恢复，未冒称刷新后也自动重新打开结果弹层。

## 原生受控验收

[修前实际记录](before/report.json.gz)、[最终实际记录](after/report.json.gz)、[字节与保护范围](checks.json)。软件Chromium/Canvas、DPR1、PC真实鼠标与390真实触控。公开工程检查点经正式makeCheckpoint/readCheckpoint验证后，由真实菜单导入独立浏览器context；金币30、一个既有T08、合法现货T10、可覆盖增强牌用于固定反例。非自然获取、用户存档或长期策略样本。

每端完整执行：找到做牌→取消购买→一次BuyBasicTool真实购入→目标→覆盖提示→取消保留→再打开→明确替换并消费→实际结果→继续做牌→既有T08选两张/取消/再打开/确认消费→同名现货BuyOffer→付款后取消仍保留→库存直接确认使用→实际结果。每端2笔购买、3笔消费，双端共10笔持久化命令；每个完整state与原领域命令oracle相等、IDB.current.state相等，journal对应计数正确。

每端购买与消费各持有真实storage.commit，重复点击与Esc不会新增尝试或关闭在途确认，完整旧state/journal/storage不变；真实QuotaExceededError暂停，原生菜单重试原候选一次后恢复目标或实际消费结果。共4条真实失败保护链。末尾另导入工程初态并实际lease.drop：选购全部禁用，既有工具仍可检查，确认原生disabled；实际点击/取消0commit、完整保存不变，双端2条只读链。交易最终状态与只读检查态分列记录，不把重新导入初态称为交易最终状态。

实际选择涵盖低位置牌与连续两选；每次选择前后所有原工作面/目录scrollTop逐值相等。本包未写ConsumableDialog/ToolChangePreview/SavedToolResult/OwnedJokerInput/ShopLayout/GameScene/推荐/C2代码、domain/content/application/platform/audio/public，原滚动、拖拽、评分/价格/供给/规则/存档协议与阿默保持。[8文件64定向](targeted-tests.txt)、[build含typecheck](build.txt)、diff-check通过；未重跑未变全套本地测试或自然18局。源码/index/HEAD每次原生运行冻结；最终产品三个文件与checks.json的已测字节一致，证据与文档对齐提交不改变产品。

| 实际整屏 | 修前 | 最终 |
|---|---|---|
| PC商店主入口 | [商店](before/1366-table.png) | [商店](after/1366-table.png) |
| 手机商店主入口 | [商店](before/390-table.png) | [商店](after/390-table.png) |
| PC选购 | [原基础板](before/1366-basic-before.png) | [九项展开](after/1366-hub-purchase.png) |
| 手机选购/库存 | [原基础板](before/390-basic-before.png) | [选购](after/390-hub-purchase.png) / [已有](after/390-hub-owned.png) |
| 手机目标首屏 | [原库存选择](before/390-target-before.png) | [付款已恢复、目标前置](after/390-purchase-restored-selector.png) |
| 明确覆盖 | 原规则保持 | [PC](after/1366-overwrite-preview.png) / [手机](after/390-overwrite-preview.png) |
| 已保存真实结果 | 原组件复用 | [PC](after/1366-consume-restored-result.png) / [手机](after/390-consume-restored-result.png) |
| 连续用库存 | 原规则保持 | [PC两选预览](after/1366-continuous-owned-preview.png) / [手机两选预览](after/390-continuous-owned-preview.png) |
| 现货接目标/实际使用 | 原BuyOffer/UseConsumable | [手机已购未用](after/390-stock-purchased-selector.png) / [实际使用](after/390-stock-used-result.png) |
| 保存/只读 | 原协议保持 | [PC购买中](after/1366-purchase-saving.png) / [手机消费中](after/390-consume-saving.png) / [手机只读](after/390-readonly-preview.png) |

关键整屏已逐张实际读取，包括主入口、PC九项/手机分区、购后目标、覆盖固定提示、保存后结果；不能用几何断言/CI替代目测。本包有限纸墨样板通过自审，真人理解、物理设备/听感/整体美术仍未签收。

## 保留的失败与边界

首单元夹具给getter resultReduced直接赋值导致2项FAIL，改为仅在测试实例定义值；[原记录](failures/test-fixture-getter.txt)保留。首原生夹具把当前身份T10现货价写4金，被正式存档校验拒绝；改为真实身份价2金；[原价格拒绝](failures/native-fixture-price.txt)保留。直接改尚未离开初始开局的工程状态被opening-state校验拒绝，改用合法RerollShop后的公开工程检查点，[原开局拒绝](failures/native-opening-fixture.txt)保留，未改校验或价格规则。

首观察器以“正在保存…”唯一定位，实际主按钮和锁住的返回同时显示忙，严格模式FAIL；[原报告](failures/observer-double-busy.json.gz)保留，改为定位实际aria-busy主按钮，原提交/取消/存档断言不放宽。首版[PC样板](failures/1366-first-hub.png)暴露通用弹层宽度覆盖局部宽度，以及合法空reason吞掉现货价格，已局部修正。之后[行为PASS归档](failures/behavior-before-target-front.json.gz)仍有[手机购后目标靠下](failures/390-target-below-fold.png)，自审判首屏未达目标并前置原目标节点，最终再核双端链通过。未拿先绿行为代签后续图面。

未验：18自然局、真机/其它浏览器/GPU/音频、所有工具/旧身份/模式矩阵、全部拖拽原生旅程及真人理解。原拖拽/布局组件字节保持且相关布局检查通过，不借此宣称全部拖拽重新原生验收。随机揭晓工具、商店额外使用费用等仍走原组件/规则，本工程实际消费是T11/T08/T10，不代签全工具矩阵。最终精确HEAD CI与draft PR按交付回复/PR描述单独登记；父审核后决定合并，本代理不合main、不部署。

## 写入窗口与待登记短段

新增MakeCardsDialog.ts为本地实际库存/报价工作面；ShopScene.ts仅import、PC原库存入口、手机原工具分类、448起做牌接续/取消、507起原基础购买可选接续、727起现货购买可选接续、send原失败/成功UI结果窗口；style.css只.make-cards-*局部样式。父授权目标/预览组件窗口未被本包重写。最新父文档合入只正常对齐，不自行修改唯一计划。

待登记：e7产品基线商店前置做牌候选完成，PC九项/库存展开与390分区手绘样板；两端真实基础购入、现货购入、三次明确消费、覆盖/取消/再打开/连续使用、购买/消费各一次失败恢复及真实失租0写通过，完整state/journal/IDB同原命令，原失败与首屏返修保留；64定向/build通过。仅工作面与ShopScene局部接线/样式，不改价格/供给/规则/存档/阿默/C2及唯一计划；draft/精确HEAD CI由交付登记，未合并部署，真人与自然18局仍另核。
