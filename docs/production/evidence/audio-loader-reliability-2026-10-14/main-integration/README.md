# PR172 指定 main 集成收尾

用户本轮授权：把 main `c2b506174d9add1df43eb9d94dbebe2bb974090f` 合入开发分支，定向回归及新 HEAD CI 通过后将 PR172 设为 ready；不合 main，产品范围与既有未验边界保持。本目录只记本轮实际集成证据，唯一 DELIVERY_PLAN 与原失败/浏览器证据不改。

本地/远端原候选均为 `13812a30ca0f1fa010b0f1387079a7db6848a2cd`。已重新核 AGENTS、唯一计划及技能文件可用性；没有新的 AGENTS/计划差异或本地 .agents/skills。远端 main 恰为指定 `c2b50617`，它包含已合 PR171；上游未改 src/audio 或六文件音频回归。

在 `dev/audio-loader-reliability-20261014` 正常 merge 指定 main，未冲突，合并提交 `c35d09b1ad5f1a5addb9770754d3e8a2258ddc13` 的两个 parent 正是原候选与该 main。加载器、18 项专项测试、旧音频证据和浏览器故障脚本逐字节保留；没有再次产品修改，也未改动任何 PR171 文件。

## 本轮实际验证

- [targeted.txt](targeted.txt)：7 文件、78 项全部通过。原六文件音频 58 项（其中加载专项18项），另加已合主线 `settlement-presentation.test.ts` 的20项。命令为 `npm test -- tests/audio-sample-loading.test.ts tests/audio-preferences.test.ts tests/score-recorded-audio.test.ts tests/fire-audio.test.ts tests/failure-audio.test.ts tests/sample-body.test.ts tests/settlement-presentation.test.ts`。
- [typecheck.txt](typecheck.txt)、[build.txt](build.txt)：exitCode=0；原大包警告仍保留。实际测试于上述 merge 提交，最终补证据提交不改 src/tests。
- [protection.json](protection.json)：相对指定 main，产品只差 `src/audio/AudioEngine.ts`，测试只差 `tests/audio-sample-loading.test.ts`，其余差异全在本音频证据目录。上游变更335个路径与本批差异无交集；src/game、harness、结算专项及规则/素材/依赖/CI/AGENTS/唯一计划与 main 同文。产品、专项和原浏览器脚本 SHA256 与初轮已测值一致。
- 原 [浏览器故障证据](../browser-report.json) 保持其初轮版本范围；本轮不重记浏览器故障、自然旅程或听感为新增通过。新最终 HEAD 的标准全量 domain/多浏览器 CI 另按 PR 元数据、日志 testedCommit 与产物 head_sha 核验；结果写在 PR172，避免再提交证据导致 head 变化。

## 边界保持

三路有效加载流水线、每次5秒、每样本本实例最多三次尝试不变。已开始的原生 decode 无法物理取消，超时迟到结果丢弃；预算耗尽后本实例静默，重新加载页面才有新预算。未真人试听、未测物理手机/宿主后台计时节流/GPU/FPS/自然全旅程，软件回归和标准 smoke 不签听感。没有新音效/BGM、资产、规则、场景、高光、结算或依赖修改；main 只作为已授权输入合入开发分支，未将开发分支合到 main，也未 force/delete/修改权限。
