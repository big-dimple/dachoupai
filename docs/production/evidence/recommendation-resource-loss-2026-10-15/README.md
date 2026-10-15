# 唐宋牌：推荐替换的未估资源损失

独立分支`dev/recommendation-resource-loss-20261015`，基于整合`d31df43d615e358542661a4a01f41feac071928b`。正常合并此前推荐分支至`d91455e9a4dae993e30a216e230b92aefd9b3c0c`，合并提交`96eb4d137d3e2c0eea2c06fbac5b5742d9b1622b`保留双方祖先。P2产品提交`8e1baf21fcf557f9511f5ee7800586c9bbba2628`。人物／美术和正式改名另任务；本包保留新基线的题材决策与现有运行资源。

## 先执行复现，再修复

固定输入为`held(fixture(),['b02',donor])`、40金、e08现货，指定出售第二槽。真实克隆出售／购买和公开条件手同原算法，未使用未来牌序、未来收入或自然试玩。

| 所售来源 | 修前实际结果 | 修后实际结果 | 金币账（原算法保持） |
| --- | --- | --- | --- |
| d05 弃牌返还 | `unmeasuredLoss=false`、4星 | true、2星，提示“弃牌返还” | 返3／付8／净5，40→35 |
| a07 弃牌收入 | false、4星 | true、2星，提示“弃牌收入” | 返2／付8／净6，40→34 |
| f07 失败前救场 | false、4星 | true、2星，提示“失败前救场” | 返3／付8／净5，40→35 |
| e12 刷新成长 | false、4星 | true、2星，提示“刷新后成长” | 返3／付8／净5，40→35 |
| b03 结算后成长 | false、4星 | true、2星，提示“结算后成长／返还” | 返3／付8／净5，40→35 |
| d07 纯计分对照 | false、4星 | false、4星 | 返2／付8／净6，40→34 |
| e05 已修经营来源 | `lostInvestment=true`、2星 | 同前；`unmeasuredLoss=false` | 返3／付8／净5，40→35 |

这些固定交易的普通2♣／对子7♣7♦样例均保持22→39（+17）、122→220（+98），当前利息档均不降；现金和分差不是修复中人为压低的结果。[before.json](before.json)与[after.json](after.json)是实际执行数据；两次原状态均未改变。修前新回归有5项实际失败，见[before-tests.txt](before-tests.txt)，不是以静态推导冒充复现。

before/after的HEAD字段是当时合并后的父提交，变更前后代码由各自`sourceHashes`区别；after的两项产品源码哈希与8e1baf21相等。[reproduce.mjs](reproduce.mjs)可从仓库根目录重放，命令`node docs/production/evidence/recommendation-resource-loss-2026-10-15/reproduce.mjs /tmp/resource-loss-result.json`。

## 保守规则与解释

`ShopPurchaseValue.ts`保留既有持牌／静态资源遗漏标识，增加对`onDiscard`、`beforeFailure`、`onReroll`和`afterHand`后续成长／返还／准备效果的检查，返回具名`unmeasuredLossReasons`。单纯`expire-after-hands`是消费代价，不凭它虚构丢失的未来收益。`onBuyOffer`／`onSellJoker`／`onStageClear`原`lostInvestment`判断逐字保留，未重新拼写事件名。

所售牌拥有这些能力只说明当前“首手、未弃牌、无持牌”样例没有衡量它们，不能据该样例认定完整净补强；不保证以后一定触发，也不将未知返还／金币／救场折成金币或当手得分。新提示为“未估代价：失去所售牌的……；是否兑现未知，未纳入本手分差，不能据此认定净补强”。简短推荐理由同步为“替换有未估代价”。沿既有评级合同，当前校准候选的指定替换最多2星，既有确定负向1星仍优先；没有新设五星配额、价格阈值或生命周期收益模型。

本次评级范围仍是原已校准候选f06／b03／c04／c06／e08及现金反例b10；其余算法不作全库重排，交易详情仍列实际损失和未知。d07对照保4，证明没有将所有指定出售统一封2；旧a06／b06／a11直接购买五星分支保持原算法。

## 验证

- [tests.txt](tests.txt)：9文件／98项PASS；包括三类主反例、刷新／结算成长同类边界、e05旧修复、纯计分对照、现金、出售延续、说明／星轴投影和历史五机制合同。
- [typecheck.txt](typecheck.txt)：`npm run typecheck`通过。[build.txt](build.txt)：`npm run build`通过，既有大chunk提示保留；没有部署。
- 合并后首次相关测试有一项真实失败：[first-integration-test-failure.txt](first-integration-test-failure.txt)。旧S04用例在章1使用，不满足整合基线的新章3／50%门槛；当前S04夹具现为章3、目标花色13／26。历史纯评估测试显式选择原core-build保存身份；冻结模型、报告和领域规则不改，不用旧身份给新S04资格签收。
- [integration-protection.json](integration-protection.json)：13个保护对象一致；d31与d914均为祖先。ShopScene和ConsumableDialog只添加此前推荐分支原有工具说明接线，去掉这些确切增量后逐字等于d31，未覆盖其S04和其他新改动。本次P2只改两份推荐产品源码。
- [browser/report.json](browser/report.json)：PC1366×768／390×844各5项，全部PASS。三主反例2星、e05仍2星、纯计分d07仍4星；真实导入、购买详情→比较替换→展开／收起说明→管理该槽→返回／关闭，五SVG及填充数一致，零新指令。
- 每项查看前后完整state／journal／存档／localStorage相等，原始数据见[browser/full-state-journal-storage.json.gz](browser/full-state-journal-storage.json.gz)。[source-sha256.json](source-sha256.json)记录9个受测文件，运行前后哈希相等。报告HEAD为8e1baf21；只读观察器后来补拍所选槽推荐，当前观察器由报告哈希精确绑定，产品源码仍为8e1baf21。
- 三种主反例的两端未估代价共6图、已指定槽2星推荐共6图；例如[PC弃牌返还说明](browser/1366-d05-unknown-loss.png)、[手机救场说明](browser/390-f07-unknown-loss.png)、[PC指定槽2星](browser/1366-d05-selected-recommendation.png)、[手机指定槽2星](browser/390-f07-selected-recommendation.png)，这四张例图已实际查看。比较页左／上方“待买”4星是有空槽的直接购买建议；所选出售交易另有2星，不把两者混成同一事务。首轮已通过观察报告保留于[first-browser-report.json](first-browser-report.json)，第二轮仅为补充已指定槽截图，没有改产品或放宽断言。

运行命令：`npx vitest run tests/shop-purchase-value.test.ts tests/shop-post-purchase-condition.test.ts tests/shop-replacement-cash-risk.test.ts tests/shop-sale-continuation.test.ts tests/shop-offer-guidance.test.ts tests/shop-card-journey.test.ts tests/shop-card-value-visual.test.ts tests/f06-recommendation.test.ts tests/recommendation-cost-lifetime.test.ts`；`node harness/recommendation-resource-loss.mjs`。

双端为系统Chromium低动态受控窗口，仅核推荐说明控件和只读保存边界；未做物理手机、自然经营、真实替换执行链的新验收、72牌完整生命周期估值或整体平衡。S04新规则、人物题材／美术、完整五星公平性仍按原独立任务与证据处理。不合main、不部署、不重试Forbidden PR或绕过权限。
