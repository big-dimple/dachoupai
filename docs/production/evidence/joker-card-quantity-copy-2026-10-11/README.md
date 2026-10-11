# 共享购买文案数量限定 · 独立候选

归属：批次一低阅读主说明一致性（W2/W3），dot 第5局二响/顺子自然发现；本包只拥有 `JokerPlainCopy.ts` 与必要定向测试。A 道具工作面、Astra/PR110 结算与关卡均未写入；18局实际试玩继续由 dot 负责。统一主计划未改。

基线 `2a75ec7de9ab758fc700a31fa552e8433bd8d1f8`（核远端 main 后隔离），产品冻结 `c503f08540928ba69ea5bd5ed9d9330b638c0159`。截图各自绑定这两个精确 SHA；报告保存干净 e2e 构建身份、浏览器、逐图 SHA256。本证据提交仅增加本目录，产品树仍是 c503f08；最终 PR HEAD/CI 以 PR 的精确 head 核实，不借基线绿灯。仅本地 localhost 预览，未建立外部托管，未合 main、未部署。

问题：现行 a03 合同位于 `src/content/r2AssistJokers.ts:8`，`src/domain/r2Conditions.ts:41` 匹配 `active[0]`。原共享主句“首张计分牌 → 每张有效牌热度+15”与关键限制冲突；PC 货架及两端详情可见。修后为“除高牌/对子外的首张有效计分牌 → 热度+15”，原“合法重触发时可再次获得”限制与完整规则保留。手机货架原用正确的紧凑 `tile`，本包保持其首牌/+15，不能把它冒称原来显示每张。

仅对同一单 hook、单算术效果生成分支做有限核查：a03 首牌；铁算盘/a08/b02/b05/c02/c03 匹配点数、同点或花色的有效计分牌；a10 首张合格保留牌及 d01/d02/b11/c10/d08 前若干合格保留牌；pengci/c04/e08/f04 的每手一次效果。行文和紧凑数量词共用私有函数；没有改共享接口。既有重触操作/多步骤回退、数值、领域、内容、概率、价格、保存身份、资产保持。旧 v11 a03 仍是只出1张/+35/每手一次，未套成新 +15。

定向 `npm test -- tests/joker-plain-copy.test.ts tests/joker-plain-quantity.test.ts` 与 `npm run typecheck` 通过，见原始输出。保留改前断言 FAIL；其中初版旧 v11 测试误以为其为逐牌阶段，读 hook 后改为正确的 jokerScore 每手一次期待，此项不算旧版本缺陷。没有执行本地全回归或任何自然长局。

两端实际 Canvas UI：受控当前 `quality-r2-basic-suit-choice-v1 / json-fnv-v1:69c29f5cd54bb160`，原生创局→菜单导入已校验存档→货架→详情→展开规则→取消。只为显示现货替换一个公开 offer，并标受控；不购买、不出牌、不接管 dot 实玩。每版每端查看前后完整 state/journal/导出/IndexedDB 均相等；跨版受控 state/journal/导出相等。导入前普通 UI 新局有时间种子，保留备份行跨版不同，故不宣称整库跨版字节相同，见 `cross-version.json`。

| 实际可见对照 | 基线 | 修后 |
|---|---|---|
| PC1366×768 货架 | [原图](before/pc-shelf.png) | [修后](after/pc-shelf.png) |
| PC 详情 | [冲突主句](before/pc-detail.png) | [首牌/+15](after/pc-detail.png) |
| PC 规则展开 | [原规则](before/pc-rules.png) | [对应规则](after/pc-rules.png) |
| 手机390×844 货架 | [原紧凑首牌](before/phone-shelf.png) | [保持首牌](after/phone-shelf.png) |
| 手机详情 | [冲突主句](before/phone-detail.png) | [首牌/+15及重触限制](after/phone-detail.png) |
| 手机规则展开 | [原规则](before/phone-rules.png) | [对应规则](after/phone-rules.png) |

已实际查看修后六图及基线货架/详情四图：目标文字完整可读、主句不再自相矛盾，详情重触限制和规则可达；只核该卡文字，未签整屏美术/所有商品、真人理解、手机实机、声音或自然获得率。异步卡面加载阶段在部分基线图不同，不主张全屏像素相等。剩余父独审、dot 操作与精确最终 CI 各自单列；测试数量不替代体验验收。

观察器失败另存：首次受控首店改 offer 被 opening-state 严格校验拒绝，之后先执行原 RerollShop 再构造校验通过的受控显示存档；首次浏览器未接原生导入确认对话框，Playwright 默认取消而超时，随后正确接受并重用同一冻结构建。未放宽产品校验、UI 超时或保护断言。`capture.mjs` 为本包可复现的有限证据脚本，输出到 ignored `shots/joker-card-quantity-copy`；使用既有本机 Chromium，按当前 checkout SHA 绑定图。
