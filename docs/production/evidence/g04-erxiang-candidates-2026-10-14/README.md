# G04 二响同名交棒候选：有限软件整改证据

基线 main `c2b506174d9add1df43eb9d94dbebe2bb974090f`，产品提交 `01a3a59080f67bd21a64b66c983fe33a1dd75f2a`，产品 src tree 与逐文件哈希见 [scope-proof.json](scope-proof.json)。承接原18局 G04 的“技能同名目标未标增强”观察，不重做已合 PR166/170/171，不修改旧复盘或旧交付计划。未合 main、未部署。这里的检查是受控公开手牌的软件浏览器验证，不是 dot 实际自然游戏、原 G04 存档复跑、实体设备、人类理解或听感验收。

## 先复现，再最小修补

在基线正常当前身份 `quality-r2-bounded-clear-v1` 的第一场合法 checkpoint 中，公开手牌第1/3/5/6张均为9♣，分别为无增强/普通、热度纸/闪箔、玻璃纸/多彩、热度纸/闪箔；最后两张热度纸还覆盖属性完全相同的独立实例。公开手牌受控设置并通过既有严格 checkpoint 校验，不扫描随机种子、未来牌序或运行18局。

基线 PC1366/390 实际入口均复现四个完全相同的“9♣ · 9点改加倍率”按钮，退出保存不变。见 [原报告](baseline/report.json)、[PC 原图](baseline/1366-candidates.png)、[手机原图](baseline/390-candidates.png)。

产品仅在 `GameScene.inspectErxiang` 消费候选展示字段，并在 `ErxiangHandoffCopy` 增加当前手牌位置、真实增强与版次。身份直接对应原卡对象和原 ID，位置取当前 handOrder；即使增强/版次也完全同名，手牌位置仍能区分。增强名及简述复用现有内容、版次复用既有标签。每项明确“交棒：首次普通9点热度 → 倍率”，说明增强、版次和额外计分仍按各自规则生效；不把热度纸的+20加入交棒9点，不预测整手总收益。

`inspectErxiang` 之外的 GameScene 字节完全相同；资格过滤、ID回调、ready/序号检查、选择/取消/失效清除及保存接线原样。领域、application、内容身份、公共拖拽、公共英雄第一层、CSS、DetailDialog、音路、结算与资产均未改，见 scope proof。专属测试和 harness 为新增验证文件。

## 验证结果

- 定向 `tests/g04-erxiang-candidates.test.ts` 与既有 `tests/erxiang-handoff.test.ts`：16/16通过；`npm run typecheck`、`git diff --check`通过。既有测试覆盖重计分/版次/增强只重定向首次普通执行、B08/Q01、0点、已用、保存失败与恢复，不跑无关本地全库门禁。
- PC1366鼠标、390触控均实际打开统一英雄入口→技能操作；四个同名实例逐项选中准确ID，重复查看/返回/取消全state、journal、storage和localStorage不变，取消计分核心后交棒草稿按原逻辑清除。
- 两端各一次普通牌与热度纸真实选择和实际出牌，共四笔 `PlayHand`。原领域 `applyCommand` oracle 的完整state/trace、真实保存state/journal与UI提交逐字段一致，精确目标为 diamonds-9 或 hearts-9，交棒只9点且一次；同手实际15732分。完整初终state及保存见 [full-state.json.gz](candidate/full-state.json.gz)，非仅比较最终分数。
- 两端各一次真实保存 commit 受控挂起，普通英雄入口的操作按钮禁用、查看退出无保存变化；专属 harness 直接查看候选也确认 ready 守卫全部禁用，放行后仍只一笔原命令。受控挂起是验证机制，不是人为自然游戏操作。
- 两端合法 B08、Q01、已用 checkpoint 均无候选；B02第四计分牌首次普通点数为0，三个有效候选保留、零点实例不出现；查看/返回全保存不变。见 [最终报告](candidate/report.json) 的 negatives 和忙碌记录。
- PC1366/390及必要320同态只读缩窗：按钮至少44px、16px字，说明至少14px，无水平文字溢出；逐候选滚动后按钮在视口内，底部返回固定。320使用既有滚动区读取全部候选，不缩字。已实际查看 [PC](candidate/1366-readable.png)、[390](candidate/390-readable.png)、[320](candidate/320-readable.png) 及忙碌/负例截图；这是软件Canvas可读可点证据，不签实体设备或完整游戏美术。

浏览器最终报告在基线HEAD、待提交产品工作树运行；其产品文件与后续 `01a3a590` 完全相同，harness随后与产品一并提交，最终证据提交不改产品。按 scope proof 校验，不把报告的基线HEAD字段误称洁净产品构建。

## 原失败与交付边界

首轮浏览器及首轮定向测试误把增强 heat-paper 的内容名“热度纸”期待成工具T10名“加厚纸”；浏览器FAIL与完整实际文本保在 [first-observer-report.json](failures/first-observer-report.json)。首轮定向15通过/1失败，同因名字断言；仅修验证期待为真实增强名，产品不变，随后16/16和最终浏览器通过。未放宽资格、保存或数值断言。

`gh auth status` 显示环境GH_TOKEN无效；Git正常推送开发分支成功、已连接GitHub工具只读成功，PR/CI通过该连接处理，未重试该无效令牌。最终精确HEAD的CI结果在PR回执中核验，不借main旧绿CI。dot自然游戏及体验验收仍由父/dot独立执行，本批不代签。

## 2026-10-14 父独审专项断言补正

父独立复核指出：旧专项测试 `specials()` 用 `sourceDefinitionId === 'heat-paper' / 'glass-paper'` 过滤增强，但真实 trace 的该字段是扑克ID，增强类型标在 `reasonKey='enhancement.*'`。因此旧专项比较实际只覆盖版次；上方旧16/16结果仍是当时事实，不能据该断言单独签增强等价。

本次仅修 `tests/g04-erxiang-candidates.test.ts`：过滤真实 `enhancement.*` 和 `edition.*`，将 reasonKey 纳入事件值/操作/源实例/目标对照；对于普通牌与热度纸两种交棒目标，各自的交棒trace和普通出牌baseline，均在**过滤后的事件数组**中明确要求热度纸目标 hearts-9 的 `add-heat +20`、玻璃纸目标 spades-9 的 `multiply-multiplier ×3/2` 实际存在，再逐项比较全部增强与版次事件。这样误过滤增强或增强事件缺失会失败，不靠版次数量或空数组相等通过。

补正后再次运行两份定向测试，16/16通过，`git diff --check`通过。产品src tree保持 `54ffc284788ea4da175c61f42a58e53303a9684c`，原规则、产品、harness与既有浏览器证据均保持；scope-proof中的旧测试哈希仍按原产品提交保历史，本节记录后续专项测试补正。新HEAD精确CI在PR174回执另核，不借原 `a2cadbab` 的绿CI签新测试提交。

复跑专属验证：`G04_OUTPUT=shots/g04-erxiang-candidates node harness/g04-erxiang-candidates.mjs`；基线复现需在上述基线 checkout 用 `G04_BASELINE=1`，不能用产品版本冒称旧问题复现。
