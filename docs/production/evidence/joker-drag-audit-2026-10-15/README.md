# 大丑牌排序差异核查与最小补齐（2026-10-15）

输入候选：`4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`。开发分支：`dev/joker-drag-audit-20261015`。只在开发分支工作；未合 main、未部署、未创建或重试 Forbidden PR，未访问正式站。无自然试玩、无生成图片、无购买服务。

## 已有实现与改动边界

先读仓库 AGENTS.md、DELIVERY_PLAN 当前入口及原拖拽合同。工作区 `/workspace/.agents` 与 `.codex` 为空，仓库无 `.agents/skills`；没有可读的对应本地技能。按用户本轮明确整体并发覆盖历史串行文字，另开显式 Astra 只读审查/独立测试窗口；不保证平台模型与计费。

候选已经接通两场景的 OwnedJokerInput/OwnedJokerDragVisual，无须重造系统：
- GameScene.ts:342–356 复用输入与鼠标查看；402 的 ownedReady 锁住补牌/押注/计分。
- GameScene.ts:1330–1343 复用拾起、跟手、插入和 ReorderJokers；1254–1289 从真实保存结果决定落位。
- ShopScene.ts:144、870–886、945–995 对应既有商店路径。
- OwnedJokerDragVisual 保留16px/1.06抬起、110ms让位、目标槽占位、保存中及150ms落位。
- OwnedJokerInput 保留355ms定时拾起、10px触摸预移动取消、固定轨道touch-action:none、轨道外DOM滚动、blur/hidden/Escape/多指/丢失捕获等取消。

**唯一产品增量**：共享输入首次确认触摸拾起请求一次12ms `navigator.vibrate`，鼠标不请求。能力不存在、返回false或抛错均不阻断视觉或保存；没有落位成功振动。产品提交 `66994ac8fb347b865a7169aad3837502266144e1`，后续 `f418a15cb4176650053d1baf0ed0c9e2ff88be25` 仅修观察器属性配置。

**供父整合的公共文件清单**：GameScene.ts **0改动**；ShopScene.ts **0改动**；OwnedJokerInput.ts 新增一个import和首次lift内一次helper调用；新增 OwnedJokerHaptics.ts。领域、计分、保存格式、布局、现有拖拽视觉、图音资源均与输入候选逐树相同。

## 定向检查

- 85测试/5文件通过（checks/targeted.txt）：包含现有所有1–5槽插入、无效序列、延迟保存、保存失败固定候选重试，以及新增可选触觉回退和真实计分。
- 新增计分证据：现行 newRunIdentity、满五槽合法受控库存；全息碰瓷+2与f06×2换序，经 SavedRun → 冷恢复 → 相同单牌 PlayHand，sourceJokers与事件顺序不同且分数不同，RNG一致、完整checkpoint与末手trace冷恢复一致。不冒称自然获取这些牌。
- typecheck与build通过（checks/）；build是产品提交66994ac8，最终产品src完全相同，既有chunk体积warning保留。
- 浏览器验证状态及截图见下一段；不是自然局、实体设备、听感、人类理解或整体游戏验收。

## 冻结版浏览器结果与实际图审

同一冻结观察器/源码 `f418a15cb4176650053d1baf0ed0c9e2ff88be25`，两份report的modified均为空，产品src树 `504188800d34181a90349362a78a451d72b34f0d`。

| 场景 | 有界软件窗口 | 结果 |
|---|---|---|
| 局内 | PC1366×900；390×844；390×844低动态/DPR2 | 全部PASS，9次前后/中间真实排序、37种取消窗口、3组失败重试及冷恢复；补牌/骰爷待定/真实计分演出锁保持 |
| 商店 | PC1366×900；320×740；390×844；412×915；390×844低动态/DPR2 | 全部PASS，15次前后/中间真实排序；既有取消、延迟保存、失败重试、冷恢复及进入牌桌持牌检查保持 |

`table/report.json`、`shop/report.json`和各自`full-state-journal-storage.json.gz`保留完整输入与保存对照；checks保命令结果。触摸脉冲使用mock观察，鼠标零请求，三种不可用回退仍有视觉拖放且同槽释放保存不变；不作硬件触感结论。局内菜单触摸滚动scrollTop从0到145；pinch scale仍1，未证明整页缩放。所有窗口pageerror为空。

实际打开检查7张完整PNG，仅对所列图审签有限结论：已有牌面身份/整排让位、抬起/目标位、手机及PC整屏和保存后回位可见。未逐张人工查看其余自动截图，不签整体美学。
- [局内手机拾起](table/390x844-slow-held.png) / [移动至第五槽](table/390x844-slow-mid.png)
- [局内PC移至第五槽](table/1366x900-slow-mid.png) / [手机保存重试后](table/390x844-save-retry.png)
- [商店320](shop/320x740-slow-mid.png) / [商店390](shop/390x844-slow-mid.png) / [商店PC](shop/1366x900-slow-mid.png)

## 失败记录（保留，不用新PASS覆盖）

1. 计分测试开发夹具：06:07:26，`npx vitest run tests/joker-order-score.test.ts`，`Error: invalid-save-opening-state`（checkpoint.ts:860→891，SavedRun.start:31）。首店直接替换库存违反守卫；修正为原LeaveShop/EnterStage后保存场内合法夹具，没有改守卫。
2. 同一测试06:07:40，`expected [ 'f06' ] to deeply equal [ 'pengci', 'f06' ]`。现行身份碰瓷只在三条生效；使用合法全息版次提供每手+2，原规则保持，06:08:07单文件PASS。
3. 66994ac8首轮两浏览器观察器启动FAIL：新增探针默认只读，Phaser `device/Features.js:170` 在初始化规范化navigator.vibrate时抛 `Cannot assign to read only property 'vibrate'`，继而title wait 30s超时。未进入任何拖拽验证。原report、gzip和日志保在table-observer-fail、shop-observer-fail及checks。f418a15c仅将探针设为writable；产品不变，未放宽超时/断言。

## 验收限制

振动调用是可选请求，云Chromium的API存在、mock计数或返回值均不证明硬件振动、系统允许或用户感到触感。Android同设备/浏览器商店对局内对照仍NOT_RUN；不支持的平台不声称实机通过。hidden/blur/dialog/捕获是受控事件，不能代签物理切后台。现行固定持牌轨道无滚动内容；触摸预移动取消与轨道外菜单真实滚动分别验证，不宣称整页pinch通过。
