# B05 首遇：认招、较劲与真实回执

独立分支 feat/b05-first-encounter-20261016；基线 main0621156b，产品 e42c500be07eeb503e47921d5fcd5630971842bf，浏览器头46185151b8bd5e7cb373b91ae6e7cf4fa0251067，src tree75b34fa3e323016d1febad96d96fd5280e1de4a3。本批仅开发候选，未合main、不查CI/域名。唯一当前计划仍为DELIVERY_PLAN当前节；本批是P08的B05有限呈现增量，不解锁完整C04。

新增桌上持续挑战区：回音墙身份、目标/当前热度/余手、首手例外或已认牌型，以及44px“看招 / 应对”入口。选牌时现有标题直接区分首手正常、同型基础½、换型基础正常；只认当前公开牌型，不预报得分，也不自动出牌。入场缩成叫阵、两行限制和目标；真实减半/换招/胜败沿原队列呈现，增加简短回执和区别层级。复用既有纸面与牌面，没有新图、冒用玩家脸、放大眼图或脏曲线。

共享GameScene只改import、renderSelectedCards空台区调用、previewSelection标题，共3处。完整presentTrace方法与main0621156b逐字节相等，真实事件/高光排队未改；OpponentFacts未改。FailureSummary/IntermissionScene、HeroClimax/ScoreLanding、领域/内容/价格/目标/RNG/保存、音频、商店移动布局、技能提醒及public/art原图均保持，见source-proof.json。

30项相关测试（5文件）、TypeScript/生产构建通过。最终14例原生浏览器全部PASS，无pageerror：普通资源首遇；1366/390/320的入场取消、同型与换型实际PlayHand；390低动态/快进/回看/旋转、退出继续、胜败。目标、手数、真实35→17.5减半与实际43/31分沿已存事件核对；查看/选牌/取消/回看/旋转/冷恢复保持完整state、journal、IndexedDB，实际出牌只提交一次。最终完整快照见native.json.gz，简表见native-summary.json。

普通资源首遇种子growth-current-59：初始6金，56条合法命令过8场到第3章B05；原状态重放完整相等、生产checkpoint校验通过。前置只用当时公开手牌/牌型等级/实际现货与报价作选择，无评分预览、未来牌/RNG读取、资源/目标/牌序植入。浏览器通过生产文件选择器导入该入口，覆盖叫阵、取消/再进、短横/短竖旋转、应对选牌、真实首手和冷恢复；不称全程原生8场或自然获取率。ordinary-route-ledger保留10次快速尝试，另保留最初4次慢探针，包括失败、未遇B05及其它结局；不以选中遇敌种子签平衡。

已实际查看ordinary-entry、ordinary-rotated-740/320、ordinary-selected、390-repeat-saved、320-changed-selected、390-changed-key、390-won-opponent：层级、目标/当前热度/余手、限制及选择后的牌面可读；结算后125/3600、余3手及再出对子基础½正确；换型反应发生在实分落定画面。截图仅签所见软件画面，不能代签真人理解、人物表演、眼神或真机审美。

保留原失败：Vite SSR夹具加载60秒transport timeout，改为已安装esbuild静态夹具＋E2E构建预览，产品不变。首轮浏览器在390冷恢复把首页和菜单“继续本局”宽泛匹配为两个元素；保留完整报告/图，只改观察器为原生首页继续，并等发牌稳定后截图。最终整轮14例重新通过，没有删失败或放宽断言。

**素材依赖仍待交付：B05专属人物及匹配的独立眼神图。** 当前只有可玩的状态/时序/交互与文字人格层，不能称完整挑战者人物镜头或眼神高光完成。已有六英雄原图没有拿来冒名；没有启动新图生产。DPR1本地Chromium软件检查，真人理解、850/900ms读懂与节奏、物理手机/GPU、声音、自然平衡仍分项待验。P08仍in_progress。

重跑：node harness/b05-ordinary-route.mjs（保留所有尝试）；B05_ORDINARY_ENTRY指向其ordinary-entry.json、B05_OUTPUT指向新的shots目录，node harness/b05-opponent.mjs。harness使用esbuild夹具和mode=e2e构建预览；所有操作走原生触控/鼠标/DOM，不私调产品命令。单测命令及构建结果见unit-results.json.gz/build.txt；产品哈希与源码边界见source-proof.json。
