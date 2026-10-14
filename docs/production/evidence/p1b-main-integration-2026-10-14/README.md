# PR171合入已发布main的最小冲突修复

父本批已获用户明确合并授权；父合PR170于 `990312c5eec5524ea4f9497fbbb5b2245cb1601a`，随后合PR166，main为 `c08a77ee573a291b7c05ed4787d27ae5299ea103`。PR171原HEAD `e4177a1d258e53f9f629d2c94ed57d0c0766d9d8` 合并返回405真实冲突。执行前工作区干净、在PR171原分支 `dev/p1b-settlement-20261014`。本轮只正常merge main、开发分支commit/push与必要回归；父负责最终合并，不force、不push main。

## 具体冲突与取舍

`git merge --no-commit --no-ff origin/main` 只有 `src/game/IntermissionScene.ts` 一个冲突文件，两处hunk；[原始combined diff](original-conflict.diff)保未解决状态。

1. 原导入约第34行：PR171用 `selectionPortraitURL` 加载结算人物；main新增 `showHeroExplanation`。保两者导入。
2. 原 `drawResultHero` 约第200行：PR171把旧绘制替换为专用 `drawSettlement/mountSettlementMotion`，main在旧成功与失败绘制里加 `result/hero-details` 点击层。保PR171整个结算接线，逐处移植main的公共说明首层，不恢复旧整段绘制。初次draw返回的英雄图、迟到图片 `paint()` 返回的新英雄图均绑定同一公共说明入口；点击层放进该图的已有artLayer，让原paint销毁它，实测重绘后只一个入口。

main的 `inspectFinale` / `heroRun:run` 自动合并保留，完整留影仍可嵌套打开英雄说明。[保护对象核对](protection.json)验证24对象：GameScene、ShopScene、HeroExplanation、DetailDialog、培养/留影、增强/道具/Catalog、领域/内容/保存/音路/资产/依赖/工作流/AGENTS/唯一总计划同main；HeroClimax和SettlementPresentation同PR171原HEAD。相对当前main，产品只保PR171原三文件范围。没有整文件覆盖、改数值、演出时序、保存或旧档迁移。

实际产品与脚本冻结merge提交 `07b14c10d398282491704c6a179d9ac42ef3fa37`，parents为原PR171 e4177a1d和main c08a77ee，src tree `686ac7e78a2db2a40ae658eda256dd41932d3062`。后续只归档本目录证据；最终head和完整CI以PR171精确读回为准，不能借两源/旧e417 CI。

## 本轮必要软件回归

- [typecheck](checks/typecheck.txt)、[60项/7文件定向](checks/targeted.txt)、[build](checks/build.txt)通过；原bundle警告保持。
- [42条结算说明观察](result-entry/summary.json)/[完整四项保存](result-entry/full-state-journal-storage-localStorage.json.gz)，脚本 [harness/p1b-main-integration.mjs](../../../../harness/p1b-main-integration.mjs)：六英雄PC1366/390各成功与失败页说明、最终留影嵌套说明；重复点击、关闭/重新打开/Escape、Canvas或原嵌套按钮焦点恢复，完整state/journal/IDB/localStorage不变。另两端持住真实人物图请求，初始头像与迟到立绘分别可打开同首层，前后点击层唯一，冷刷新完整保存相同。没有直接调用产品draw/paint、暂停scene或写状态。
- [6条真实出牌标题](source-title/summary.json)/[完整报告](source-title/report.json.gz)，原脚本 [hero-source-title.mjs](../../../../harness/hero-source-title.mjs)：真实谢幕人燃10；e11长期捧场320/390/1366、f06一次性招牌320、二响交棒后原菜单保存退出。完整state逐笔等于原applyCommand、journal仅追加原command、IDB/current/revision正确，首层/演出/退出/冷恢复四项tuple相同。当前e11仍3931、×1.3，同一真实保存fact作为主标题；不声称重播父缺保存的自然24960手。
- [3种牌局拖拽](table-drag/report.json)/[完整保存](table-drag/full-state-journal-storage.json.gz)，原脚本 [table-owned-joker-drag.mjs](../../../../harness/table-owned-joker-drag.mjs)：PC1366、390触控、390低动态DPR2；各3次慢/快/中间拖动真实保存，31项取消保持保存（手机两行各11、PC9）；纵向跟手、占位、延迟保存、真实保存失败/重试/冷恢复、待补牌/待骰爷/真实计分演出禁操作均通过。DOM滚动/缩放仅软件观察；不签实体震动、物理手感或后台。

所有新观察在同一冻结产品上串行运行，定向测试/构建与有限受控UI操作不等于完整游戏体验验收，也不重跑18局。前轮e417/结算/PR170所有原记录按原SHA保历史，本轮不倒签它们的新HEAD。

## 可读画面与完整字节

- [390迟到图前说明](result-entry/390-amo-late-avatar-first.png) / [迟到图后说明](result-entry/390-amo-late-portrait-first.png)
- [1366成功燃金说明](result-entry/1366-xiemu-cleared-first.png) / [390失败页说明](result-entry/390-xiemu-lost-first.png)
- [390实际长期捧场](source-title/e11-390-normal-0.png) / [320五字来源](source-title/f06-320-normal-0.png)

上述六张原尺寸PNG已实际view_image查看；其余截图库保原字节，说明弹窗不借截图签完整结算美学。完整gzip保实际输入、所有tuple、焦点/文本/bounds、source event/fact、拖动手势/写入/锁与page errors；终端原输出分别同目录 `terminal.txt`。SHA256SUMS覆盖本目录全部证据（不含自身）。完整CI完成后在PR描述和交接中给精确SHA/结果，避免将归档CI证据再产生新HEAD。

仍未签：完整游戏体验、自然经营/八章/18局、整段美学与亿分爆发达标、音频听感、实体手机震动/GPU/FPS/后台。新图审与自动检查仅签各自有限范围。父负责最终合main与部署，本轮未执行。
