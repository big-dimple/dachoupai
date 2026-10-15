# 唐宋牌计划与六英雄文本对账 · 2026-10-15

独立纯文档分支 `docs/tangsong-plan-and-hero-copy-20261015`，从已核远端main `8e2174141920ef001b95a30485e70525920d3d9f` 建立。没有带入R03/加载/美术的运行时代码；仅只读这些指定提交与其原报告。没有查询CI/域名、合main或部署。

## 交付

- DELIVERY_PLAN只保留一个现行排程入口，分列代码基线、分支开发完成、待整合、软件验证与用户/设备实际验收；旧正文完整留在显式历史区。
- CHARACTER_PLAY_PLAN是从属的能力与验收说明，不另排程；六种技能已经存在，不因起新名字重做机制。工作包R03与体验审查R03/P08携带子项明确区分。
- plan.json更新当前audit基线、selectionPolicy、P08范围/负责人/优先依赖及A03/C04边界，保持32工作包、P08唯一in_progress。旧done只属于原证据/原SHA范围。替换前selectionPolicy、resumeContract文本和P08/A03/C04相关字段完整存入history/plan-status-before-20261015.json。
- 根AGENTS缩短为唯一当前入口；原AGENTS完整归档history/AGENTS-before-20261015.md。旧人名/四男两女/待图/待实现与曾用CI状态不能再作为当前指令。
- HERO_TEXT_SPEC_20261015.md及JSON提供六人技术ID→人物/性别/时代依据/用户主题/技能新名/短宣言/一句故事/准确技能说明/完整边界/代码来源/历史资料/后续采用位置。**本轮规范完成，运行时采用未做，用户理解与观感仍待验收。**

## 提交状态与已实现核对

精确快照在status.json：main8e217、加载9c41dfff、携带7dfab9a、动画eba6c158、六原图e6922f8d、主题53b5283a、正式图运行时bd626e84、整合a85be2a逐一核对。a85包含加载+携带，六图运行时由另路合入；此快照不预记未见的新整合SHA/同版通过。

main源码中已核：HeroPlayReminder真实available与新手前两场额度，GameScene调用；IntermissionScene/RunLaunch失败同种子同身份重试；OpponentPresentation和GameScene的B05入场/应对/事件接线。它们和六英雄现行机制均列“已实现，不重复派工”。原报告按提交引用，不把任何旧FAIL删掉或换版本签收。

用户仅验收六张指定1122×1402原图，原字节保持。bd626的选角/说明/头像/高光和146项17.01MiB/20MiB属于其软件交付范围；134项旧加载报告不签146项新目录。安全眼神/头脸裁切不是独立眼原画，旧独立眼图要求未由裁切满足；不代用户取消该要求。没有新增真人/真机/美术/听感验收或整体完成百分比。

## 文本与史实核对

main新局身份为quality-r2-s04-finish-v1。逐人读取r2Assist/r2TouyeWager/r2LaohuanRefill/r2ErxiangHandoff/r2AzaoCharge/r2XiemuBurn、r2Run、scoreR2与CharacterRunCopy。重点避免：把秦琼写回仅押未成目标；把刘娥写成整牌热度或整手重触；把辛弃疾补牌说成重新随机；把文成误写每场一次；忽略花蕊真扣金后的持币条件/利息损失。倍率/普通点数/层数/真金币字段与权威函数交叉检查。

资料只支撑窄史实，不证明游戏动作/外貌/台词：苏轼据北京/台北故宫，秦琼/刘娥/辛弃疾据相应史传，刘娥辅以香港大学摄政研究，文成据故宫步辇图说明，花蕊同号/姓氏差异据十国春秋与教育部辞典。新故事/台词/技能名全为游戏创作，人物跨时代相遇和青年化均明示。具体可点击资料在每个人物规范条目，不引用大段史料。

## 本次检查

- `node scripts/check-production-plan.mjs`：32项，P08有效。
- `node scripts/check-production-plan.mjs --self-test`：原1正例/13反例全部通过。
- hero-spec-check.txt：6个技术ID与用户主题、三男三女、必填字段、MD/JSON正文一致、来源路径有效；实际调用权威函数核对助攻×2/4与一次、刘娥A11/JQK10、文成1/2/3层×1.5/2.5/4及重复清零、花蕊10/20/30真扣金与×2/3/4及利息封顶、秦琼普通×1.15。
- document-check.txt：现行本地链接与各指定提交证据路径存在；原DELIVERY_PLAN/CHARACTER_PLAY_PLAN正文、原AGENTS和被替换plan字段完整保留；src/tests/harness/scripts/public/art/index/package输入相对基线全部不变。
- `git diff --check`通过。

这是文档结构、来源与规则一致性检查，**不是运行时测试、真人体验或发布验收**。没有为纯文档改动重跑全量游戏测试，既有软件结果仍绑定其原提交。后续运行时采用此映射后需按实际变更运行相应文案/布局/身份分派检查，不应重新开发整套能力。
