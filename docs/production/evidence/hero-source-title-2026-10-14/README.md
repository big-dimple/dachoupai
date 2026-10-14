# PR171实际来源标题最小接线

承接 PR171 前轮最终 `d44d91ee3d30d62cbd5486a48d2965ad90986c72`。执行前本工作区 `git status --short` 空，远端开发分支也是 d44d91ee、main 仍为 `69f46e47f250ec3ad7bc55ed11f7888326eecf8f`。父本轮明确交付共享 HeroClimax.ts 编辑窗口，授权应用已交付补丁、提交/push、待新HEAD CI后设为可审查；不合main、不修改PR170。

仅原样应用[前轮补丁](../p1b-settlement-closeout-2026-10-14/HeroClimax-parent-source-title.patch)。具名丑牌事件的已保存 `fact.title` 当主标题，英雄移为“英雄名 · 来源兑现”；英雄真实技能的 `definitionId` 为空，继续显示英雄主标题/能力兑现。实测字号循环让标题保持单行。没有新增规则、时序、回调、命令、保存或资产变更；[实际patch](applied.patch)、[对象保护核对](protection.json)证明上一轮之后产品仅变 HeroClimax.ts，其余已授权结算成果与domain/content/application/依赖/总计划保持原字节。

产品提交 `d3d6f4e0`；观察器修订后局部运行冻结 `74ece42f90d399f5d1f171ab1ce92f67df77c811`，src tree `5252e684a4863f5169ef5a9538dddc0abf9d7770`，harness tree `da052fd1ecd850c5fc68be65333a92535fc85bdb`。后续只有证据提交；最终HEAD CI以PR171精确读回为准，不能借上一轮d44的绿CI。

[上一轮结算证据](../p1b-settlement-closeout-2026-10-14/README.md)是 d44/c5ff7d40 的历史冻结记录，其“共享补丁未应用”描述仅适用于当时。原记录、manifest及全部失败字节保留。本轮补丁已经应用并单独验证；并未重跑结算全套或18局。

## 实际操作与完整保存

[harness/hero-source-title.mjs](../../../../harness/hero-source-title.mjs)复用既有英雄公开手牌/技能配方及本分支当前 e11 配方。公开手牌、库存、既有成长和阿燥已保存一层属于受控输入，不声称自然获得。每个checkpoint先过原读取校验，再走产品“导入本局”、真实鼠标/触控选牌、原技能入口与出牌；没有直接mount、暂停scene或改演出速度。

- 五种实际计分技能：阿默助攻、二响交棒、谢幕人燃10、阿燥释放、骰爷真实弃两张押三条后兑现。390各一条；阿默/最长英雄名谢幕人在1366，谢幕人在320另核。
- 两个真实具名来源：当前身份 e11“长期捧场”（既有×1.3、真实得分3931）和 f06“一次性招牌”（五字乘法来源）。各320/390/1366，主标题等于对应真实savedBenefit，人物在次层；主标题单行、实际bounds在所属列内。
- e11与二响分别走390低动态、原菜单“快进当前手”、实际“保存并退出”。演出/菜单收口没有多写命令，退出清理高光；正常冷刷新至title，完整存档等于已提交结果。

[完整运行报告](native/report.json.gz)保全部fixture/checkpoint、实际选择前完整state/journal/IDB/localStorage、事务后的tuple、标题期间/完成后/cold tuple、每个真实source event/fact/text/font/bounds、原生截图和page errors。[可读摘要](native/summary.json)逐行给结果：最终20条全部PASS，无page errors。每笔真实命令按实际receipt.commandId重新调用原applyCommand，完整state相等、journal只追加该command、storage.current完整等于makeCheckpoint、revision仅+1。选择/技能草稿、观察、演出/快进/退出和冷恢复的完整四项tuple不漂移。骰爷的弃牌及出牌分别校验。

观察器在真实poststep、subjectVisibleAt已建立时记录原尺寸Canvas PNG，不暂停演出。此采图不能签软件帧率/实机GPU，也没有用其耗时倒签一秒或听感。标题补丁本身没有改原一秒合同。

## 可查看画面

| 实际来源 | 桌面1366 | 手机390 | 必要320 |
|---|---|---|---|
| 长期捧场×1.3 | [PNG](native/e11-1366-normal-0.png) | [PNG](native/e11-390-normal-0.png) | [PNG](native/e11-320-normal-0.png) |
| 五字一次性招牌 | [PNG](native/f06-1366-normal-0.png) | [PNG](native/f06-390-normal-0.png) | [PNG](native/f06-320-normal-0.png) |
| 英雄真实燃金 | [PNG](native/xiemu-1366-normal-0.png) | [PNG](native/xiemu-390-normal-0.png) | [PNG](native/xiemu-320-normal-0.png) |

320来源次层会在原wordWrap内换成两行，主标题仍为单行；不要求次层一行。上述九张宽/窄来源与英雄图已经逐张实际view_image核像素；320次层两行仍在其顶部区域，来源主标题完整可见。

## 原失败与验证界限

[首轮观察器失败](failures/old-amo-observer/summary.json)/[完整报告](failures/old-amo-observer/report.json.gz)/[原截图](failures/old-amo-observer/amo-390-normal-FAIL.png)/[原脚本](failures/old-amo-observer/harness.mjs)保留：脚本错误等待旧阿默弹窗的“K♠ K♥ · 助攻 ×2”，当前真实快捷入口已直接选助攻，超时。只改观察器读取实际assistIds，不改产品为旧期待服务。新的完整运行从最终脚本重新开始，不计失败为通过。

[typecheck和28项/4文件定向结果](checks/local-verification.txt)、[完整build输出](checks/build.log)通过；既有大bundle提示保持。SHA256SUMS覆盖本目录全部记录（不含其自身）。最终CI及可审查状态另在PR精确读回，不把元数据当成体验验收。

未签：父自然第四章24,960/3,600原手重播（仍没有其完整保存/原图）；完整游戏体验、整段美学/人物魅力、所有非计分技能、自然获取概率、声音听感、实体手机震动/后台/GPU/FPS、18局/八章。此处只签上述真实事件、标题几何和完整保存的有限软件核验；没有合main或部署。
