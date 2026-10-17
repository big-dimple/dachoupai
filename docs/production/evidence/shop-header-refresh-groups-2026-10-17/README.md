# 商店分类、顶栏与直接详情交付证据

基线 main `8ebff2a2470ca37d64bafc99827bbf4bcc456cb9`，独立分支 `dev/shop-header-refresh-groups-20261017`。本批按用户14:02–14:34指令收口；普通dev提交交集成，不推main、不等CI、不部署。P08保持in_progress，人验门不变。

## 可先评估的画面

- PC： [1366共享唐宋牌区](1366-jokers.png)、[1180内联三路](1180-workshop.png)、[1366工具区](1366-tools.png)、[1366长期物品](1366-items.png)。
- 手机： [390顶栏与卡片](390-jokers.png)、[390刷新确认](390-refresh-quote.png)、[390直接详情](390-direct-detail.png)、[320窄屏两行顶栏](320-narrow.png)。
- 修改前main实图及原报告见 [before-main](before-main/report.json)。本批未将Library参考图元数据当作实际看过原图；布局对照使用父线程观察和本地main实图。

实际查看了PC共享区/三路、390最终顶栏/刷新确认与320截图。软件首次通过后，图像复核又发现余额文字被SceneView改成深色、刷新弹窗继承全高；已单独修正颜色和弹窗高度，再跑最终三组原生检查。图片仅为软件运行证据，不替代用户美术审美或物理设备验收。

## 最终行为与边界

- PC为唐宋牌、消耗工具、自选做牌、长期物品四个切换，共享一块大展示区；只绘制选中货架。已持顺序栏与唯一大入场按钮保留。PC自选做牌复用原WorkshopGoals，在共享区内联三条互斥路线；选择、返回、原报价、保存成功后共享次数锁定沿用原规则。
- 顶栏余额明确显示铜钱图标和“金币”，背包有标签及真实计数，刷新显示实际金币价或免费。390单行，320两行，操作区域至少44px。三种小图标为统一代码线图，未添加美术文件。
- 刷新先显示实价确认；取消/Escape没有命令或扣款。报价过期提示重新查看；提交前锁住重复输入，保存期间关闭不可误取消，仍走原send及保存失败恢复路径。免费刷新同样确认并消费真实免费次数。
- “培养建议”靠近已持区并降为次级；“先加后乘，乘倍率通常靠右”，B13显示倒序提示。查看不扣款，原付费升级仍明确确认。没有推荐星级或保证最优的排序承诺。
- **单击直接稳定详情只改商店**，取消首击无配合小层；手机已持牌单击详情与长按拖动保留。PC仅保留已有的有用条件预览，未新增普遍tooltip。ShopJokerPresentation/ShopSynergyPreview实际调用范围已检查，不触及对战悬停/拖动。
- 用户明确授权的共用RunMenu改为边缘44px箭头，旋转展开原有唯一菜单入口；外点/Escape收起，键盘、ARIA和焦点恢复保留。该菜单变化影响各场景菜单入口；GameScene源码和战斗输入组件未改。
- 未改规则、存档、目标、经济、原画、资源清单、音频、依赖、GameScene、SceneView、OwnedJokerInput、PointerIntent或OwnedJokerDragVisual。既有5处多彩/忘招挂载与组件内容保留；精确LF指纹及范围断言见 [source-binding.json](source-binding.json)。

## 验证

四文件49项相关测试、类型检查与Vite构建通过，见 [tests.txt](tests.txt)、[build.txt](build.txt)。最终仅两处旧“再点详情”指引改为直接详情后，补跑同样49项及类型构建；未追加新的浏览器矩阵。

[report.json](report.json) 是最终生产构建的原生交互结果，浏览器153.0.8010.12，0页面错误：

| 视口 | 已持 | 验证 |
| --- | --- | --- |
| 1180×757 / DPR1 | 0 | 四分类只显示当前货架；三路选择/返回/取消；真实PracticeHand保存；刷新取消/ESC/双确认；真实免费次数 |
| 1366×900 / DPR1 | 5 | 大展示区、已持栏；直接详情；菜单键盘/外点/恢复焦点；刷新确认 |
| 390×740 / DPR2 | 5 | 明确顶栏；直接详情；刷新确认；原生CDP触摸长按420ms后拖动真实排序 |
| 320×568（同手机context一次resize） | 5 | 两行顶栏、安全区及可达按钮、无观察写入 |

刷新确认的重复输入用原生DOM鼠标dblclick触发并控制保存完成时机；手机画布点击和持牌长按拖动用触摸事件。它们不构成物理手指双击或真机声明。详情/分类/菜单/取消均核对完整state、journal、storage零写入。实际命令结果与canonical及持久化全状态一致：PracticeHand 40→36，付费刷新36→34及40→38，免费刷新40→40且免费次数1→0，ReorderJokers 38→38。免费测试为programsEnabled有效受控导入，未声称自然获取奖励。未跑全局长矩阵、自然完整局、实机或听感验收。

## 保留的异常和限制

- `backpack-label-first-FAIL.*`：既有库存反馈覆盖为“道具箱”，已在调用后设置“背包”，不改共享反馈模块。
- `runner-result-selector-FAIL.*`：实际成功后结果容器是shop-practice-result；仅修驱动选择器。
- `fixture-programs-disabled-free-FAIL.*`：无节目模式下免费券导入被正确拒绝；改用真实启用节目fixture，未放宽验证。
- `layout-first-FAIL.txt`：最初窄屏培养/持牌空间问题已修；旧固定底栏、四区同时显示断言按新授权更新，保留防重叠断言。
- `software-pass-before-visual-fix.json`、`wallet-contrast-before-fix.png`、`refresh-height-before-fix.png`：如实保留软件通过后发现的视觉问题；最终截图和report均来自修正后。
- 计划总校验仍失败：本分支与main均是**相同15条P08 invalid evidence record**，见 [本分支原日志](plan-current-FAIL.txt)、[main原日志](plan-main-baseline-FAIL.txt)。本批没有修改P08历史证据格式；不将该检查标为通过。
- 自动审批拒绝了同时删除PC“从左向右结算”排序行及原持牌说明的可选操作，理由是会移除用户要求保留的排序用途。该删除**未执行**，两处原内容保留；独立颜色/弹窗修正正常完成，无待批准操作。
- 父线程即时进展消息曾尝试用已提供threadId发送，但工具返回thread not found；本地交付、截图、提交不受影响，以本交付回执通知父线程。

本批释放ShopScene窗口给后续整合；不附带其他美化或对战交互修改。
