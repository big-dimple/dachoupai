# 第3包：真实成长入账与下一手兑现

输入：父20:17UTC已FF PR91的main `67fa9c3376b7f8d16f4cf62e23edfff350e8fea5`。沿原第3包、W2/W3/W4/W5 D05/SG05/SG10，不改变W0–W9优先级。角色、做牌供给及胜败底座已存在，补实际积累的直观体验，不重造六角。

- requirementId：U07/U08/U10/U11，SG05/SG09/SG10。
- dependencies：PR88工具与纸墨组件、PR89首120秒、PR90收尾、PR91选择供给；真实成功保存trace、全类成长事实与已有b10等卡面映射。真人理解/观感/听感/设备未签持续保留，不以旧数量签完成。
- allowedFiles：`src/game/GrowthPayoff.ts`、`GrowthPayoffView.ts`（新增，纯事实读取/同源纸墨）；`GameScene.ts`现有成长预览/真实事件反馈消费点；必要直接适配`BuildGrowthView.ts`仅保持旧回退；`tests/growth-payoff.test.ts`、`harness/growth-payoff.mjs`（新增有限事实/原生检查）。本范围、本DELIVERY_PLAN、UX、AGENTS与`evidence/growth-payoff-2026-10-09/`。资产只读复用，domain/application/content/audio/platform、身份/schema、CI/锁文件均不改。
- nonGoals：新成长/数值/货币/自动出牌/发牌保底、全角色/全库重画、重做结果舞台/选角、预测总分、新百科、长停顿/长录屏/软件GPU帧率、种子扫描/八章矩阵、防篡改档重构。
- outputs：真实来源卡面＋“上手实际读取／结算后保存”分开的短入账纸页，贴现有空选牌区域；下一手按真实读取更新，选牌后让位给手牌预览。真实正成长事件有克制原卡数值印记，零新增/封禁/消费不伪装增长，不另加计分等待或新音路。
- acceptance：PC1366/手机390同一有限来源购买与两手实际读取0→新增10→下一手读10/保存20，完整state/journal/storage一致；320/短横只检查同态信息/命中边界。来源身份可辨、读取与新增不倒算本手；没有事件不造入账，旧/替换实例不借历史；低动态/快进/恢复不改结算或奖励，手牌/数字/按钮不被遮。
- stopConditions：需要改规则/保存身份、可读性必须依赖关特效、同方法两次修补仍不可读时改展示方式而非缩字体、已有关键操作被挤掉、材料不足则记录未知；有限软件证据不代真人满意。

正常规则下的公开手牌/真实出手优先。若使用受控b10货架，明确仅货架身份受控，起始现金/抽牌/事件/奖励按原规则，不称新正常随机获得或自然稳定率。不再新增投入与留钱窗口。

6.1默认Medium单线，无并发。必要定向检查后一次最终精确HEAD CI/draft，父协调main。

候选实施：产品ecce7dc／普通路径2c21cd1；[有限证据与原FAIL](evidence/growth-payoff-2026-10-09/README.md)。正常/快进/低动态6条与main同態前后完整state/journal/storage一致；320同態可读，短横高度不足保原摘要/上手结果入口。最终head CI/draft另核、父协调main；真人/设备/听感及完整第3包仍OPEN。
