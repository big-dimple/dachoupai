# 本批五窗口整合：独立开发分支

环境实际可执行，独立worktree `/workspace/dachoupai-integration`、分支 `dev/integrate-experience-20261014`；原音频分支仍完整停在41692bff，未覆盖。基线main f651a04ef5eb68c29a413acf8b4d8a0e9bbcde09。已按父最新原文批准处理，main合入条件仍是181收尾/父增量独审与整合精确CI；本报告不称视觉/发布已通过。

## 完整输入与有序合入

| 原PR | 本树采用的完整head | 处理 |
|---|---|---|
| 177 | bfdb7088e88b0b2605f6b9fc7ed5f90d65fe4630 | 原唯一DELIVERY_PLAN入口 |
| 178 | 0b41f87618e0fca3016a352d59af62353a2acafa | 已完整包含于180，不重复应用 |
| 180 | 1c4a7259ea4e15fd87ede1a636b3c23ae0a43fa3 | 完整商店/核心服务/1.35确认 |
| 179 | 41692bff3d3809de6fd80503c987c716eeb8389f | 完整音路与4096位边界返修 |
| 182 | ba89b6076054ad75063fece514c3ef96ef209135 | 完整六英雄选角 |
| 181 | 9242ed738062568def87853d0e1d688338877a85 | 父已交返修新head完整合入，仍待增量视觉独审；未拿旧4d当最终 |

本树全部原head均为祖先，[INPUTS](INPUTS.json)列出完整文件，[merge-proof](merge-proof.json)列合并点和依赖。未cherry-pick或重写原提交。最终按已批准原PR177→178→180→179→182→181正常合main，不扩大对象；另开的集成PR只用于验证、不会合它来绕开原PR。

[source proof](source-proof.json)：760个单一来源文件逐Git blob同原head；实际共享只有 `harness/screenshot.mjs`（180/182）与 `harness/fixtures/settlement.ts`（180/181）。ort自动合并无冲突，人工核[共享差异](shared-harness.diff)：保选角显式头像说明与不自动弹说明，保core-build版本/hash；保当前身份章目标锁值，追加181的新高光/冷来源夹具。产品、测试、各包原证据均无集成自改；public/art/GameScene/依赖/CI/安全与基线保持。

## 实际检查

检查冻结于产品树a02225762dee8a6ac8441e52be50d4548f1ee112（src29879994a072a14f5a7261e698d425eeab54b764），其后只整理本证据。 [validation](validation.log)：全量244文件/3515项与内容检查、build、系统Chromium标准desktop/mobile通过，domain/browser的testedCommit均为a022；源码/index/HEAD检查前后一致。 [plan](plan.log)：32工作包有效。新精确开发分支CI/未来mainCI分别由实际回执登记，不借原PR绿灯签最终main。

[PC1366](native-1366.png)/[手机390](native-390.png)已实际看原图；[原生报告](native-report.json)/[完整state-journal-checkpoint-revision](native-full-state.json.gz)来自两端真实鼠标/触控、DOM和生产导入/保存：

1. 正常选英雄/路线，真实新建完整state等于原createRun，保存checkpoint相等；新局没有已发现牌型，服务不会凭空可购。
2. 为有价服务复用PR180已验证公开等级/金币/库存窗口，经严格生产导入。这是受控输入，不说成自然取得或一个无缝自然局。
3. 实际报价与取消保持；延迟保存、Escape、quota故障不改state，固定retry只升级/扣款一次；共享升级/基础改牌/染色额度保已用。
4. 原已持T01使用不收费；随机T01按原交易买来存着，二者不恢复服务额度。
5. 实际LeaveShop/EnterStage/PlayHand，完整state、journal、SavedSlots.current、revision逐笔同原applyCommand/makeCheckpoint，每端7笔后续保存命令，14笔合计；真实最终48分/音频award事件，音乐30/音效80值保持。刷新/继续无新奖励或计分。
6. 复用178原C9自然journal在新身份离线重放，仅作受控无尽确认：UI实读1.35，取消不改保存，确认仅一笔ContinueEndless，C9锁定目标27642。它不是新自然八章或无尽试玩。

未合181时的早期通过范围/记录保于[pre-storyboard](pre-storyboard/native-report.json)；加入新head后重跑全部两端核心链及受影响标准流程，最新报告只对应本树。首轮[FAIL](native-before-FAIL.json)是观察器假定新局已有可升级牌型，产品正确拒绝，未改规则消红。修夹具后把自然创建与受控服务窗口明确拆开。

原各包的全矩阵/图像/听感/失败证据直接复用，不重跑18局或重复产品开发。此集成只签有限功能/状态保存，未签实体手机、GPU/FPS、主观音频、自然经营/全局平衡、整屏/分镜审美。181独审最终回执与整合精确CI仍是main合入等待项；父核正式域名。

复跑：`node docs/production/evidence/experience-integration-2026-10-14/native-chain.mjs`（默认输出/tmp/experience-integration-native）；`npm run verify:ci -- --scope=domain`；`SMOKE_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:ci -- --scope=browser`；`node scripts/check-production-plan.mjs`。
