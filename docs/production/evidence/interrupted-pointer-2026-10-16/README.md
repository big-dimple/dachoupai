# 后台中断不误触 · P1独立小批

基线为已发布main `8af3e5066984979059b7ff72111b6c3cbc13aa4a`；独立分支 `fix/interrupted-pointer-release-20261016`，产品 `b8707def8a4d1a51b1f5b52d9b785a647588d907`，src树 `db4163c75f4b6543e4b8e8f7977e225949f1f8fb`。来源和边界见[status.json](status.json)。本批只推开发分支；不改结算工作树，不查CI或域名。

## 为什么选这一项

承接唯一DELIVERY_PLAN当前P1“移动手势中断”。主页、加载、携带和加成说明已有同版证据，不重新开发；真人/美术/独立眼图属于外部验收。当前SceneView虽处理blur、pointercancel和场景退出，却漏掉独立的document.hidden事件。Phaser在隐藏时暂停帧循环，不会替应用清除已按下动作或原生长按定时器。

先写两条失败回归：无窗口blur的隐藏→显示→旧松手仍执行；长按定时器不取消。[红灯报告](red-unit.json)为2失败/6通过。三档基线应用进一步复现：按住换牌，隐藏/返回后旧松手实扣2金（6→4）；按住商品后隐藏，迟到的长按会打开购买详情。这不是规则或价格问题。

修复只让共用输入层在页面隐藏时沿既有取消路径清除按压、长按计时器和触点，释放视觉，并保留派生信息刷新；退出场景卸载监听。没有新弹窗、存档字段、自动代用、数值/随机或美术改动。

## 实际检查与边界

- [6文件85项定向检查](unit-results.json)通过，覆盖本次可见性取消、正常可见点击、返回后新动作、长按与延后刷新，以及原连点、牌组手势、持牌与入口保护。[类型/生产构建](build.txt)通过，保留已有大bundle提示。
- [基线原报告](before-native.json.gz)与[修复原报告](after-native.json.gz)：1366×900鼠标、390×740/DPR2与320×568/DPR2触控，各正常新局进入商店。修复后三档中断释放均6→6金，完整state/journal/storage/RNG相等、迟到弹窗为0；主动再点换牌才6→4、仅一条RerollShop，商品查看/Escape和冷恢复保持完整保存相等。没有导入存档、强制现货/金币/发牌或替换领域命令。
- 基线用只读Vite变换装入8af精确SceneView Git源码，不切换/覆盖工作树；报告记录有效源码哈希。前后报告在提交前运行，固定源码随后原样提交b8707def；所有运行前后哈希相等。领域/应用/内容/音频/platform/public/art及结算源码相对基线无差异，lihui和原图未动。
- 无头浏览器的冻结、切标签与虚拟最小化未产生“隐藏但不blur”，因此本包只控制document.hidden/visibilityState与visibilitychange，事件明确isTrusted:false、blur次数0；鼠标/触控、Phaser回调和保存是实际路径。**这是受控生命周期故障证据，不是假称真实手机切后台。** 目标手机/OS切应用或锁屏的事件顺序与真实隐藏恢复仍待验，不等新图但不代签真机。

实际查看[390基线迟到详情](390-before-late-detail.png)和[390修复后返回](390-after-return.png)。修复后截图的4金来自中断后另外主动点击的一次换牌；中断当时仍6金，完整原报告单独记录，不用截图把主动付款与误扣混在一起。复现根目录命令：PowerShell设置 `$env:POINTER_PHASE='before'` 或 `'after'`，再运行 `node harness/interrupted-pointer.mjs`。P08保持in_progress，旧Windows全量失败保留，本次不重签全量绿或整体完成。
