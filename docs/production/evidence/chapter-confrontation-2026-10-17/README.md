# 章节三场对峙候选 · 2026-10-17

基线 `f81724b57736c7d4f299cf1d95705a7ba3ef9497`，分支 `dev/chapter-confrontation-20261017`。只修改 BlindSelectPresentation、其专属 CSS 与两份 view 测试；GameScene、ShopScene、共享 DetailDialog、领域规则、数值、素材字节与存档键均未改动。

当前可战场占主要面积，复用本局角色的已授权立绘；另外两场保留递进预告。压轴展示真实 Boss 名、规则、应对与不可跳过限制。删除重复章节标题、重复开战按钮、未来场次的无效按钮与红色警告框。只有底栏一个主开战按钮，跳场为次操作，关闭为轻按钮。手机竖屏、320 与短横分别排布，正文可滚动，操作留在底栏。

基线实际上没有跳场确认视图，本包增加同页确认；确认意图不进存档，取消/Escape 不提交命令。原 SkipStage 保存、同一候选重试、晚结果保护和扁平 IntermissionResult 处理段按换行归一化逐字相同。正场道具栏满时明确显示实际替代奖励 1 金。

实际验证：

- `npm test -- --run tests/blind-select-presentation.test.ts tests/opponent-encounter.test.ts tests/opponent-cues.test.ts tests/opponent-challenge.test.ts`：27/27 PASS。
- `npm run build`：类型检查与生产构建 PASS；保留原有大 bundle 警告。
- `git diff --check`：PASS。
- `node tests/blind-select-presentation.browser.mjs`：Windows Chromium 153.0.8010.12，构建产物，14 项有限检查 PASS，0 pageerror。完整结果与精确 sourceHashes 见 [report.json](report.json)。报告 HEAD 是构建时的基线，sourceHashes 固定实际被测工作树源码。
- 真实输入包括：选角到商店；商店章节开关；目录关闭保留本局与重开；跳场确认/Escape 取消；唯一开战；手牌选择/取消；首场四手低牌失败、同种子同身份重试；一次真实跳场只保存一笔奖励并进入结算。
- 16 个 Boss 定义的原规则与应对有 view 单测；压轴 B05 长规则与正场 B03 花色采用明确的仅显示夹具，没有修改活动控制器，不宣称自然打到压轴。

已逐张查看最终十张截图：

| 尺寸 | 当前暖场 | 压轴长规则 |
|---|---|---|
| 1366×900 | [pc.png](pc.png) | [boss-pc.png](boss-pc.png) |
| 390×740 | [portrait390.png](portrait390.png) | [boss390.png](boss390.png) |
| 320×640 | [portrait320.png](portrait320.png) | [boss320.png](boss320.png) |
| 740×320 | [shortLandscape.png](shortLandscape.png) | [boss-shortLandscape.png](boss-shortLandscape.png) |

[正场预告/花色](middle390.png)、[跳场确认](skip-confirm390.png)。实际看图拒收的 320 压轴窄列及短横目标首屏缺失保留在 [initial-layout](initial-layout/)；最终已补正并重拍。章节壳体固定，仅正文滚动，并检查标题首屏可见。脚本最初的开发页扫描、关闭防连点时序、同局重试 runId 预期问题仅修测试运行方式，产品保护未放宽。

各尺寸当前目标首屏完整可见；主按钮为 48px，短横与次操作至少 44px，无横向溢出。短横长规则后半段和未来场次可在正文滚动区查看。

上述本地浏览器证据均在用户“浏览器使用 dot 远端电脑”指令前取得，原记录保留；此后未再执行本地浏览器试玩、截图或 UI 自动化。用户最后允许最短必要本地测试，但要求复用已有结果，禁止重复完整截图矩阵或自然长局；本包不需要再跑本地浏览器。浏览器脚本作为这批历史证据的复现来源保留，全局试玩由父级 dot 远端执行。

dot 远端候选验收为 NOT_RUN。需在远端检出本分支的交付 SHA 后提供该版本的预览入口；当前 pai.hp666.cc 上的其它版本不能代签此候选。可在远端候选工作目录运行 `npm run dev -- --host 0.0.0.0 --port 5681 --mode e2e`，由同一远端电脑的 dot 浏览器打开 `http://127.0.0.1:5681/?harness=1&seed=chapter-confrontation-short`；这只是待执行入口，本次没有部署或启动远端服务。

待远端验证的有限步骤与预期：

1. 新局选择辛弃疾、组合路线，商店打开本章节目后关闭：仍在同一商店，金币、货架和局进度不变。
2. 离店打开章节目录，在 PC、390×740、320×640、740×320 检查：唯一章节标题，当前场最突出，目标首屏可见，单个开战主按钮，全部操作至少 44px；正文可滚动。
3. 点跳场，再按 Escape 或保留此场：确认取消而不跳场。再次 Escape 关闭目录，再打开：仍是原局、原场，没有发牌或奖励变化。
4. 进入暖场，选一张再取消：选牌可用且不提交存档。只出四手低牌失败后同局重试：同种子同身份，回到开局商店。再打开章节并确认跳场一次：只得一张减2金券、不发结算奖金，进入跳场结算；禁止双发奖励。
5. 正场/压轴的仅显示检查须明确使用候选的视图夹具：Boss 原名、原规则、公开花色、应对与不可跳过完整可读，不伪称自然通关。

只交付软件候选和普通 dev push；不合 main，不查 CI/域名，不部署，不跑自然长局。真人理解、整体视觉批准、真机与听感为 NOT_RUN；P08 仍为 in_progress。
