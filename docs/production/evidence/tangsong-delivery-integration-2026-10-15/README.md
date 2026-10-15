# 唐宋牌加载 + R03 开发整合 · 2026-10-15

开发分支 `dev/tangsong-delivery-20261015`，从加载演出 `eba6c158954039dddbe9adeac40fd99df693d565` 建立，正常合入指定 R03 `7dfab9a678d2701219234bc63dea0e987de5cbf5`。两者共同祖先是用户指定加载基线 `9c41dfff2a66ffa66b5cf812c2742caae9cdf125`。

合并提交 `086ea57f2b44ff6e0e9623d2a611f9abfdd51afa`，两个父提交就是上述两项，没有重复实现。无冲突；AGENTS.md 和 DELIVERY_PLAN.md 的 R03 追加证据原样保留，授权规则没有改动。没有接入另一路六张人物的半成品。后续只有新增整合样板和本目录证据，产品 src 树不变。

## 原实现保持

- `index.html`、`LoadingScreen.ts`、`PaperFlow.ts`、`SceneResources.ts`、`BootScene.ts` 与加载分支逐字节相同。日印/山河/三牌动画、真实解码进度、134项预载、12秒重试/文字继续、减少动态偏好与高清DOM文字均保留。
- `GameScene.ts`、`ShopScene.ts`、`ToolCarryIntent.ts` 与指定 R03 逐字节相同。ShopScene 用场景数据传递确切实例；GameScene 在 create 中核验唯一 LeaveShop/EnterStage 序列，等待发牌、可写状态、补牌/演出和说明结束，清掉临时意图后只打开一次原目标选择器。取消、冷恢复、保存失败重试的原守卫没有放宽。
- domain/application/content、CharacterArt、public、art 相对共同基线相同，包含人物资源和所有 manifest；运行时改动严格为两个已授权分支的并集。精确 blob/hash 与祖先核对见 `audit.json`。

## 正常新局闭环

`node harness/tangsong-delivery-integration.mjs`，三档软件 Chromium：PC1366×900、390×844、320×568。390正常动态，另两档减少动态。初始普通新局，不导入checkpoint，不改库存、金币、发牌或领域函数；实际点击标题、辛弃疾/成组路线、商店选购、携带、当前手牌与确认使用。

三档均以正常6金币开始，经基础自选2金买往上挪，明确选择“带入牌桌 · 选手牌”。工具保存入库存但不自动使用；进入牌桌后仅列实际8张手牌，零默认目标且确认禁用。先取消验证不会再次自动打开，再从道具箱打开同一个确切实例，查看K♠→A♠真实前后预览后双击确认，只保存一次使用；与手中原有A♣组成两张A，终态可核。购买、离店/入场、使用分别用原 SavedRun 提交实际命令重放，与浏览器完整 state/journal/storage/current/previous/revision/checksum/RNG 逐字段相等。冷恢复后完整保存相同，不复活携带意图。

PC额外仅移除一个已缓存J牌显示纹理，并延迟这张图片1800ms，不改变本局状态。真实下一场景预载出现3/4解码时，game尚未激活；预载结束后才入场并打开正确的新购实例，证明 `paperSceneStart` 等待加载仍保留场景数据。截图中的3/4来自实际解码状态，产品没有新增等待。

| 视口 | 真实加载 | 购买去向 | 当前手牌 | 实际前后预览 |
| --- | --- | --- | --- | --- |
| PC1366 | [加载](native/1366-loading.png) | [去向](native/1366-purchased-destination.png) | [手牌](native/1366-hand-targets.png) | [预览](native/1366-selected-preview.png) |
| 390 | [加载](native/390-loading.png) | [去向](native/390-purchased-destination.png) | [手牌](native/390-hand-targets.png) | [预览](native/390-selected-preview.png) |
| 320 | [加载](native/320-loading.png) | [去向](native/320-purchased-destination.png) | [手牌](native/320-hand-targets.png) | [预览](native/320-selected-preview.png) |

[PC携带过程中的真实资源等待](native/1366-carry-resource-gate.png)。上述三档购买/预览与PC等待图已实际打开检查。完整主线初终状态在 `native/report.json.gz`，摘要及每条实际命令在 `native/summary.json`。这是一次首局前段真实闭环，不是完整自然经营或长期获取率签收。

## 重新验证

- 定向7文件34项 PASS，见 `raw/affected.txt`。
- 全量268文件3644项 PASS，见 `raw/full-unit.txt`。
- TypeScript + Vite生产构建、内容验证、计划结构验证 PASS，见 `raw/build.txt`、`raw/content.txt`、`raw/plan.txt`。原有大包提示保留。
- 原 R03 浏览器样板在整合源码重新执行，12组 PASS，见 `r03/summary.json`、`r03/report.json.gz`、`raw/r03-first.txt`。覆盖三尺寸、取消/双击/同名实例/冷恢复、普通立即用/携带、商店用、存着、基础自选、B05入场+手牌说明、购买/离店/使用的保存失败与重试；每笔实际命令完整重放相等。B05说明前不打开工具，结束后只打开一次。
- 原加载/缓存样板在整合源码八例全部PASS，结果见 `loading-report.json.gz`、`raw/loading.txt`。
- 编译包PC1280×720/手机390×740两档烟测PASS，含实际出弃/资源反馈/保存继续/手机旋转和短屏，结果见 `smoke-result.json`、`raw/smoke.txt`。

新局、R03、加载和编译烟测四个浏览器任务顺序执行，避免CPU争用。全量检查的产品源码是合并提交；新增样板后 src 树逐字节一致，所有浏览器验证固定同一整合源码。汇总 SHA/源码身份/检查状态与保护树结果见 `audit.json`。

只提交和push开发分支；没有合main、查CI、部署或管理域名。用户主分支决定仍待答复；没有用本地软件PASS代签物理手机、GPU、真人审美/理解、全旅程或主分支授权。上批参考站实看访问阻碍仍按[原加载证据](../loading-opening-2026-10-15/README.md)保留，不冒称本次完成。
