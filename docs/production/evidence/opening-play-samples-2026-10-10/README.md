# 六英雄／三路线可见玩法样板

输入main `4bd0821653c0392a15cfadd0e442a275e9f60702`（父已合PR108）；产品 `48971b01f99c2f50e0e4e531c38d04aa40369042`。由保存WIP cf17df1安全接回；完整候选待父看图／用户理解验收，未部署。6.1 Medium串行，Rex未启用、武侠包装暂停。

原画、英雄名字／台词与六角切换保留；长能力解释让位给实际相关牌面的前后变化、红框对象、真实收益和成本。骰爷八牌选五张、押未成两对、下一手成／未成及押后禁操作均可见；其他五位分别展示主手助攻消耗、择牌、普通点数交棒、换型蓄势、真扣10金。样例不是当前手牌、随机承诺、预计算总分或已发生奖励。每位英雄仍能玩三路，完整能力／模式／取消／最后确认才创局的语义保持。

| 英雄 | PC1366×768 | 手机390×740 |
|---|---|---|
| 阿默 | [图](native/1366-hero-amo.png) | [图](native/390-hero-amo.png) |
| 骰爷 | [图](native/1366-hero-touye.png) | [图](native/390-hero-touye.png) |
| 老幻 | [图](native/1366-hero-laohuan.png) | [图](native/390-hero-laohuan.png) |
| 二响 | [图](native/1366-hero-erxiang.png) | [图](native/390-hero-erxiang.png) |
| 阿燥 | [图](native/1366-hero-azao.png) | [图](native/390-hero-azao.png) |
| 谢幕人 | [图](native/1366-hero-xiemu.png) | [图](native/390-hero-xiemu.png) |

三路线实际选中的代表英雄为骰爷：[PC同点](native/1366-route-group.png)／[顺子](native/1366-route-straight.png)／[同花](native/1366-route-flush.png)，[手机同点](native/390-route-group.png)／[顺子](native/390-route-straight.png)／[同花](native/390-route-flush.png)。改点／染色前后与真实购买及使用工具命令逐点数、花色相等，示例阿默6金实际改点后4金／染色后2金；画面不把这些纯测试夹具冒作用户交易。延迟成长仍写下手生效，路线第一层不重复起手牌名。

双端六英雄／三路线、重复预览、切换、blur、低动态、取消与真实最后创局入原商店，共[30原生记录](native/report.json.gz)。选择阶段完整session run/pending与localStorage逐字段同初始；最后确认才创局。320×740和740×390仅骰爷／顺子代表，不冒称全部组合。无强制等待；短横同样标明示例。

[320／390+bottom34](safe34/report.json.gz)四个实际文字／牌面边界记录通过，英雄／同花示例的两排牌与标题、结果、成本分离：[320路线](safe34/320-route.png)。[320×640](compact640/report.json.gz)用既有预览按钮切换两状态，牌面与风险保持可读：[前](compact640/320-hero.png)／[后](compact640/320-hero-after.png)。该切换只改场景临时字段，不写存档；重选英雄／路线重置。预览触点44px，路线触点至少44px；不缩到不可辨字号硬塞。

原9123aef WIP在320普通高度的成本越界，用固定旧源码有限复现保留[原FAIL](original-wip-FAIL/FAIL.png)／[报告](original-wip-FAIL/report.json.gz)。新布局中间未提交工作树的安全区遮挡[FAIL](intermediate-safe-FAIL/FAIL.png)／[报告](intermediate-safe-FAIL/report.json.gz)也保留；不是最终产品证据。首轮路线按钮42.67px的单测FAIL日志保留，恢复148px三行带而未放宽44px断言。最终15定向（含三条真实工具命令）／typecheck／计划检查通过；源码截图先在同一工作树完成，随后提交为48971b0，最终精确HEAD标准CI另核。

商店、结算、领域／内容／存档身份、音路、公共资产、依赖与输入main逐树保持。无新CG／依赖／武侠／Rex，不跑本地整库或长录屏。本轮仅软件图／有限原生操作；真人理解、六英雄吸引力、用户设备GPU／流畅度／听感及全模式全视口未签。复跑native-check／safe-check／compact-check从仓库根，使用已有Vite／Playwright／harness。不能将测试数量当体验签收。
