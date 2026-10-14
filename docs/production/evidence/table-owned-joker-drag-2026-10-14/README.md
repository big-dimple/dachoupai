# 牌局大丑牌拖拽：共享商店组件的有限补齐

输入 main `69f46e47f250ec3ad7bc55ed11f7888326eecf8f`，已核其两个合并父提交为PR163/164；读当前代码与DELIVERY_PLAN后确认缺口仍在。环境 `/workspace/.agents` 为空，仓库无 `.agents/skills`。本批直接委派覆盖AGENTS中旧任务窗口，独占GameScene；只写本目录证据，不改总计划，不合main、不部署、不重跑18局。

当前最终产品/harness `f73bedad6d684226239d22e3c7f828c134363630`，src tree `3fd2879ba597be3a53a219bfe7fa1b9e941bb20b`。此前交付HEAD00e37d61的[CI38489622622](https://github.com/big-dimple/dachoupai/actions/runs/38489622622) domain真FAIL：tests/ai-hand-action-cancellation.test.ts的非拖拽command夹具没有Phaser input，新代码无条件读取enabled；3392通过/1失败。原日志在failures/ci-non-drag-input，不归因为基础设施，不改测试夹具。产品仅改为有pendingDrag时才读取input，正常非拖拽命令不增加输入对象依赖。184项/7files、type/build及冻结三组全矩阵再次PASS，modified为空；[当前完整数据](ci-fixed/full-state-journal-storage.json.gz)与[当前报告](ci-fixed/report.json)。最终交付HEAD远端CI另核，旧红灯保留。

首冻结产品及harness提交 `f03f784532db1a41f9c64be9fdb24f2f46f9a383`；src tree `48b3e5f795b7bbf6808c1f58774006f89fe15ad8`。candidate完整验证在该提交运行，`modified=""`；该阶段证据提交94cc5e55不改产品，最终悬停补正另见下段。最终交付HEAD与其远端CI在Draft PR和交付回执单独核，不借输入main或旧商店的绿灯。


悬停补正阶段产品/harness `173eb9ce4e8c3a15d6e8b83be429d8c8f7810aff`，src tree `bf0af6ad1be819cdc93bdb31c0c9974996b99b6d`。收尾复核补回原生持牌轨道的PC鼠标悬停详情，原native hover移动/离开、6px悬停与牌图查看保留。该冻结提交modified为空，三组全矩阵及178定向/type/build再次通过；[最终完整数据](final/full-state-journal-storage.json.gz)与[报告](final/report.json)为当前证据。final报告仅收拢sceneLocks的完整对象，原始report另存raw-report.json.gz；没有删gzip完整保存。首冻结candidate及原FAIL不覆盖。

## 当前差距与改动

基线GameScene仅SceneView长按／松手调序，没有连续跟手。独立archive旧源码同受控状态的390原生长按抬升为0px，PC鼠标仅有原悬停6px；途中牌没有随指针跨槽。基线仍能正确松手保存，故不重写排序规则或商店。

GameScene直接接OwnedJokerInput与OwnedJokerDragVisual：原355ms／10px意图阈值、16px／1.06抬起、双层纸影、连续二维跟手、占位与第N位、整排110ms插入让位、保存中、成功后150ms落位全部复用。原ReorderJokers命令和expectedSeq保持。取消与同槽不提交；提交期间锁输入，resize重绘重绑保存预览，成功才显示“顺序已保存”。失败回原保存位置与scale1，显示未保存，菜单重试只保存固定候选。

牌局原悬停复位不能在拖拽中把让位牌拉回；异步牌型/AI提示更新控制区时保留拖拽文字。待补牌、骰爷待兑现、演出和不可写时不能拖动；详情左右移也沿同一场景资格禁用。普通tap查看保留，生命周期销毁原生输入层。没有新音频、资产或振动API。

GameScene以外的所有产品文件均与输入main相同，含ShopScene、两共享组件、JokerReorder、PointerIntent、layout、规则/domain、内容、application、platform、音路、依赖、工作流、AGENTS与DELIVERY_PLAN。见[保护范围](checks/protected-files.json)。

## 真实局部输入与完整保存

受控当前身份五张真实实例在商店状态建立，再走原LeaveShop／EnterStage；正常菜单导入。不是自然获得五张，不签自然经营/全旅程/总体体验。浏览器为系统Chromium，PC真实mouse、390真实CDP touch，不用合成DOM事件冒充主拖拽输入。

冻结三组均PASS：PC1366×900、390×844、DPR2低动态390×844。每组1→5、5→1、中间2→4及快速释放＋延迟保存，完整state/journal/IndexedDB与实际applyCommand及makeCheckpoint逐笔相等，一手势只提交一笔命令/一次revision；growth与edition跟随实例。预览、等待与取消不写保存，保存首批poststep的其它牌没有回跳。

手机每组11项、PC9项取消边界：静止长按松手、同槽、拖出持牌区、pointercancel、手机提前移动／双指、受控hidden、resize、Escape、blur、拖动中只读锁定。完整保存全相等、dispatch0；hidden/blur是受控DOM信号，不签物理后台。readonly新长按不拾起、tap仍可详情且左右移禁用；通过真实菜单接管恢复可写。

每组真实IndexedDbSave.commit注入QuotaExceededError：一次命令/一次失败commit，已发布state、journal、IDB完整保留，原位置恢复。解除错误后点原菜单“重试保存”，只保存原候选，journal和seq各+1；刷新回title完整冷恢复相等。错误菜单实际存在“重试保存”，不把拾起/松手当保存成功。

每组另以合法当前身份生成的真实DiscardHand回执导入：老幻pending-refill、骰爷pending赌约均原生长按跨槽不能提交；完整前后保存一致、dispatch0。正常erxiang checkpoint随后真实点手牌／出牌，在实际计分presentation中原生跨槽也没有新调序。记录在ci-fixed gzip的sceneLocks，不冒称六英雄完整自然流程。

两390轨道外菜单原生滚动0→145px，完整保存保持；菜单touch-action:auto，共享局部持牌surface:none。既有canvas:none、body:hidden及viewport meta不变。CDP pinch旧/新均未扩大scale；不签全页缩放或实体手机缩放。

[完整保存与逐帧记录](ci-fixed/full-state-journal-storage.json.gz)、[可读报告](ci-fixed/report.json)均保留。[当前基线对照](ci-fixed-comparison.json)（前两阶段保comparison.json与final-comparison.json）核两端初态和首笔真实调序的完整state/journal/IDB对象相等。baseline的modified字段是harness调用工作树标记，运行产品来自独立69f46e47 archive，不能把它误当改过的基线。

## 实际像素证据

本代理已用view_image实际查看冻结390抓起/途中/落位/失败/重试、PC抓起/保存等待，以及旧390途中。另实际查看[PC原悬停恢复](ci-fixed/1366x900-mouse-hover.png)。能够看到卡体上移、纸影、目标和保存状态；390拾起时经过HUD边缘属于瞬时覆盖，不能借局部截图签整屏美学。没有画假手指或后处理图片。

| 操作 | 390×844 | PC1366×900 |
|---|---|---|
| 旧途中 | [旧图](baseline/390x844-slow-mid.png) | [旧图](baseline/1366x900-slow-mid.png) |
| 拾起 | [图](ci-fixed/390x844-slow-held.png) | [图](ci-fixed/1366x900-slow-held.png) |
| 连续跟手／占位 | [图](ci-fixed/390x844-slow-mid.png) | [图](ci-fixed/1366x900-slow-mid.png) |
| 等待真实保存 | [图](ci-fixed/390x844-saving-delay.png) | [图](ci-fixed/1366x900-saving-delay.png) |
| 成功落位 | [图](ci-fixed/390x844-slow-dropped.png) | [图](ci-fixed/1366x900-slow-dropped.png) |
| 失败／固定候选重试 | [失败](ci-fixed/390x844-save-failure.png)／[重试](ci-fixed/390x844-save-retry.png) | [失败](ci-fixed/1366x900-save-failure.png)／[重试](ci-fixed/1366x900-save-retry.png) |

## 原失败与本地检查

- failures/fixture：初次夹具入场后替换持牌，原完整性守卫拒绝live stage joker identities。改为入场前建立受控持牌再走原入场，未削守卫。
- failures/first-save-jump：首产品快松手时原clearHover复位让位牌，提交后其它牌再次移动；完整首帧FAIL保留。增加拖拽期间restingJoker让权，冻结三组通过。
- failures/async-status：PC异步控制提示覆盖“第1位”为旧“顺序已保存”；原FAIL保留，updateControls仅保当前拖拽文字，冻结三组通过。
- failures/live-edit-reload：本代理在浏览器运行时编辑源码，引起Vite导航／上下文销毁，工作调度错误；该轮不计通过。随后提交冻结，无源码修改的完整三组PASS。
- failures/baseline-setup：独立archive遗漏vite所需scripts/build-info；补原scripts后旧源码两端有限观察PASS。

[当前typecheck](checks/ci-fixed-typecheck.txt)、[当前184项／7files相关测试](checks/ci-fixed-targeted-tests.txt)、[当前build](checks/ci-fixed-build.txt)、[当前冻结原生验证](checks/ci-fixed-frozen-browser.txt)通过。含原排序/意图/布局及骰爷、老幻保存边界。build保原大bundle提示，未改依赖或构建配置。未跑全库本地测试，最终完整CI按新HEAD独立核。

可重跑：`TABLE_DRAG_OUTPUT=/tmp/table-drag-review node harness/table-owned-joker-drag.mjs`。证据SHA256见SHA256SUMS，完整数据在gzip。云浏览器不签真人抓持观感、手机物理震动/宿主触感、设备GPU/FPS、音频听感、全部viewport或完整游戏体验。尊重用户在商店实际感到的触感；本批不猜来源，也不保证不支持浏览器的震动。
