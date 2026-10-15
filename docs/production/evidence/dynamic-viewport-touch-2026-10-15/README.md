# 动态缩窗触摸恢复：复用 B05 修复与剩余持牌轨道补齐

分支 `fix/dynamic-viewport-touch-20261015`，从已限定复核的提醒候选 `ef009924377e7ac337c7b38cec5a694a0f4856a7` 独立建立。最终产品/观察器冻结 `e8702e673bb428b357373556b5cc97e3d5a970d5`。本任务按明确恢复后的 Sol6.1 指令执行；未再启动代理、未自然试玩或生成图片。

## 复用结论与父集成提交

父提供 B05 最终交付 `03583e15ffc1b3e00c2842e479a51e10ba79da23` 和验证源码 `af08a36ab45fc3a60edd0dd8c902ddfd85496db5` 后，实读其 diff，确认同一根因。停止另写 Viewport/HandSelectionInput 修复，仅取两个独立输入提交，不带入 B05 其它演出：

| 原作者提交 | 本分支独立复用提交 | 实际范围 |
|---|---|---|
| `653d23c2ec87133907c0cfd4ba4679260137a344` | `e340b946` | HandSelectionInput 用 canvas ResizeObserver 同步最终 CSS 手部触区，含原作者测试 |
| `af08a36ab45fc3a60edd0dd8c902ddfd85496db5` | `e573b05afa52790eb48c0a93367c8be8657d2ce6` | Viewport 最终 CSS 写入后同步 Phaser displayScale，含原作者测试 |
| 本任务仅补真实缺口 | `e8702e673bb428b357373556b5cc97e3d5a970d5` | OwnedJokerInput 同步最终 CSS 持牌轨道与 observer 清理；2项专属回归测试、两个原生观察器 |

上述前两组四个 src/test 文件，逐字节等于 B05 给定版本。父若已集成原作者两笔，不要再重复取本分支两笔适配提交；新增产品窗口仅 OwnedJokerInput 及其专属测试/观察器。所有产品提交均只在开发分支，未合 main、未部署、未重试 Forbidden PR。

## 原失败、复用成功与新增缺口

1. `before-reuse/` 在 ef009924 上重新复现：390×740 触摸context → 不刷新缩至320×568 → 合法公开手牌导入/选两张8 → 点击出牌 `(220,507)`，Phaser收到 `(180.5128205,389.1567568)`，误增选 K，commandSeq仍3、完整state/journal/IndexedDB未变。displayScale仍为320/390与568/740，而canvasBounds已320×568。
2. 单独复用后，原坐标恢复。最终 `exact-final/` 在洁净e8702e67上核：同一实际点击 `(220,507)`，Phaser收到 `(220,507)`，仅原提醒弹窗打开、两张8和完整保存保持，不再误点K。报告 `reminderOpen=true`、status=PASS。此路径确实先动态缩窗，没有reload。
3. 复用两笔后新增连续旋转验证发现另一真实缺口，原失败保留在 `reused-owned-rail-failure/`，源码head=e573b05a。320→740×320后，原HandSelectionInput与Phaser比例均正确，但 OwnedJokerInput 仍以旧CSS矩形布局：实际首牌槽x=190/y=12，轨道x=82.15625/y=21.296875、width=48.9375；触摸没被轨道接收，长按打开了详情而未保存调序。该失败不能由B05原PASS覆盖。
4. 仅给 OwnedJokerInput 保存当前逻辑bounds，并用同作者手牌方案的 canvas ResizeObserver 同步CSS轨道；bounds清空和destroy后不再更新，disconnect及destroy幂等。不另写坐标算法、不改拖拽阈值或提交路径。最终8种动态尺寸下，两原生轨道与实际布局相差均<0.1 CSS px，8次调序均只保存一次。

最初探索性3项单测在未修源码上2项失败，其中“scene resize回调必须已见最终CSS”的同步断言并非采用作者观察器方案的合同；停止该探索并移除未提交文件，沿原作者测试和下面的真实动态操作核验，不伪称探索测试通过。

## 最终定向验证

`checks.json` 为证据索引/哈希、原作者与本地提交关系和边界；`build-info.json` 是原洁净构建身份。全部最终浏览器报告 head=e8702e67，modified/dirty为空；本文与证据提交不改变产品/观察器。

- 7文件94项定向Vitest通过，覆盖原14视口/21手输入及手势、指针释放、SceneView与持牌反馈、新持牌轨道生命周期；类型检查通过。测试是在冻结前相同产品/test字节上执行，未重跑无关全量或旧完成工作。
- 冻结后 `npm run build` 通过（含tsc），保既有大chunk提示，无构建错误。
- `dynamic-final/report.json.gz` 保存完整state/journal/IndexedDB，`summary.json` 保留尺寸/轨道/指针/命令摘要。软件Chromium DPR1，触摸使用原生CDP touch，鼠标使用原生mouse，弹窗使用DOM按钮；没有注入假pointer坐标或调用产品处理器代替操作。
- 触摸同一页面连续：390×740 → 320×568 → 740×320 → 390×740 → 1366×768 → 320×568。
- 鼠标同一页面连续：1366×768 → 390×740 → 740×390 → 1366×768。
- 每条路径在原活动牌桌上直接缩放，**不重新导入、不冷加载**，核手牌横扫准确选两张8，技能弹窗与工具包打开/关闭保选牌及完整保存，随后长按/拖动两张持牌，按原ReorderJokers逐字段核完整state、journal、当前/备份checkpoint及revision只增加一次。
- 两种输入各追加：手牌横扫中旋转保已选且不提交；持牌拾起/拖拽中旋转取消、不提交旧动作且恢复输入；技能弹窗打开时旋转后仍可关闭、保选牌/保存，后续工具包可正常打开/关闭。
- 两种输入最终再动态缩至320×568，原 `(220,507)` 出牌只提交一笔PlayHand，完整结果与原领域命令相等，实测Phaser指针均 `(220,507)`。每个浏览器context仅1次主页面导航，明确没有用reload通过代替动态缩窗。
- 共8次实际调序与2次实际出牌的保存全量对照；无浏览器pageerror。原尺寸截图随各报告保存。已实际查看横屏调序后、PC调序后及原失败坐标恢复提醒三图；不将这些图代签整屏美术。

## 文件窗口及验收限制

相比ef009924，仅三个产品文件变化：复用的 `src/platform/Viewport.ts`、`src/game/HandSelectionInput.ts`，和补缺的 `src/game/OwnedJokerInput.ts`。GameScene、ShopScene、领域/application/content、计分、主启动、公共CSS、音路与图片逐树保持；不调整DPR、9MP预算或做性能优化。共享持牌轨道供商店与牌桌消费，新增原生调序矩阵验证的是牌桌；不据此签商店全流程或所有商品交互。

限定通过的是软件浏览器中上述动态CSS视口变化、原生输入与保存一致性。物理手机/方向传感器、DPR/GPU性能、听感、人类理解、自然经营/平衡、全游戏验收均未签。原L25报告里的“动态缩窗未签”仍按原SHA保留；本目录为独立输入修复候选补证，不改写历史失败。
