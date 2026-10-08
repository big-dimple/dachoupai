# 大丑牌低阅读呈现：有限软件证据

输入：main `24ab214d3c7b954d3d7eb384a93f4a93d737f35f`（PR55父已FF）。冻结产品：`df4e61fcc736baa25ebda1e3a1133e10fb2a8618`。本目录不是已上线或用户体验验收凭据。

## 检查结果与范围

- 78 tests / 7 files、typecheck PASS：[定向日志](directed-final.log)、[类型日志](type-final.log)。含五个精确身份×72卡、实际文字数值绑定、加与乘、有效对象、封禁、进場/跨场次数、成长读取/新增、复杂限制与旧身份三牌型。原测试的成功保存约束从默认全文移至完整详情时，同时检验默认与详情，未删保护合同。
- [浏览器报告](report.json)：实际Phaser/UI，PC1366×768、390×740、320×740、740×390四种有限受控样板。三个用途框与对应价格不碰，标题不再覆盖价格，无省略号截断；详情关键主述与限制、相邻状态及折叠全文，查看/取消全run不变。不是所有72卡的逐页实机签收。
- [字框审计](tile-audit.json)：五身份×72×88/108px共720个实际字体文字框均在54px三行预算内。只是缩略文字预算，不能代替理解、设备或全部页面像素验收。
- 手机一次正常点击出牌：公开受控四牌两对；保存trace实际读取热度10、新增10供后续用，已存20；全状态逐字段同canonical `PlayHand`。见report的phone.actualPlay与[保存后详情](actual-growth-detail.png)。无未来抽牌/种子搜索/整章矩阵，无虚构自然获取。
- 冻结前后[before](freeze-before.json)/[after](freeze-after.json)相同，源码/index/HEAD无修改。[受保护树](protected-trees.json)逐对象同输入：领域、内容、应用/保存、平台、音频、美术、公开资产与harness。本地没有重跑完整test/build/首章矩阵；完整标准检查由最终精确head CI一次执行，CI结果在PR中另附。

## 原失败保留

[first-failures](first-failures/)均是基线24ab214上的未提交工作树，不能给它们冒签df4e61f：

1. 首次定向4 FAIL：删短后丢了接续准备、成功保存字面保护、进场时点及每场次数。补回默认关键合同；第二次仅剩非计分牌保存约束在折叠详情，断言改为检查默认＋详情，语义保留。
2. type-ui FAIL为可选condition类型，明确安全回退修正。
3. ui-first语法换行错误、ui-second窄屏fixture未初始化counters为驱动失败，修驱动，无降产品验证门槛。
4. [手机原重叠](first-failures/phone-overlap.png)由实际view发现；当时旧自动几何报告PASS但漏掉持牌标题与价格。移除手机Joker货架上重复标题，保留卡名、已持用途与已存成长；检查补标题避让。
5. 当前身份长牌型/概率/多步提示的[首轮超预算](first-failures/current-identity-overflow.json)，与四旧身份b03的[超预算](first-failures/five-identity-overflow.json)分别保留。缩略明示复杂条件，详情保完整精确主述，不拿新版成组替旧三牌型。

## 有限实际画面

[PC商店](pc-shop.png) / [PC详情](pc-detail.png) / [390商店](phone-shop.png) / [390详情](phone-detail.png) / [320商店](narrow-shop.png) / [320救火详情](narrow-detail.png) / [短横商店](short-shop.png) / [保存成长详情](actual-growth-detail.png)。已有截图有限查看，无长录屏、软件GPU帧率或音频听验。

## 尚未通过

真人是否少读即可指出条件、对象、代价并正确操作；用户PC/手机实机、GPU与音频；自然首章持续行为；W6签收，W7/W8新增。复杂机制默认详情仍较长，须真人反馈决定进一步分解；不将“能显示/软件PASS”写成“理解/愿意继续”。只有draft，由父独审协调main。
