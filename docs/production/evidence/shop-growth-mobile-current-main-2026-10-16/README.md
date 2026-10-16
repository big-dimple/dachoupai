# 经营成长与移动安全区：最新 main 并集复核

已发布基线 main 034557dc004175b5049d2f894c10e2f671996365，正常合入成长候选 ea54e7ed3a3b99667990a89d32fe084255b5b8bd 与移动候选 54851f65bac35b30269a66d4630a3e39b5727ddb。产品冻结 85710521da41607554d175571d53f47b2825e0a1；后续仅修观察器路径和补当前计划，原生验证头 746fab787b5fd163a34f9057cb12f96ca8fdd272；两者 src tree 同为 56137457dff333e49526f529b24ef946cc89b709。最终证据提交只含文档及报告；精确发布 SHA 以远端回执为准。

ShopScene 逐块保留两方：成长 helper 两处显式 shop 上下文、PC 成长提示优先于泛化服务提示，实际交易通知仍优先；移动页容量/安全区/折叠持牌入口/商品建议及头部布局保留。其余五个布局产品文件与移动候选逐 blob 一致，JokerGrowthCausality 与成长候选一致。音频、技能提醒、44px CSS、GameScene、领域/内容/保存及 public/art 与最新基线逐树一致，见 source-freeze.json。

本地新跑 18 文件185项相关测试全通过，TypeScript/生产构建通过（保留原大 chunk 提示）。三条真实六金货架购牌路线经两手成长、过关下一店、冷恢复、详情查看、取消/确认出售、售后冷恢复全部通过；b10 的商店提示为“练对子已攒+30 · 上手+10”，b03 末手未新增长时只显示“老搭档已攒+0.5”。每条都在牌桌和成长后的商店旋转到 740×320/320×568 并模拟上下左右安全区，共12次状态/命令日志/存储完整相等；商店成长行可见且全文在安全区内。320px 经现有培养建议→全部现货与持牌→持牌管理实际打开详情与出售，未调用私有动作或注入库存。

同一产品的移动矩阵39场景全通过：六英雄短横/短竖、两件分页后第三件、模式/故事/完整立绘旋转保持；自然购买真实工具→去向→入场→选目标/预览→Escape→再次确认→回到牌桌→技能面板横竖→冷恢复。唯一新增命令为 BuyBasicTool/LeaveShop/EnterStage/UseConsumable，无 pageerror。完整原始快照见 growth-native.json.gz 和 rotation-native.json.gz；原候选的经济前后对照继续保留，candidate-final-equivalence.json 另列本并集真实保存比较，三路线九处领域状态/命令日志均相等。

原生首轮失败没有删除：390通过后，320脚本在本轮建议页直接找“持有牌管理”，漏点“查看全部现货与持牌”。preserved-native-failure.* 保留真实报告/截图/日志；只修 harness 原生路径，产品代码未变。之后三路线完整重跑。185项及生产构建绑定85710521，原生绑定746fab78；resumed-source-freeze.json 与全部产品哈希证明复用范围，没有借旧产品签新代码。

已实际查看 grown-shop-short-landscape.png、grown-shop-safe-portrait.png，核成长全文和经营/入场区域；selection-short-landscape.png、tool-returned-table.png 也已实际查看，为最终矩阵代表图。旧 FAIL、反证与原图保持，不以软件截图代签运行时审美。

当前挑战者/高光/失败体验的实施事实、下一批最小出口和文件边界集中在 [DELIVERY_PLAN 当前盘点](../../DELIVERY_PLAN.md#挑战者高光与失败体验下一批有限核对2026-10-16)。B05只有文字样板，失败建议与同局重试、高光真实来源/数值接线已实现；理解/普通行动/节奏仍需有界核对，不重新派入口开发或扩新设计。P08仍in_progress；真人理解、听感、物理设备/GPU、自然获取与平衡另签，结算尾部诊断保留原负责人。未查CI/域名、未改规则/数值/原图/音频、未强推或 git clean。

实际命令：git merge --no-ff --no-commit（依次两个候选）；npx vitest run（18文件及JSON报告）；npm run build；GROWTH_DISCOVERY_PHASE=after / GROWTH_DISCOVERY_ROTATE=1 / GROWTH_DISCOVERY_OUT=shots/shop-growth-mobile-integration/growth-native-resumed 后 node harness/current-growth-discovery.mjs；node node_modules/vite/bin/vite.js build --mode e2e --outDir shots/rotation/build；node harness/rotation-layout.mjs；node --check harness/current-growth-discovery.mjs；git diff --check。正常 FF main 与 push/ls-remote 的精确结果另由发布回执报告。
