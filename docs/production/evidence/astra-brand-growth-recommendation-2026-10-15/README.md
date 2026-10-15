# Astra：品牌、成长、推荐三份精确交付整合

工作区 `/workspace/astra-integration`，目标分支 `dev/astra-integration-20261015`。保留完整 d31 基线，正常合入三个指定提交；原品牌、成长分支及其证据均保留，没有重置、变基、强推或删分支。正式立绘缺件没有阻止本轮代码与验证收尾。

| 输入 | 精确提交 |
|---|---|
| 基线 | d31df43d615e358542661a4a01f41feac071928b |
| 品牌 | 4df0db49859bcbaede710a2243842a6ce43c8aeb |
| 成长 | 6be7ecbc737fea108cbbd1ab762d382850ada0c3 |
| 推荐 | 2aa1c1975a85044c59e6ce6778b6434b01a924a7 |

品牌从d31正常FF；成长合并提交 `7aa2bdc4b902bd1fffd74315232b4062717c42ea`，推荐合并 `7fb19b589e60ec5329d112892c55d256f72c6eb1`；产品修正 `dbd9818de5282c9325f9d89e50e8ae2fdc2cfa4c`，最后测试/观察器提交 `c7860c7fdbef8f3a4068fd4e40f5353217b7df9b`。后两者 src tree 均为 `480673431beaad9022d2bef4d9644829a6de9d48`。后续仅交付文档与证据。

## 接口冲突处理与实际修复

[六处冲突清单](merge-conflicts.json)及原冲突文本均保留。GameScene、JokerExperience、RouteStarter人工统一；两份测试保留d31的独立成长断言并适配新来源；AGENTS保留品牌/成长历史以及d31实际S04回执，没有用4d2旧候选状态覆盖d31。

- GrowthOpportunity 的 `growthSelection` 成为唯一适配入口，内部复用原 `growthScoring` 判定；JokerExperience继续返回 `scoring` 和独立 `growth`，GameScene使用 `readiness.scoring.labelCandidates` 与 `selectionGrowthLabel`。不把“可成长”当成本手已有收益。
- 保留 heroText、六个技术ID、计分存量、即时效果、成长条件/封顶/已用、封禁独立阶段及系数短标签。满堂彩/起手等非成长规则仍走原入口；RouteStarter只描述路线新增，不能覆盖本手存量计分或停用提示。
- 合并窄屏“读10热”等完整短语；普通系数仍可用 ×≈1.98、×≈2.28、×100万 等带近似标记的候选，详情与事件保持精确值。搭台阶零存量但即时+50时直接显示即时热度。
- 推荐ShopScene补丁正常自动合入，保留品牌展示边界。`ShopPurchaseValue`不再把 afterHand 的 consume-rescue 记作“结算后成长／返还”；与寿命扣除一样，它是消耗记账。f10原弃牌条件能力仍列未估代价，原保守上限不被放宽；没有改消耗时点或倍率。
- 苏轼/秦琼/辛弃疾/刘娥/文成公主/花蕊夫人保持，三男三女架空青年；18姓名SVG继续明示“人物图待交付”，原旧脸不作为名人像。正式人物立绘与独立眼图仍待交付，单列美术缺件，不暂停代码。

## 同源码验证

- [最终全量测试](tests-final.txt)：266文件3637项通过；[typecheck](typecheck-final.txt)、[生产build](build.txt)、[content](content.txt)、[plan](plan.txt)通过。构建保留既有大chunk提示。构建及两份成长原生检查在dbd9818d；最终全量测试、品牌及推荐在c7860c7f；src逐对象相同，见[integrity](integrity.json)。未把旧云CI称作本头成功。
- [PC/390五来源+封禁报告](growth-native/report.json.gz)：两组PASS。实际葫芦读越染越深已存+1且不新增；普通同花结算后增长；独家戏普通对子不读；换布景只在实际读取后消耗。真实封禁下无读取事件但afterHand成长按条件保存；实际命令结果/冷恢复、完整state/journal/export/IDB保持。
- [1366/390/320单来源矩阵](growth-widths/report.json.gz)：24/24 PASS，存量0/+1/封顶、搭台阶即时+50和存量+10、独家戏正反、换布景高牌读取。选牌/详情完整state/journal/storage不变；24次真实PlayHand后完整state等于原applyCommand。实际卡下宽度不超分配空间。
- [推荐报告](recommendation/report.json.gz)与[完整前后state/journal/storage](recommendation/full-state-journal-storage.json.gz)：PC/390共12窗口PASS，含d05/a07/f07/f10/e05/d07；f10只写“弃牌后的条件效果”，不再写结算后成长/返还，未估收益不能据此判净补强。展开/管理/关闭无send、保存数据不变；受控只读检查，没有自然经营或真实买卖。
- [品牌报告](brand/report.json.gz)：PC1366、390、320正常与390缺图/迟到五组PASS；全部六人选角/说明，正常组六人HUD与结果，缺/迟到重点长名及冷资源苏轼→文成公主归属。各组旧人物脸HTTP请求为0。
- 已实际查看 [320葫芦](growth-widths/320-c06-1-house-selected.png)、[390封禁](growth-native/390-limited.png)、[PC f10](recommendation/1366-f10-unknown-loss.png)、[手机f10](recommendation/390-f10-unknown-loss.png)、[标题](brand/1366-normal-title.png)与[选角](brand/1366-normal-selection.png)。均为软件Chromium，不冒称物理手机、自然试玩、总体平衡或正式美术验收。
- [保护树](integrity.json)：domain/application/content/platform/core/audio/.github/package-lock/原handdrawn-p08与d31完全相同，数值、领域、保存、RNG、旧音图未改；三个精确输入均为最终祖先。

## 保留失败与适配边界

[first-targeted](first-targeted.txt)保留6条旧成长分支期待与d31接口不一致；适配成scoring/growth分层，未弱化真正读取/新增/封禁测试。[first-full-tests-FAIL](first-full-tests-FAIL.txt)保留5条旧全息断言失败：此前把仍有+2来源直接当四星，并要求出售前后的完整推荐对象相等；新策略公开计入售牌损失、净支出/利息与保留对照，两个经济基线本就不同。

保留真实全息+2、B06/B15/B16/挑战封禁、最终11128/H184/M1512/25、实际现金及RNG不变断言；新增售前返金2/净6与售后返金0/净8、同为32金、是否失去投资等具体断言。只更新星级/经济解释期待，不为旧星级回退新策略。[policy-adaptation](policy-adaptation.txt)还保留新增测试误把27→19不降息的失败，修正为两个现金例均确实降息；[56项适配回归通过](policy-adaptation-pass.txt)。

## 独立d31发布：明确技术阻断，未冒称已上线

用户已明确授权只发布d31到main及pai.hp666.cc，未把本次整合混入发布。已保全此分支，并建立干净独立 `/workspace/release-d31-20261015`，精确停在d31。远端main fetch观察为 `4a52fd0b0fb9ac0a49b8cb5e79abc8db4326e2d7` 且是d31祖先，可正常前移。

但本轮唯一一次必需CI查询返回：`Get https://api.github.com/repos/big-dimple/dachoupai/actions/runs/38724687012: Forbidden`。独立读取 `https://pai.hp666.cc/build-info.json` 返回HTTP403。详见[原命令与错误](release-blocked.txt)。这是实际API/HTTP访问错误，不声称发生了main push自动审批拒绝。按用户“仍拒绝即停、不走旁路”，发布停在CI门禁，没有main push、部署、改权限、换接口或重试；无法核实d31 CI、本次发布后的main CI或域名实际版本。缺立绘不属于本次发布阻断，授权也不需要重新确认。

本次只正常push `dev/astra-integration-20261015`。CI新头仍未核，禁止借d31或三来源旧绿CI代签；无PR创建/重试。
