# Windows 本机同版整合验证

基线 main `c009bc401d337fda7af052baa1c7f34798e97154`，独立分支 `verify/local-flow-20261016`，Windows Node22 / 已有 Playwright Chromium。本文先记录基线加本次 SceneView 小修复；后续文案/布局整合必须另列同版结果，不能拼接签收。原图、规则、数值、存档身份和两路英雄文件均未改。

## 实际发现与修复

正常新局三档均完成真实工具与技能、两手计分198→495，目标400。基线320×568过关页连续两次触摸“前往筹备商店”，第二次触摸击中新商店同位置“进入牌桌”，未经停留即进入下一场。保留[原失败报告](failures/c009-cross-scene-repeat.json.gz)与[原图](failures/320-cross-scene-repeat.png)；桌面/390原路径通过，320失败，不能合称原版全绿。

先补失败单测（1 FAIL / 4 PASS），再在共享SceneView按同一游戏记录上次有效点按的原生释放时间与位置。跨场景350ms内、同点24逻辑像素范围的后续按下被丢弃；同场景、其它位置及稍后明确输入仍可用。未改ShopScene/CharacterSelectScene/英雄文案。新增用例实际经过SceneView事件入口，覆盖跨场景拒绝、其它目标、同场景重复与稍后允许。

## 固定源码的结果

- [正常新局摘要](baseline/summary.json)与[完整状态](baseline/normal-flow.json.gz)：PC1366×900、390×844/DPR2、320×568/DPR2全部PASS；146项实际预载。6金币首店买2金往上挪，明确携带确切实例，当前手牌零默认目标，Escape取消不重开，手动重新打开后使用；辛弃疾真实弃/留补牌与高光；冷恢复；两手实际计分495/400、收益一次、下一商店。每笔真实命令用原SavedRun重放，完整state/journal/storage/checksum/revision/RNG相等。连点不重复出牌或跨过商店。
- 刻意低点单牌消耗下一场4手而失败（不是自然策略结论），取消失败建议不替换旧局，同局重试连点只写一次新局，保留原种子/角色/身份/路线，完整新局与createRun相等，冷恢复相等。
- [既有R03十二组](baseline/save-faults-summary.json) / [完整状态](baseline/save-faults.json.gz)全部PASS：三档携带/取消/双击，普通立即用/携带/存着、基础选购、B05两层说明、购买/离店/使用保存失败及原候选重试。此项有合法受控样板，与正常新局严格分列。
- 输入/场景切换5文件50项PASS，见[机器结果](baseline/focused-results.json)。typecheck与生产build通过，见[build输出](baseline/build.txt)；原大bundle提示仍在。脚本使用现有Playwright默认浏览器，可用SMOKE_CHROMIUM_EXECUTABLE_PATH显式指定；Vite缓存各写证据输出下，不混用WSL依赖。
- 先前新增验证段的两次搭建失败也保留：旧bot公开视图缺路线历史、过关已推进索引而OpenShop不应再加一。修正验证输入/断言，没有改产品规则或放宽守卫。

已实际查看320修复后商店/重试图、390结算图以及原320失败图。软件输入、保存与来源检查不代签真人理解、全局平衡、物理手机/GPU、听感、独立眼原画或整体美术。P08保持in_progress。本阶段无main合并或push、无CI/域名查询；后续只按最新授权发布开发分支。

## 两路合并后的同版收口

文化文案 `cea473afc0a400ee4ac0b5cdb2eb354de0d240b0` 与选择布局 `aab4d9fd5ee4d79809a73243a7606b0ae9e28efe` 已正常合入本分支，固定产品提交 `6069d0332fa10f52345509a36f0c4369844f5257` / src tree `2065155f43d8eae498a29e5906f1576002494cb0`。[当前机器状态](status.json)是最新入口；后续提交只更新验证脚本/证据/计划，产品源码未变。“开始对局”、全宽大立绘、顶部模式、全图查看、折叠故事/例子和六人文化技能名均保留。

| 该产品源码的检查 | 实际结果 |
| --- | --- |
| 六人×六视口及三路线布局 | 54组PASS，另有手机/PC两次正常开局及冷恢复；[完整报告](combined/layout-report.json.gz) |
| PC1366/390/320六人故事、出处、技能面板 | 三档各6人现代文案、6人实时能力和2种旧身份，全部PASS；[报告](combined/copy-report.json.gz) |
| 同三档正常新局完整短闭环 | 全部PASS，真实两手198→495/400、下一商店、刻意失败和同局重试；[报告](combined/normal-flow.json.gz) |
| 既有携带/保存故障 | 同版12组PASS；[报告](combined/save-faults.json.gz) |
| 受影响单测 | 24文件241项PASS；[结果](combined/focused-results.json) |
| typecheck、生产build、计划结构 | PASS；[构建](combined/build.txt)，保留原有大bundle提示 |

文案与布局无文本合并冲突；旧文案harness假定首层有opening/taunt，布局已按用户要求将宣言折入故事，故首次合并版harness报节点不存在，保留[原报告](failures/copy-harness-old-canvas.json.gz)。现改查首层真实姓名/技能，仍逐人严格断言展开的原文宣言、来源、完整故事与长规则，并检查新局/旧身份能力分派与完整存储只读相等。正常闭环harness也识别匹配的按需高清立绘，而非只认旧小图键。没有为通过测试恢复已取消的首层长故事。

实际查看合并版六位英雄390截图，见[苏轼](combined/390-amo.png)、[秦琼](combined/390-touye.png)、[辛弃疾](combined/390-laohuan.png)、[刘娥](combined/390-erxiang.png)、[文成公主](combined/390-azao.png)、[花蕊夫人](combined/390-xiemu.png)。[PC](combined/1366-selection.png)、[320完整图](combined/320-full-portrait.png)、[320下一商店](combined/320-next-shop.png)与[390真实结算](combined/390-settlement.png)单列；这不是物理手机/独立眼原画/真人审美签收。

### 原“17失败”的实际核对

17项属于文案作者修正青年断言前的首次全量，不能当作当前失败数。纯c009在全新独立worktree串行重跑相关10文件98项，85 PASS / 13 FAIL。文案与输入修复合并提交 `ba2ef92f1064c1bdd9abc162ec8de880bf7c45a9` 上重新完整跑270文件3654项，3642 PASS / 12 FAIL；逐一名称对比新增失败为0，见[对照](comparison/comparison.json)与两个压缩完整机器结果。此全量发生在布局合并前，不能冒充6069产品全量；6069另外通过上表同版专项检查。

- 当前全量的7项文本问题：4个历史手绘收据、工具收据、历史自然存档的原字节哈希及CI配置文本的LF分割。7个文件均实测仅CRLF/LF不同，LF字节精确等于c009 Git blob，见[字节核对](comparison/line-endings.json)。未修改原图、历史收据或放松哈希。
- 2项Windows符号链接夹具报EPERM，在纯基线同样失败；未更改系统权限或安全配置。
- 3项verify-content子进程20秒内未结束、status为null，纯基线同样复现；未调整时限或改领域规则。
- 原青年断言已由文案分支修正，当前完整单测通过；TEMP夹具放在原OS临时目录后build-info通过；tool-inventory-entry与c02-acquisition此次串行均通过。纯基线的索引快照曾超过20秒，文案整合完整单测10.9秒通过，故本轮未计入12项。

不宣称全量绿，也不把基线问题简单归为全部环境故障。剩余历史字节/夹具/子进程问题保持可复现记录，新增交互缺陷已修复。下一步按最新授权只push开发整合分支；main保持待用户确认，不查询远端CI或域名。
