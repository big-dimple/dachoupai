# 第二批正常集成：交易、拖拽、字幕、软件渲染与技能提醒

用户恢复授权后，从 `6dfc2a63a604a9068d7468189c0c189a6fbaeb58` 继续同一开发分支 `dev/astra-integration-20261015`；原环境恢复成功，起点SHA一致、工作区干净。原第一批成长/升级/计划完整保留，不合main、不部署、不强推、不重试Forbidden PR。

## 精确来源与合并

| 完整分支输入 | 来源HEAD | 正常merge提交 |
|---|---|---|
| 交易接续 | b28d36de9ebc4f6016b4dcd48b00362d40f2b9f0 | db7289b0b1502d8f3eb6d27860c23f86241981bd |
| 拖拽/可选触摸拾起震动 | b276b07e7b84880e0aa313251da8a0db874faf38 | 6a907e293f0623792ee119346b7b4e1cb8f756e8 |
| 六英雄字幕/老幻技能名 | a8e420ca5ecdcc1556800470cba1299e2e332daf | e82d2b1a259638d0edda21ef4beaf4f995feae43 |
| 软件renderer性能修复及证据 | e84ed553d303e38ee01892cef436581ec7e4410c | 8cab2c526486a978eaa63211962c01cf7f9e934c |
| 前两场可用主动技能提醒 | ef009924377e7ac337c7b38cec5a694a0f4856a7 | 154c7942da696f8bec7bde3dc8e082d3fab8eafa |

全部保留产品提交及证据祖先，没有只取末尾证据提交。五次ort正常合并，没有文本冲突。最终产品源码为 `154c7942`；随后 `f75f86e4303e967755d82fbabc714d5c9264b17d` 仅补旧AI测试替身（dialog.current与selectionPreview），src/harness与154c7942逐字节相同。本证据提交只增加报告及上级链接。

[来源核对](provenance.json)用每个来源的完整diff依次作用于上一集成文件，再与实际合并逐字节比较；GameScene/ShopScene等公共文件按累积差异核对，而非整文件覆盖。最终五来源merge树恰为其完整差异组合，后续唯一额外文件是上述测试替身。

- ShopScene保留上一批升级已保存结果的shopPracticeEffect，同时保留pending view深拷贝、runId/seq/完整action精确匹配、失败固定候选重试及成功非重复RerollShop的新现货首屏上下文。
- GameScene保留成长读取/新增分层、老幻真实身份技能名、常驻字幕；技能提醒在ready/演出/modal锁后、dispatch前，返回只走原技能面板，不代选助攻。
- 触摸首次拾起仅一次12ms可选vibrate请求；鼠标不请求，缺失/false/抛错不影响视觉和保存。
- 明确软件renderer或无WebGL走Canvas，硬件/未知保持AUTO。领域、application、content、audio、public/art、Viewport、9MP/DPR、原screenshot烟测、ci.yml的15分钟预算及全局style均保持上一集成版本；仅追加来源原有独立诊断workflow，不改CI预算。

## 最终源码的实际检查

- [全量单测](tests.txt)：256文件、3542项通过。[typecheck](typecheck.txt)、[build](build.txt)、[content](content.txt)、[32包计划检查](plan.txt)通过。测试与后续原生观察器均在洁净f75f86e4启动；原Vite大包警告保留。
- [原PC/手机烟测](smoke-result.json)与[日志](smoke.txt)：系统Chromium151，原normal animation、desktop1280×720/DPR1与mobile390×740/DPR3、手机backing1170×2220，原点击/弃牌/出牌/保存恢复及缩窗状态断言通过。该次HEAD为154c7942，之后仅改测试替身；src和原烟测字节与最终源码相同。未修改烟测断言、等待、浏览器flags或DPR。系统Chromium是本地辅助证据，不冒称原CI三引擎结果或物理性能。
- [交易六条链](transactions/report.json)：PC1366×768、390×640、320×528，每端直接购买/购买故障重试；24笔成功事务完整state/journal/current/previous/revision按原applyCommand相等。使用失败重试恢复已有页及合法滚动位置，买来使用后取消保留已付工具，冷恢复保持，真实换牌后新现货scroll=0；sourceStable=true，pageerror均0。
- [商店拖拽](shop-drag/report.json)与[牌桌拖拽](table-drag/report.json)：使用原观察器SMOKE模式，商店320/390、牌桌390/1366，每行一次原生首槽→第五槽，真实抬起/跟手/让位/落位及保存完整对照，手机一次脉冲、移动/释放不重复，PC零脉冲。SMOKE不包含全量取消/保存失败窗口，不能用本行冒称已全量复跑。
- [字幕五例](captions/summary.json)：PC燃金、390燃金4×、交棒低动态/菜单快进/退出；原生真实技能/出牌保存对账，常驻作用来自实际保存来源，字体独立scale1、镜头文字不相交。完整postrender记录见压缩report。
- [老幻双端](laohuan/summary.json)：PC1366与390普通模式，真实弃/留牌、原命令/保存与冷恢复相等，标题“戏法换牌”、多看/实际留牌/不增加计分常驻；主体约1016ms，无新增等待。
- [技能提醒](reminder/summary.json)与[完整报告](reminder/report.json.gz)：PC1366×768、390×740各六英雄，12次返回后正常出牌，原state/journal/storage/current/previous/revision对账；返回不代选、继续一次提交、重复处理器/双击、保存失败固定重试与冷恢复、Escape去重、过期选牌/busy回调不提交及关闭偏好均通过。另含320×568与740×320冷加载检查，不能当作动态缩窗触摸通过。localStorage失败会话回退、前两场各一次与真实available资格由专属单测覆盖。

最终全部原生报告绑定f75f86e4且dirty为空。完整保存/演出原始对象以各目录gzip保留；大reminder原报告仅无损压缩，summary另列原始SHA256。所有150张原生截图的文件名/哈希与是否入库见[screenshot-index](screenshot-index.json)，只保存代表原图，未入库原图保在/tmp/astra-integration-final，不能把清单当逐张图审。

实际view了原烟测PC/手机整屏、商店320拖拽、牌桌PC中间位/390拾起、燃金390首镜头、老幻390技能镜头、PC阿默提醒、390阿默返回面板/老幻提醒、320冷加载提醒及740冷加载底部。交易PC/390/320在追加性能前的完整同源窗口也已查看，其报告身份见下段；不将旧图冒称最终源码新图。

## 失败、阶段证据与未解决项

[first-full-test-FAIL.txt](first-full-test-FAIL.txt)：加入技能提醒后的首次全量1失败/3541通过，旧AI取消测试用Object.create构造场景，没有dialog导致读取current抛错。仅补测试替身的无弹窗与无预览接口，保留原dispatch/取消/失败后重建断言；[两文件复核](fixture-tests.txt)及完整3542复跑均通过。产品没有为测试降低modal锁或资格检查。

[追加性能/提醒前的报告](before-performance-reminder/provenance.json)绑定e82d2b1a：3512单测、交易六链、商店五组/牌桌三组全量拖拽（失败重试/取消/触觉回退）、字幕五例和老幻双端都通过。它们是追加授权到达时已运行中的完整快照，随后落盘才合入性能/提醒；不能把这批旧HEAD全量窗口代签最终源码。因此最终HEAD又执行了上面的软件全量、原烟测和相关原生复核。

**仍未解决：** 动态缩窗后的触摸坐标偏移是源分支已在4d2ff4ca复现的独立缺陷，本批没有修。320/740冷加载与烟测缩窗状态相等不证明该故障已解决。硬件/未知AUTO、实体手机振动/性能、Firefox/WebKit本地、听感、真人阅读、新手理解、自然经营和平衡未在本批签收。

来源产品3782da11的CI38691130036属于旧单包；没有移签本集成。ci.yml的push分支过滤不含dev/**，本批未确认新HEAD远端CI，未创建或重试Forbidden PR，也未为触发CI改分支/权限/预算。远端最终SHA和main保持情况由最终交付核对。
