# PR123 同保底提示返修

父已通过连接器创建 [draft PR123](https://github.com/big-dimple/dachoupai/pull/123)，输入 HEAD `1e575406a995cbf19bab4733d8df249c88f8433c`。原 README、checks.json 和原生图面/保存归档仍记录原输入产品；本次仅修 `GameScene.ts:1142` 提示并增加 `tests/assist-entry-guards.test.ts:19` 的局部检查。

同一公开工程主手中，两张副牌留声纸：确定性不助攻与助攻均为 `412–412`；主手加幸运纸后，不助攻 `412–824`、助攻 `412–1236`。排序仍以保底和少消耗选择不助攻。新增检查实际调用评分器和入口，旧源码明确 FAIL：期望“同保底不助攻”，收到“同分不助攻”。

返修仅用已有 recommendation.random 区分文案：随机“同保底不助攻”，确定性“同分不助攻”；排序、范围、草稿、命令和保存代码不变。两种提示均保留“保留副组，可手选”，入口没有调用 chooseAssist。

必要检查：`npx vitest run tests/assist-entry-guards.test.ts tests/assist-recommendation.test.ts` 两文件10项 PASS；`npm run typecheck` PASS；`git diff --check` PASS。未重跑全套、build、浏览器或全部截图，不用旧原生结果签本次新 HEAD CI。

C2 仍未集成，等待父通知后串行对齐；未改唯一 DELIVERY_PLAN，未合并或部署。精确推送 HEAD 在本次交付回复报告，远端 CI 由父另核。本次没有再次调用先前被拒的仓库 API。
