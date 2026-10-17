# 商店条件提示与UI卡名修复（2026-10-17）

基线 f81724b57736c7d4f299cf1d95705a7ba3ef9497；产品 6479d4377e843bfcde211efdbca89fef35431cf7；独立分支 dev/shop-synergy-copy-20261017。最终普通dev交付SHA见提交回执；本批不合main。

商店去掉关键词/角色适配和“热度+倍率就强联动”的断言。只读当前实际货架、购款折扣/容量和金币后的条件交集，首层明确“不代表额外加成”。e08≥20与f04≤3互斥、买后跌破门槛、f04恰好3/4金、未知条件、重复牌/不存在货架及满槽未选替换均不凭猜测加亮。购买造成已持金币门槛失效的警告继续保留。

收据、替换比较、成长、已保存来源/回看、赠品和相关英雄打法引用，在UI出口按技术ID读tangsongCardNames。读取规则条件仍用原定义；没有改写定义数组或给领域输入替换name。原有GameScene/ShopScene的原定义复数入口保留。

43个定向文件共373项最终通过。先复现5个联动失败、3个跨页面混名失败；原8+19个旧名字期待失败及中间3项ID未对上记录保留，只改显示名期待，现金/倍率/事件/身份断言保持。分批去重口径与源码/blob绑定见[status.json](status.json)。最终类型和生产构建通过，只有原有大chunk建议。

极短Chromium153 / 390×844触屏：经原生导入验证器接受的受控商店夹具，查看购买条件→比较替换→Escape/取消→实际邀请4金→查看购物收据；购后23→19金，完整state/journal/current存档与共享命令结果相等。再经原生菜单导入受控已保存手，打开来源回看并关闭，state/journal/storage不变。原始断言与观察文字见[native/report.json](native/report.json)；可人工导入[受控快照](native/controlled-checkpoints.json)的shop或review字段，不冒称自然取得牌/长局。初次开发页加载超时、第二轮菜单脚本误收起的FAIL均保留；最终静态E2E重试通过，没有为脚本改产品。

截图：[购买条件](native/purchase-conditions.png)、[比较替换](native/comparison.png)、[收据](native/receipt.png)、[保存手回看](native/saved-review.png)。截图为有限软件检查，不代签美术、真人理解、设备或听感。

领域、应用、平台、音频、内容、公用GameScene/技能提醒、美术和依赖相对基线Git差异为零。独立工作树保留原有交付，临时编译器/脚本留在忽略的shots，不交付一次性bundle或修改包依赖。P08保持in_progress，51新图与其余评审/正式门另按原计划，不等待或代签。
