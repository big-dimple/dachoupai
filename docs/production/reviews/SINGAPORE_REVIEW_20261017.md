# 新加坡批次综合评审 · 2026-10-17

被测产品为 `7d7921e76ca794a14e715e3eac3b4d66143862ff`，比较基线为 `ba49d4536a21c647a6710b047053def874d29ace`。本次是评审与整改排程，**没有修产品、改测试断言、push main、查询 CI 或管理部署/域名**。独立文档分支为 `docs/review-singapore-20261017`；[整改计划](REMEDIATION_PLAN_20261017.md)全部待实施，P08 继续 `in_progress`，没有整体完成率。

原作者[交付说明](../evidence/cards-bgm-tangsong-refresh-2026-10-17/README.md)及[原状态](../evidence/cards-bgm-tangsong-refresh-2026-10-17/status.json)原样保留。其“100%圆满”“全平台”“无缝切换”等结论不能覆盖本报告中的实际失败或未验范围。原入口文字保存在[历史快照](../history/DELIVERY_PLAN-current-before-singapore-review-20261017.md)。

## 证据等级与检查范围

- **本地实测**：系统 Chromium 151.0.7922.173、Phaser Canvas renderer(type=1)、`--disable-gpu`；390×740/DPR2/touch、740×320/DPR2/touch、1366×900/DPR1。真实 UI 点击/触摸、DOM 弹窗、屏幕截图、状态/错误只读观察。另有明确标为组件探针或独立 reducer 的最小定位，未冒充自然取得。
- **静态综合**：音频、资源、规则表、展示名遗漏、联动语义与同属性动画双写来自本批并行评审汇总及源码核对；这些项没有由本地浏览器替代听觉/自然经营/暖缓存实测。
- **线上未跑**：指定域名和公开 build-info 均遇代理隧道拒绝。未取得线上版本，也未完成用户要求的一次线上自然局。
- **非本轮签收**：真人理解/趣味、物理手机/GPU、耳机/扬声器听感、完整自然失败/通关、晚期/无尽。没有扩成18路线或长局。

已读仓库 AGENTS、ENGINEERING、QUALITY、UX 和当前计划入口；环境 `.agents`/`.codex` 为空，仓库无这两个技能目录。沿用已安装 lockfile 依赖，未另装依赖。所有原始证据见[证据索引](../evidence/singapore-review-2026-10-17/README.md)，截图实际查看过，不只按尺寸或脚本退出码判断。

## 用户追加反馈与明确交互要求

本地评审后，用户明确反馈“AI切灰掉”“两个稍后开战且退出本局”“重开无声”。AI灰色与本地R02一致；稍后开战返回选角符合当前false取消路径风险，但本轮没有再访问线上复现；重开无声是用户实际反馈，不能写成评审者已试听。要求保留章节目录创意，**稍后开战只关闭目录、留在当前局**；去掉小金鱼；底栏按“弃牌—理牌三块—出牌”，技能单独位置；出牌时若有可用技能自动提醒。GameScene:1616–1619及HeroPlayReminder已存在提醒机制，后续先核是否满足新要求，再局部修补，不重搭系统。全部纳入待实施计划，本次未改产品。

## 本地确认的缺陷

|ID/优先级|精确责任位置|复现、结果与边界|原始证据|
|---|---|---|---|
|R01 / P1|`BlindSelectPresentation.ts:460–472,546–558`；`IntermissionScene.ts:79,123–128`；`GameScene.ts:326–328`|苏轼普通新局→商店本章节目→跳过暖场。SkipStage 成功后 `stage-cleared/seq2/stageIndex1`，结算 `identity.isBoss` 抛错、活跃场景为空。入场折页跳过则 `seq3`，同错误并回选角。传 `{result:{...}}` 与裸 IntermissionResult 契约冲突；关闭 resolve(false) 又进入原取消分支。**成功后的 stage 非空，不能误写空引用根因。** 正场处理同构但未实际点正场。|[状态与栈](../evidence/singapore-review-2026-10-17/flow-report.json)、[商店后](../evidence/singapore-review-2026-10-17/skip-shop-after.png)、[入场后](../evidence/singapore-review-2026-10-17/skip-intro-after.png)|
|R02 / P1|`GameScene.ts:925,1096–1117,1015–1016`；`r2RouteGrowthJokers.ts:44`；`scoreR2.ts:146–148`|definitions.name 展示映射后的完整数组 stableHash 不再识别成长规则身份。最小同手原定义 profile=true、预览24；映射后 profile=false，抛 `invalid-route-growth-snapshot`。真实正常新局 AI candidate 为 unsupported，AI主手按钮不可用；普通牌型事实仍能认对子、实际出牌仍270。**预览拒绝已证，实际错算分数未证。**|[独立定位](../evidence/singapore-review-2026-10-17/minimal-domain-report.json)、[原日志](../evidence/singapore-review-2026-10-17/minimal-domain.log)、[真实选牌](../evidence/singapore-review-2026-10-17/score-short-selected.png)|
|R03 / P1短横|`CardArtZoomModal.ts:18–28,76–95,108–112`|740×320 商品详情点图：弹窗 x129/y−50/w482/h290，标题 y−28.5、关闭 y−37/h44（仅底7px在视口）。615×768图被显示为360×149横条，cover裁切；body scrollHeight≈clientHeight≈180，滚轮不能找回。模拟 safe-top24/bottom20 仍 y−37。|[实际截图](../evidence/singapore-review-2026-10-17/short-zoom.png)、[滚动后](../evidence/singapore-review-2026-10-17/short-zoom-after-scroll.png)、[三档测量](../evidence/singapore-review-2026-10-17/browser-report.json)、[安全区](../evidence/singapore-review-2026-10-17/fresh-fault-report.json)|
|R04 / P2|`DetailDialog.ts:81–84`|72注册卡逐项组件入口呈现缩略图；71项有onclick，a11版本化 `a11-v2-*` 路径不匹配正则。徽标存在、onclick=false、点击后zoomCount=0。不是自然商店遇到a11的证据。|[a11截图](../evidence/singapore-review-2026-10-17/pc-a11-no-zoom-handler.png)、browser-report pc.cardResults/a11ClickZoomCount|
|R05 / P2|`CardArtZoomModal.ts:99–106,248–261`|高清失败只剩blur(8px)的128×160缩略图，提示“保留原图”，无重试；新页面把b04缩略和高清同时拦截，naturalWidth均0，仍同提示。第一轮双失败探针命中缓存缩略图的原结果保留，**以fresh案为双失败证据**。|[高清失败](../evidence/singapore-review-2026-10-17/phone-zoom-detail-failed.png)、[双失败](../evidence/singapore-review-2026-10-17/phone-zoom-both-failed-fresh.png)、[异步原记录](../evidence/singapore-review-2026-10-17/async-report.json)|
|R06 / P2|`DetailDialog.ts:80–84`|放大入口为FIGURE、tabIndex−1，无role/keydown或等价按钮，键盘不能触发。未把原生dialog可将焦点暂移浏览器chrome的行为误报成穿透。|browser-report figureAccessibility；async-report focus|
|R07 / P3|`CardArtZoomModal.ts:273,278–283`|页脚写“点击任意处返回”，点图片/页脚都不关；只有backdrop/×/ESC关。首次详情徽标CSS又要等第一次放大才注入，初次入口样式不一致。|browser-report imageClickStillOpen/footerClickStillOpen；[首次详情](../evidence/singapore-review-2026-10-17/phone-detail.png)|

## 静态综合发现（没有冒充新的浏览器实测）

|ID/优先级|责任文件与发现|需要解决的差距|
|---|---|---|
|S01 / P2|`GameScene.ts` illuminateCard（1679起）、focusSource 及其调用|新punch与已有focusSource同时写卡容器y/scale/angle，void动画与finally复位可相互覆盖。当前impact截图能展示单手，并不排除快进/resize/abort的竞争；必须在R02数据隔离后由同一GameScene负责人串行处理。|
|S02 / P2|`DetailDialog.ts` 卡图容器及CardArtZoomModal|图审指出a11纵向cover约裁16%；修显式id同时改contain完整展示，保留完整构图。该百分比来自静态图审，不是本浏览器新增测量。|
|S03 / P2|`AudioEngine.ts:348–391`、`mixPolicy.ts:18–22`、`AudioEngine.ts:416`|单媒体元素直接改src形成硬切；loop=true令自然ended轮换逻辑不成立；pending play期间换曲可能因musicTask未清而漏补播；chainRate上到2但底层rate封顶1.4；一个曲目的onerror设置全局musicFailed会封死后续BGM。这里是生命周期/代码问题，未试听。|
|S04 / P2|`ShopSynergy.ts`、`ShopScene.ts`|关键词相同不等于条件兼容；e08要求≥20金，f04要求≤3金却能被经济关键词标成协同，应解释互斥/前提，不能以共享词替代实际条件。|
|S05 / P2|`BlindSelectPresentation.ts`、`ShopScene.inspectChapter`、`OpponentPresentation.ts`|三联折页替换后需恢复挑战、封角、节目单上下文，以及跳场确认/ready/expectedSeq/失败重试；视觉折页不应丢掉原信息与交易约束。R01暖场失败是实测，其他模式信息缺口属于静态综合。|
|S06 / P2|`tangsongCardNames.ts`及收据/比较/条件/实际事件/成长/回看相关展示模块|72字典存在不等于全部显示已替换；真实购买说明仍出现“满堂彩”等旧名。需要只在显示边界按id映射，不回写领域定义、hash或存档。|
|S07 / P2|`HanddrawnArt.ts`、资源manifest、资源派生脚本|144个运行时文件存在、尺寸与预算事实可保留；同URL替换sha存在暖缓存旧图风险，sourceCommit等来源字段仍指旧来源，需可追溯修正。不能靠修改manifest声明便签暖缓存通过。|
|S08 / P2文档|原交付说明72卡规则表；根README；plan当前说明|b10/c04/c06/a06/e04抄到旧profile规则，应按明确身份生成或分栏。不能改domain迎合表。根README仍是“大丑牌/戏班”，plan当前说明停在昨天。本次只更新现行计划入口/机器摘要，旧表和根README修订仍待实施。|
|S09 / 证据纠偏|原交付status与README|43是局部35项加8项门禁测试，不是完整E2E。本轮实际是34项中33通过/1失败加构建通过；不得混成“43完整E2E全绿”。|

## 跳场精确证据

正常新局 `run/singapore-ui-short/amo`，D0、金币6：

|入口|点击前|跳场后约2秒|资源/场景|
|---|---|---|---|
|商店本章节目|shop / seq1 / stageIndex0 / stage=null|stage-cleared / seq2 / stageIndex1 / stage.index=0|purchaseCoupons0→1、gold6不变、skipResult={kind:coupon,amount:2}、handsLeft4/discardsLeft3；activeScenes=[]|
|入场折页|新局商店seq1，正常LeaveShop后再跳过|stage-cleared / seq3 / stageIndex1 / stage.index=0|同一券/金币/阶段余量；activeScenes=[character-select]|

商店新增收据 `run/singapore-ui-short/amo/command/2` / seq2 / fingerprint `json-fnv-v1:12df9abbe16431bf`；入场新增收据command/3 / seq3 / fingerprint `json-fnv-v1:9f49a5fb78726c37`。阶段routeGrowth.entry.type均为SkipStage。完整对象在flow-report；不是只根据残留画面猜状态。

两案同一原始调用栈（Vite转译位置178对应仓库源码128；不能把转译行号当源码行号）：

```text
TypeError: Cannot read properties of undefined (reading 'isBoss')
    at IntermissionScene.render (http://127.0.0.1:5199/src/game/IntermissionScene.ts:178:120)
    at IntermissionScene.create (http://127.0.0.1:5199/src/game/IntermissionScene.ts:163:10)
    at SceneManager2.create (http://127.0.0.1:5199/node_modules/.vite/deps/phaser.js?v=44647f75:110818:36)
    at SceneManager2.bootScene (http://127.0.0.1:5199/node_modules/.vite/deps/phaser.js?v=44647f75:110734:28)
    at SceneManager2.start (http://127.0.0.1:5199/node_modules/.vite/deps/phaser.js?v=44647f75:111276:26)
    at SceneManager2.processQueue (http://127.0.0.1:5199/node_modules/.vite/deps/phaser.js?v=44647f75:110595:37)
    at SceneManager2.update (http://127.0.0.1:5199/node_modules/.vite/deps/phaser.js?v=44647f75:110773:26)
    at Game2.step (http://127.0.0.1:5199/node_modules/.vite/deps/phaser.js?v=44647f75:8629:32)
    at TimeStep2.step (http://127.0.0.1:5199/node_modules/.vite/deps/phaser.js?v=44647f75:9083:26)
    at step (http://127.0.0.1:5199/node_modules/.vite/deps/phaser.js?v=44647f75:16410:29)
```

## 可保留与实际短手

三档商品详情放大后的×/ESC/backdrop返回父详情、5次连续开关无残留，state/journal/export前后相同，没发生支付/选牌误触。默认关闭实测44×44（全局样式覆盖了组件32px），不能仅静态报32px热区；短横越界另列R03。迟到A图在关闭A并打开B后未覆盖B，只有一个zoom、无pageerror。390×740及PC的正常高清保持615:768，暗底浅金标题可留。

PC六英雄黑底全图均从真实选角打开并关闭，手机/短横另看新苏轼；[六图证据索引](../evidence/singapore-review-2026-10-17/README.md#六英雄黑底与新苏轼)。完整构图、黑留白和独立48px关闭可保留，不因新卡zoom重做已验原图。72项组件缩略均呈现不等于72张高清/自然获取/机制全部签收；a11足球人物图只列题材取舍，不仅凭主题判错图。

本地普通D0苏轼同点路线技术手：6金→真实邀请满堂喝彩4金→余2金→暖场目标400→弃2♠一次→选5♣/5♦→查看技能入口→真实出牌270，余3次出牌/2次弃牌，尚差130，仍await-input。对子未满足两对及以上助攻要求，**没有实际发动助攻**。没有导入/改牌/加资源/改分或向浏览器批量发领域命令。为补首次未捕获impact截图，仅同种子再跑相同短手并加只读观察，未做第二个完整自然局。4个impact帧可见source焦点与最终135×2=270；浮动+90靠近累计热度文字属于后续视觉微调，不据Canvas帧代签真实爽感。

## 测试、原始失败与最终边界

|检查|实际结果|证据|
|---|---|---|
|npm run build|PASS；保留大型chunk警告|build.log|
|现有score-recorded-audio/handdrawn-art/tangsong-card-names|总34，33PASS/1FAIL；实际1.107、旧断言0.8815，tests/score-recorded-audio.test.ts:6:457|targeted-tests.log|
|跳场两入口|产品FAIL；脚本DONE只表示采样完成|flow-report.json，含原始pageerror|
|原plan结构检查|修改前已有12条P08 invalid evidence record；原记录不改写洗绿|plan-check-baseline.log|

没有全量测试、完整E2E、CI查询、真机或试听。音频旧断言仍FAIL，未删改。此次文档变更不重跑无关产品构建，产品build证据只对应被测7d7921。

**最终边界：实际域名 `https://pai.hp666.cc/` 和公开 `/build-info.json` 均被执行环境代理拒绝，curl CONNECT 403/envoy，Chromium `net::ERR_TUNNEL_CONNECTION_FAILED`。线上版本未知，没玩完用户要求的一局，未试听/未真机。** [原始访问记录](../evidence/singapore-review-2026-10-17/live-access-report.json)保留；首页截图另有Page.captureScreenshot失败，不能冒充线上画面。P08不验收，C04历史暂停不自动解除，也不阻塞本批已发现回归的整改排程。
