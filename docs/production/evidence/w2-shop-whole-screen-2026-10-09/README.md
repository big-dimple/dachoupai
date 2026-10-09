# W2 商店整屏视觉收束：有限证据

2026-10-09。输入main `fd61909135e1edc9a5332d28cc83c6a3effd2078`，父已11:09UTC普通FF PR83。用户批准持有区、待售货架与固定入场动作的整体层次和留白收束；6.1默认Medium串行，无并发。

## 范围与可见变化

产品只改ShopScene并增加ShopArt。PC保留原宽分区：持有牌与构筑/道具箱置于连续浅青灰场，章节和角色留在象牙纸页；货架使用纸托，人物上半区与规则下半区分层，入场/换牌有独立操作底板。手机持有纸托收至实际卡槽与用途标签，余下空间与固定动作共享低对比青灰底，避免原高空底板像一张未填完的库存卡。没有新增重复文字，卡牌尺寸/布局、文字坐标、原触点不动，不为填空扩大卡牌或增加滚动。

价格条沿原价格坐标统一：可买青灰、受限象牙底/红字、已购中性纸色且保留原状态文字与淡化卡面；判断调用既有purchaseReason，不另造可买规则。实图中的空槽退后，已有手绘人物与有效持牌保持原图清晰度。出售与排序仍从现有持牌详情操作，未新增入口或改变确认。新增图片/音频0；仅复用p00-paper及现有prepared角色/功能卡/工具/道具缩略，映射与原文件hash见assets.json。

不改购物/工具/出售/排序命令、槽位/库存/价格/计分/随机/身份/schema/音频/BGM。只在最终布局上画非交互纸层，无新座位或命中分配。允许文件为src/game/ShopScene.ts、src/game/ShopArt.ts及本包证据、AGENTS/DELIVERY_PLAN入口；不批量修图。

## 同一合法输入与实际检查

输入复用w2-build-keepsake-2026-10-09/report.json的390 profile、saved next shop完整state及既有命令链，原生生产文件选择器导入，严格readCheckpoint通过。角色是erxiang、seq7、8金、持b10成长20；本轮没有新经营链或自然整局。

- before：当前main的1366×768和390×740各一张默认整屏，完整state/journal未变，卡面已加载。原报告和图完整保留。
- after：同存档1366×768/390×740默认图，以及320×740/740×390必要布局；四图逐张实际查看。全部可见启用action目标至少44px且在画面内，原布局函数未改。390/320保持首屏购买决策与固定主操作；短横原收起库存与培养入口保留。
- 1366鼠标邀请b04：查看购买并取消、原持牌出售确认并取消均0命令；随后真实BuyOffer一笔，8→4金、已购与新增持牌显示，完整保存state等于原applyCommand。
- 390触控购买T19：同样查看/取消与出售取消0命令，切原工具货架、真实BuyOffer一笔，8→4金、库存0→1、已收入状态显示，完整保存state等于原applyCommand。购买未自动使用工具。
- 两端购买后打开原道具箱再关闭，完整state/journal不变。共2笔真实交易；报告保完整命令/state与价格状态，不称全套排序/出售/工具使用已重新验收。
- 42项既有相关检查（shop-layout/current-decisions/sale-continuation/purchase-receipt/result-feedback）和typecheck通过；最终仓库全量测试/typecheck/build/browser只由精确最终head CI执行并另核，不重复自然整局或六角色矩阵。

原脚本把按钮名写成“出售…”而真实既有按钮是“出售”，定位超时；observer-FAIL保原report与脚本。修正观察器名称，没有改产品、断言或放宽状态保护，最终所有路径通过。最终after报告head字段是输入基线，workingTreeCandidate=true；当时产品未提交，具体产品字节见product-files.json，不能把基线SHA冒称已包含补丁。before/after各自检查区间source/index/HEAD严格未变，最终提交与CI另核。

## 验收边界

六张after图、两张before图均为当前软件Canvas实际渲染画面，没有长录屏、软件GPU帧率签收。检查使用减少动态保证完成入场与静态可读，不冒称普通动画时序、听感或真机通过。没有新增/延长演出。PC/手机真人观感、设备流畅度、音频听感及W6保持未签；本包不自动签整套W2或W5玩法/经济价值。

全部文件hash在files.json（不自哈希）；native-harness.mjs保真实执行路径/tmp/shop-w2-final，可按明确输入复跑。候选draft PR由父独审协调main，不强推、不绕保护。

## 最终选中提示补正

54f6a2c完整候选推送后代码复核发现PC普通边框删除同时移除了原选中商品的静态墨线。最终仅恢复选中时原1px/0.5青灰描边，普通货架仍使用分层纸托；手机、交易、原图均不动。selected-final记录同seq7存档PC1366原生查看第二件c10后取消，选中线实际可见，完整state/journal不变、0新交易，截图实际查看，typecheck再次通过。此前六张after/两笔交易按54f6a2c产品字节保存，不冒称重拍或重跑；选中补正产品hash见selected-final/product-files.json。最终新head CI替代原54f6a2c门禁，以最后精确head为交接依据。

## 父图审标题补正

父确认整屏改善成立，但320金币底板与740×390刷新按钮遮住原装饰标题末尾。最终仅按已渲染标题文字高度与金币/刷新/培养实际区域计算剩余横向宽度，空间不足用20px“筹备”短标题，控件、货位、卡牌、字体大小和44px/56px操作不移动。title-final只在同seq7存档320×740、740×390各导入显示一张；实际标题40×23px在x12/y12，两端均不与原控件相交，完整state/journal未变、0业务命令，图均实际查看、typecheck通过。原两笔购买/取消不重跑。早前两张标题遮挡图保原SHA，不冒称已无缺陷；最终补正产品hash见title-final/product-files.json，新精确head CI另核。

价格陈述同时按实际画面纠正：受限价格仍是象牙底红字和原原因；0xf0ddd2被SceneView.material映射至paperLight，没有实际浅红块。不为文档另添色块，产品价格呈现不改。
