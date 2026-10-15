# S04已批准试验方案：实现与有限验收

用户在独立复核后明确采用“第3章起、目标色至少存活牌50%、6金整副收尾、永久手牌容量−1”，本轮直接实现，不继续扩模拟。取舍仍在[原计划S04条目](../../DELIVERY_PLAN.md#整体数值窗口待完成任务独幕s04的获取与改造取舍)，不是全局最优或自然平衡签收。开发分支`feat/s04-finish-20261015`；产品冻结提交`04111e28a9d1247f0e0153e6708c27a57db048f0`、src树`418c4e88e3394fcd3f615c998327aeb3447a9364`。未合main/部署，未重试此前Forbidden的PR操作。

## 实现范围与身份

- 正常六角色新局使用`quality-r2-s04-finish-v1 / json-fnv-v1:65b545bd97c0fdf1`；继承原core完整能力。旧core仍为`quality-r2-core-build-v1 / json-fnv-v1:6dfe1a721e4949e6`，保留原早店独幕行为、旧恢复/重试身份；没有新旧档迁移工程。[身份合同](../../../../src/domain/r2GroupUpgrade.ts)、[正常启动](../../../../src/game/RunLaunch.ts)。
- [r2S04Facts/r2S04Issue](../../../../src/domain/r2S04.ts)只读存活持久牌，以`2*C >= N && C < N`判目标色；供给池、购买复核、使用所选色与显示读取同源计数。销毁牌不计，复制牌计入；两个花色各50%可任选其一，已全同色不能借独幕转成0%的另一色。
- 沿用原6金目录基准、真实优惠/最低1报价函数、无额外使用金币、整副只改花色、原永久容量/有下一场/累计上限/B10/floor守卫。选色页显示C/N、差张数和实际容量前后；第2章在固定摘要显示当前章节。[确认页](../../../../src/game/ConsumableDialog.ts)、[购买状态说明](../../../../src/game/S04Qualification.ts)。
- 未修改目录、目标、倍率、计分、资源预算、checkpoint或SavedRun实现。`isR2CoreBuild`显式承认新子身份，不改变原合同hash。已有启动测试仅更新“正常新局”的期待；C04测试只有正常新开局hash期待改为新身份，C04运行/存档模块、原夹具与暂停工程不动。历史S04分析测试限定旧core启动，原分析脚本/报告不重写。

## 软件与浏览器证据

| 检查 | 结果与实际范围 |
| --- | --- |
| [最终全量](full-tests-final.txt) | 253文件、3508单测PASS；包含[17项独幕领域测试](../../../../tests/s04-finish.test.ts) |
| [最终构建/类型](build-final.txt)、[内容检查](content.txt) | PASS；构建原有大包体提示保留，不是新运行错误 |
| [原生摘要](native/report.json)、[完整state/journal/IDB](native/full-state-journal-storage.json.gz)、[执行](native.txt) | Chromium 1366×900鼠标、390×740与320×740触控，三条受控链全部PASS |
| [源码绑定](binding.json) | 完整src摘要`463cd516c9a31e1aff94e1808280e2583a0bbec5aa2731ba5f69de13e008ec54`，已逐文件与产品提交git blob相等核对 |

原生脚本运行时尚未提交产品，报告`head`记的是分析祖先`8aa03c71`，**不能拿该HEAD作为产品版本**。脚本对执行前后完整src摘要相等有断言；`binding.json`另核每个git blob和执行文件逐字节相等，绑定上述产品冻结提交。文档/证据提交不改变产品src。不是借旧SHA的绿结果签新产品。

领域覆盖：章2/3、25/52拒绝/26/52通过、实际删两张异色得到25/50、复制异色26/53失格/复制目标色27/53达标、全同色无效果/两色各半、买后实际复制失资格且保留库存、足钱/库存/金币不足的原子性、实际优惠与0金使用、属性与牌序/RNG保留、重复command回执、B10实际6→5及floor吞第二次代价拒绝、累计最多2、旧身份早用与工具说明缓存隔离。旧核心目标、倍率、技能与恢复由全量回归覆盖，未为本方案额外改动。

原生每个宽度执行相同操作，完整状态逐笔对生产`applyCommand`，journal增量、当前checkpoint与IDB revision均相等：

1. 控制植入章3、26/52、20金及真实优惠装备/券、S04现货；**不声称随机取得**。购买取消0命令；6金基准在该实际状态实付2金，20→18。购买只进库存、不占本店升级/做牌额度。
2. 买入和使用分别延迟保存、重复点确认、触发QuotaExceededError；保存失败时完整已发布state/journal/IDB不变，重试保存原固定候选，各只成交一次。用后金币仍18、工具耗1、整副只改花色、永久容量扣1；牌ID/点数/增强/版次/顺序及RNG保持。
3. 选择红桃前确认禁用，未达标花色原生option禁用；取消保留工具与完整保存，重开没有旧选择。查看/取消不发领域命令。
4. 冷刷新回标题恢复完整state/journal/IDB，再正常继续并进入下一场，原命令`LeaveShop/EnterStage`相等，实际7张手牌/4次出牌/原1800目标。
5. 另导入章2及25/52的已持库存，原生选择/确认禁用；显示当前章与还差张数，取消完整保存不变、0命令。
6. 真正购买并使用固定染色，25→26跨线后原货架与shop RNG完全保持；再付实际2金刷新，扣款和新货架按原命令相等，已用升级/做牌服务额度不恢复；没有保证刷新出现独幕。

已实际查看[PC购买](native/1366-purchase.png)、[390选色](native/390-selected.png)、[320选色](native/320-selected.png)及[320章2拒绝](native/320-chapter2.png)整屏像素，门槛、C/N、实际报价、8→7代价、确认与取消均可读；三宽度购买/选色/已保存/下一场/两种拒绝/刷新原图全部随报告保存。没有以仅量几何替代图审，没有签整个游戏美术。

## 原失败与复现

[首轮领域失败](initial-domain.txt)：手工跨章夹具忘记关闭默认节目单，触发原program snapshot守卫；补夹具显式`programsEnabled:false`，未削守卫。[次轮领域失败](second-domain-FAIL.txt)：复制夹具误用增强T10而非实际复制T07，且把S04真实最大组合优惠后的2金误期待为1金；均修正夹具/期待，价格规则未改。[初轮回归](initial-regression.txt)保留旧启动身份期待失败，[次轮回归](second-regression-FAIL.txt)保留上述夹具失败；[最终独幕17项](domain.txt)与最终全量分别留证。

原生[attempt1](failures/attempt-1/report.json)/[attempt2](failures/attempt-2/report.json)保留观察器未正确读取option禁用的失败，HTML已带disabled及同源事实在attempt2记录；后改读原生`option.disabled`。[attempt3](failures/attempt-3/report.json)用按钮文字定位，保存时文字变“正在保存…”导致观察器超时，改稳定CSS定位。[attempt4](failures/attempt-4/report.json)为断言多写空格，观察器修正。[attempt5](failures/attempt-5/report.json)发现窄屏第2章提示只在预览区，固定选色摘要补当前章；本次产品修正后完整三宽度再验通过。每次执行日志、原FAIL图及完整状态均保留，没有删除失败或补签先前未完成的宽度。

从产品冻结提交或其src相同的后继文档提交运行：

```sh
npx vitest run tests/s04-finish.test.ts
npm test
npm run build
npm run verify:content
S04_OUTPUT=/tmp/s04-finish-recheck node harness/s04-finish.mjs
node scripts/check-production-plan.mjs
```

使用现有Vite/Playwright/系统Chromium，无新依赖；只导入公开受控checkpoint，再用实际鼠标/触控/菜单输入，观察读取和存储故障注入均不替代领域动作。原分析`8aa03c71`及`94f8f74`的复算应在其分析分支/对应src基线运行；原runner会拒绝当前新src，不能把这一拒绝当作新方案失败，也不能用旧f23c指数报告签当前。

剩余证据门：自然出现/可负担/未用/放弃、正常三路线经营、长期平衡、玩家对“准备后收尾”的理解、实体设备/听感仍OPEN。50%允许最多半副收尾，60%在部分等待分布更易活到下一店；两点均保留，不再借有限模拟宣称50%最优或自动继续调数值。本轮没有自然试玩、18路线重跑、C04暂停包开发或旧存档迁移工程。
