# C2-B 从最新 main 的串行集成候选

2026-10-11 UTC。输入远端 main `e48fd07a6e7b4575067dc356ad28cb0a94fe15e9`；新分支 `feat/c2-route-growth-2026-10-11`，工作树 `/workspace/dachoupai-c2-integrated`。本次按父授权只集成新实现候选，提交/推送/draft PR后由父核精确HEAD及CI决定合main；本代理不合main、不部署、不自然试玩。未使用或搬运此前被拒的旧C文档PR/分支。

原修复后本地候选完整保留于 `/workspace/dachoupai-c2`；冻结备份 `/tmp/dachoupai-c2-frozen-7414228d95059959/` 含原完整补丁、产品/证据快照和freeze.json。原补丁SHA256 `59da38ecfdda4646a48f3053a8151f0e5b340a34119fab702fd90a063e62d8a2`，快照SHA256 `19e28dc22a0ac055eccb15f432c8fbc99b96c696fdff7f7fff6d2fc8b4198d08`。保留原FAIL及两轮未发布身份；没有在旧分支提交、重提旧PR或把拒绝当批准。

## 产品身份和独审边界

`quality-r2-route-growth-v1` / `json-fnv-v1:7414228d95059959`。C2数学定义、规则/计分/保存代码及原C2专用测试逐字节同修复后冻结源树。两项集成差异：GameScene保留最新main入口修复并接两处C2变化；发布gate定位旧API预览的72卡hash热点后，仅在r2RouteGrowthJokers的识别函数给四套模块自有深冻结旧数组加引用负判断，任意/复制数组仍做原完整hash，不缓存可变输入。数值定义/身份hash不变；新识别优化另待父精确HEAD复核，不借原独审签整包。详见[性能修补差异](route-profile-fast-path.patch)。原新身份专用测试不改；既有9个测试文件适配新正常入口，增加一个受控Boss历史夹具助手。

同一Sol6.1 xhigh有限独审已关闭类型/资格成套篡改和旧场真实主手来源复用P2；9个异常读取全部拒绝，合法411/G1F0、跨场、截短/空日志、C2清场与旧九选购买的失败保存→同候选retry→duplicate→冷恢复、跳场零成长及旧九选两方向共享额度均独立执行通过。[原报告](../route-growth-c2-2026-10-11/LOCAL_IMPLEMENTATION.md)、[独审原回执](../route-growth-c2-2026-10-11/INDEPENDENT_REVIEW.md)、[原实际scorer/保存证据](../route-growth-c2-2026-10-11/scorer-and-save.json)保持原测试基底与状态，不回填为最新HEAD测试。独审没有核本轮最新main整包，本轮集成检查另列；最终精确HEAD及CI仍由父核。

## GameScene交集与既有PR保留

| 项目 | 原main及集成结果 | 依据 |
|---|---|---|
| PR118现金交易事实 | ShopOfferGuidance/ShopRouteRelations及两组现有测试逐字节同e48fd07；没有星净收益算法变更 | integration-facts.json中的逐文件断言，相关测试本轮另跑 |
| PR119老幻道具入口 | 保留订阅更新、inventoryInspectable、inspectInventory、保存/只读查看资格及补牌/赌约锁；原入口测试逐字节同main | [完整PR119已保留差异](GameScene-PR119-preserved.patch) |
| PR120持牌提示排版 | ShopScene逐字节同e48fd07，原1180短句、提示独立宽度及14px字阶保留 | 源码字节断言，不声称重跑全部11行原生布局 |
| C2接线1 | aiInput.score增传计分前routeGrowth snapshot，其余参数不变 | [相对最新main的仅两处C2差异](GameScene-C2-on-main.patch) |
| C2接线2 | eventSource对rule/route-growth显示“路线资历” | 同上 |

复算断言：从集成后GameScene删除C2 snapshot传参和“路线资历”条件两段后，整个文件逐字节等于e48fd07的GameScene。由此原PR119入口代码没有静默覆盖；本轮没有阿默交互、骰爷资格/倍率时序或星算法改动，星级名称只在唯一计划登记为“推荐指数”。

## 唯一计划同步

仅更新DELIVERY_PLAN的“当前统一执行计划”段：登记C2新候选、实际scorer/保存独审与自然体验的区别、最新main串行集成及draft/父核边界。`## 既有规格 工作包合同与历史证据`之后全文逐字节保持，尾部SHA256 `664f841aa85193464c760d9d124932c7ae1b7345a8b5a7cd3a0ec8491a0621b5`。

按用户新增要求登记失败/挫败页针对性攻略：原新手留存/胜败体验的后置项，重要非紧急，依赖dot18局复盘与规则稳定；真实瓶颈、2–3步下一局行动、具体牌例及可达入口，手机/PC实际画面、美术鼓励感与点击操作一起验收。当前只登记、不设计开发，不抢数值/满槽推荐/英雄入口；不许保证胜利或把随机失败都归咎玩家。

## 本轮检查

已完成9文件165项定向（14:09:35 UTC起，10.83s，含C2六文件及PR118/119相关三文件）、typecheck与diff检查PASS。有界证据在集成源树再生成PASS，scorer-and-save及p2-recovery JSON逐字节同独审冻结版。仓库发布前`release:checked`（全套verify:ci：test/content/build/标准双端browser smoke/production-plan）已执行，实际结果及修复后受影响scope补验如下。检查在此候选源码上执行，工具报告的HEAD/dirty状态如实保留；报告落盘后不改产品。最终提交后的远端精确HEAD CI由父核，不能把dirty源树的本地PASS写成精确HEAD远端绿。

## 发布gate首轮FAIL及有界修正

首轮`release:checked`的test步骤：209文件，3086PASS/17FAIL（14:10:51 UTC，52.55s）；test/content/build/smoke/plan后续因test失败尚未运行，source/index/HEAD前后相同。原日志与gate回执完整保留在[first-release-failure](first-release-failure/)。

- 五份Hero/Boss测试直接跳第3/7章，原夹具没有新C2必需的过往Boss清场ledger；仅在明确跳场的测试入口补“过往必须Boss清场但不宣称任何family”账，真实产品命令和异常导入检查不调用。新测试助手明确标受控、不是自然游玩。
- 二响手写零点输入与SavedBossImpact手写scorer输入缺新身份必须的before快照；补调用r2RouteSnapshot真实读取fixture本局历史，未给产品加缺省0。
- HeroClimax/OpeningSignature两处仍期待旧c06+0.25，按新正常入口合同改为+0.5；JokerPlainQuantity的c04由单hook变多hook，保“每手一次”tile断言并核实际固定+50的first-layer copy，不回改已冻结规则或历史身份。
- v00的原65命令/三style旧API用例，首轮groups超时，独立原样重跑groups/suit也越5秒。定位新C2识别对旧预览逐次完整hash，使用模块自有深冻结旧定义数组的引用负判断；未增样本、改bot策略或放宽数值/保存；当轮未改超时。复制/自定义内容仍用完整hash。修复后含该用例的11文件108项定向PASS（14:18:13 UTC，11.10s），typecheck再次PASS。新优化未改R2_ROUTE_GROWTH_JOKERS数组内容或身份。

第二轮完整gate为208文件PASS/1文件FAIL、3102PASS/1FAIL，仅groups在全套运行中越默认5秒；source/index/HEAD仍保持。完整回执见[second-release-failure](second-release-failure/)。随后精确e48fd07源码与候选各只跑这一个原65命令用例，均通过，耗时2793.52/3441.15ms；[完整对照](v00-main-vs-candidate.json)。因此仅将这组原有65命令用例的Vitest deadline设10000ms，在全套负载下留时间余量，不增样本、改策略/断言或全局timeout，不把该一次耗时比较当性能验收。

9份fixture/copy测试适配后先81PASS；9文件165项首次集成保护检查也PASS。各检查归各次源树，不简单相加冒称独立用例总数。最后完整发布gate单列其实际结果。

第三轮完整`release:checked`（14:28:34 UTC）已通过209文件3103项（77.63s）、content和build；smoke在首店因脚本仍固定旧`basic-suit-choice/69c29f5cd54bb160`身份而FAIL，实际浏览器已加载正确C2身份。保留[完整第三轮日志/前图](third-release-smoke-identity-failure/)。仅把harness/screenshot的两项期待改成严格C2版本/hash，并增加新局零资历字段断言；不是接受任意身份，也不改领域/计分/保存/素材或游戏流程。所有单元/产品代码此后不再变化，故只补跑标准browser与docs scope，不为改脚本期待重跑3103项。最终各发布前步骤结果以完整gate JSON为准，不把失败的全wrapper改写为PASS。

## 未验与后续责任

dot完整18局仍未完成，本轮没有试玩。四个独立手容量/指定核心、资历和升级的受控scorer结果不等于自然出现、买得起、养得成或连续实战；自然上亿经营路径、缺件转型、总体平衡仍OPEN。原生UI/设备/GPU/听感、人类理解和全套美术未签；标准smoke只签其有限软件路径，不代完整体验。科学计数法后续方案、星级净收益算法、阿默交互及未来主动后置合同没有夹入本数值批。

## 最终本地检查收口

最终产品/数值/保存源码保持第三轮3103项通过时的字节；其后只改smoke新局身份期待及唯一计划当前状态。第三轮全wrapper仍记FAIL，不改写历史；发布前各必需步骤由下列实际执行合并覆盖。原HEAD e48、dirty源码检查不是提交后精确HEAD CI；新候选提交/推送/draft后由父复核。

| 检查 | 结果与范围 | 原记录 |
|---|---|---|
| 全套unit | 209文件/3103项PASS，14:28:34 UTC起77.63s | third-release-smoke-identity-failure/release.log、gates.json |
| content/type/build | PASS；最终browser scope也重建PASS | 第三轮gate与final-local-checks/typecheck.log、browser-gates.json |
| 标准browser | Chromium 151.0.7922.173，PC1280×720/DPR1、手机390×740/DPR3两条有限软件路径PASS；包含选角/取消/购入/查看不消费/排序/弃牌/出牌/冷恢复及手机横转 | final-local-checks/browser-gates.json、smoke-result.json、browser.log |
| 唯一计划 | production-plan PASS；最终状态写入后再补docs检查，回执在final-local-checks/docs-gates.json | docs-gates-before-status-update.json保留前次 |
| 既有PR/原冻结 | GameScene反删两hunk等于main，PR118/119测试及PR120文件逐字节同main；其余19原C2源文件/测试同原manifest，两个scorer/保存JSON同原冻结 | integration-facts.json、原manifest与补丁 |
| 旧定义识别 | 四套模块数组深冻结，原引用/独立副本均拒作C2；C2副本匹配、同一可变副本改描述后拒绝。有限断言PASS；关闭Vite服务时异步预扫描告警不属于业务失败，未作为性能签收 | final-local-checks/profile-detection.json |

已实际查看标准smoke的PC/手机牌桌及商店整屏，图片随本目录留存；这是有限显示/软件路径检查，不签整体美术、人类理解、真实设备或完整18局。原build大chunk警告保留，未在本批扩成拆包工作。最终未发现剩余本地阻断；远端精确HEAD CI及父集成复核尚待。
