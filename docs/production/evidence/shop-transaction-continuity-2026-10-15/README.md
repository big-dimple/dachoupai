# 商店刷新购买与献纸交易接续（开发候选）

基线候选 `4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`，独立分支 `fix/shop-transaction-continuity-1015`；产品提交 `27004423dbd2a1ac7aceda37576e07e0c1613e4f`。仅开发，不合 main、不部署、不重试此前 Forbidden PR。已读取 AGENTS.md、DELIVERY_PLAN.md 当前及原工具经营合同，复核 PR128/140 既有证据；保存环境 `/workspace/.agents` 为空、仓库没有 `.agents/skills`，未虚称读取不存在的技能。按用户并发要求分为主实现、只读独审和专属原生验证；不自然试玩、不生成图、不购买服务。

## 已有实现保留与真实缺口

- **已有且本轮复验：** 购买先扣款入库，主动确认使用才消费；买来存着不自动使用，购后取消保留已付工具。献纸1–2受益与独立牺牲、筛选保留选择、永久损失提示、固定确认/取消、手机大选牌工作面及原子固定候选重试已存在，没有重做。
- **真实首屏回归：** 新升级服务区排在随机现货之前；即使没有可升级手型，其标题/说明也把320×528献纸用途和价格挤出首屏。原候选的完整失败报告、存档与[原失败整屏](before/FAIL.png)保留。仅将随机现货提前到服务区之前，不改任何报价、额度或服务效果。
- **真实重试返回缺口：** 保存失败的临时接续原来不带 `makeCardsView`，重试成功路由重建场景后丢原页签/滚动。现在与原待保存命令一起深拷贝视图，仅原有runId、序号与完整action精确匹配后恢复；不重派发购买或使用。
- **商店换牌后的旧位置：** 仅成功且非重复的 `RerollShop` 清理旧现货焦点/回执，将选购页位置归零，保留已有页的位置。普通查看/取消仍回原处。T18通过UseConsumable刷货继续原工具接续，不宣称本改动重置所有刷新来源。

## 有限验证

[软件检查与保护树](checks.json)：113项/8文件定向测试、typecheck与生产build、32工作包计划校验、diff-check通过；原大bundle警告保留。领域、内容、application、platform、audio、所有美术/public、工作流、GameScene、ConsumableDialog及style.css对象均与候选相同。远端CI按最终SHA另核，不借旧CI签本提交。

[七尺寸献纸报告](mobile/report.json)及[完整state/RNG/journal/storage](mobile/full-state-journal-storage.json.gz)绑定产品提交：320×640、390×640、412×740、320×528、390×528、412×628、PC1366×768全部PASS。合法当前身份工程检查点经原校验、正常菜单导入，不是自然供给样本。每端真实献纸8金购入→选目标/筛选/预览/取消→再次主动使用，完整结果等于原applyCommand；390×528真实IDB quota失败，原生重试只保存原候选一次；390×640另核买来存着及覆盖取消。短屏选牌工作区272px（320×528），占视口超过一半；固定动作48px可触。

实际查看的完整截图：

- [320短屏现货首屏](mobile/320x528-purchase-first-view.png)
- [320献纸选定与固定确认](mobile/320x528-sacrifice-selected.png)
- [390献纸两受益与牺牲](mobile/390x640-sacrifice-selected.png)
- [PC选牌与真实预览](mobile/1366x768-sacrifice-selected.png)
- [390短屏保存失败后原菜单重试入口](mobile/390x528-save-failed.png)（菜单当前位置，不宣称所有菜单行同时可见）

原检查使用已有脚本 `harness/mobile-tool-workspace.mjs`。新增[交易连续性六链报告](continuity/report.json)与[完整存档](continuity/full-state-journal-storage.json.gz)同产品HEAD、运行前后源码与观察器SHA256一致；PC1366×768、390×640、320×528各直接购买/购买故障重试两行全部PASS。合法U07/e09容量、九已发现手型工程夹具仅用于受控覆盖，不是自然获得率。

每行通过正常菜单导入后，深处基础自选取消→买来存着（直接成功或IDB quota失败重试）→已有献纸选独立牺牲/受益→使用quota失败重试→关闭真实结果返回原列表→冷重载/继续→真实点击商店换牌→新现货首屏→买来使用→取消保留。每行两笔购买、一笔使用、一笔换牌，共24笔成功事务；每笔完整state/RNG/journal/current/previous/revision均对原applyCommand，失败仍是完整旧保存，失败时捕获的固定候选与重试后current/previous逐字相等。页面无error。

列表内容变化后按合法最大值夹限，不虚报完全同像素：消费重试后PC40→40，390已有页169→122（新max122），320已有页341→273（新max273）；页签保持，已消费对象不强行恢复不存在焦点。普通取消保持原滚动与焦点；所有真实商店换牌后选购页scroll=0。PC两栏没有手机页签，按正常做牌入口保持purchase；没有强点隐藏tab或注入页签。

实际查看：[PC多服务现货优先](continuity/1366x768-retry-first-stock.png)、[手机重试返回已有页](continuity/390x640-retry-owned-restored.png)、[320换牌后现货](continuity/320x528-retry-rerolled-first-screen.png)、[320新现货购后未用](continuity/320x528-retry-fresh-purchased-tool.png)。所有原PNG保留在运行环境，完整清单及哈希见[截图索引](raw-screenshot-index.json)；清单不代表逐张图审。

[原观察器失败](observer-failure/report.json)保留：debug2误用PC不存在的action/tool-inventory，等待超时；修观察器使用可见做牌入口，未改产品或交易断言。期间脚本仍在开发，故该失败报告sourceStable=false；最后整轮六行同脚本sourceStable=true，未拼接旧PASS。旧集成报告的“失败重试返回滚动”没有相应精确断言，本轮专门补足，不覆盖改写历史报告。

## 父整合窗口

- `src/game/MakeCardsDialog.ts`：`showMakeCards` 内仅调整随机现货与升级服务DOM顺序。
- `src/game/ShopScene.ts`：`send` 保存失败pending加入view快照，`resumeMakeCards`精确匹配后恢复view；成功RerollShop重置选购上下文。没有更改GameScene；没有更改公共交易/规则接口。
- `tests/make-cards-flow.test.ts`：既有恢复命令用例增加上下文恢复、深拷贝及不匹配命令不污染视图断言。
- 专属harness与本证据目录；未修改唯一计划、AGENTS或其他并发产品窗口。

仅软件Chromium/CSS视口、DPR1、低动态的受控原生点击/触控。未验实体设备、其他浏览器、听感、自然获取/三路线经营、总体平衡或整体美学；本包与CI都不是整体游戏验收。冷刷新恢复验证只保证持久状态，不承诺重载后恢复临时弹窗或草稿。
