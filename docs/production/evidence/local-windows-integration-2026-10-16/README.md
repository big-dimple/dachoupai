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
