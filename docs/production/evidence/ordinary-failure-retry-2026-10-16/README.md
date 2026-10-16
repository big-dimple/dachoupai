# 普通失败后再战：真实流程核对

独立分支audit/ordinary-failure-retry-20261016，基于待发布并集646505e7。复用本地E2E构建0ff07146，其src树与646505e7完全一致。本轮只新增自有观察脚本和证据；src/tests/public、共享计划文件及主仓库未改，没有推送。最终证据SHA由本轮交付回执给出。

## 实际操作

Windows Chromium390×740原生触摸、低动态；普通标准模式、新规则、辛弃疾、同点方向，种子growth-current-49。真实首页/选角开局6金，货架实际4金购买练对子，余2金。用合法弱单张演示失败：22、22、26、27热度，共97/400，4次出牌用尽，仍剩3次弃牌。没有导入/修改状态、直调命令、强塞库存、改抽牌或看未来分数。这是普通资源下刻意较弱选择的可达流程，不是自然失败率或玩家行为样本。

失败页与建议准确显示差额303、末手高牌27、余0出牌/3弃牌；明确末手记录不等于败因，重试不继承，建议不保证过关。展开规则并滚到正文底部，回看末手后返回建议；浏览期间完整state/journal/storage/localStorage不变。实际建议、规则底部、下一店和对子结果截图已视觉核对。

点击同局重试，种子/英雄/方向/模式/难度/规则身份相同，恢复6金、空构筑/工具和初始等级，序号回到1、journal为空。runId是稳定同种子标识，不能据此误判继承。

重试后实际4金再买练对子，余2金。此时未发现牌型，升级服务为空，符合建议的“只选已发现牌型”；没有假定升级资格或优惠。查看商店并取消不改存档。随后保留真实手牌的同点两张并打出对子，得110热度，练对子实际保存成长热度+10；还可继续出牌。新局实际日志仅BuyOffer、LeaveShop、EnterStage、PlayHand。冷刷新恢复完整状态/日志/存储一致。没有执行PracticeHand，没有声称这一手过关或建议必胜。

## 结论与复用

未发现本流程可复现的建议错误、入口失效或信息缺失，不为凑成果改产品代码。软件证明建议对应一个可执行的具体行动；玩家能否理解并自主采用仍需真人主观验收。真机、平衡、长期自然经营、失败后通关概率均未签。

原[13类受控失败证据](../failure-retry-guidance-2026-10-15/README.md)保留复用；FailureSummary完整Git blob相同。Intermission和RunLaunch此后有文案/规则身份变化，原13例仍属于旧版本，不拼成当前全量通过。本轮仅新增这一条当前规则普通资源流程；无产品变更，没有重跑大测试、单元套件或生产构建。

首次观察器误要求重试换runId，原FAIL保存在observer-failures，改为验证实际资源/序号/journal；归档校验还遇到Git规范化换行与Windows CRLF差异，已改用Git blob身份核对，原原因保留。没有因此修改应用代码。

最终原始报告scope字样残留最初计划“next-shop practice”；native-original-report保留原字节，native-report仅修正scope并注明来源，所有状态/操作数据逐项不变。实际操作以上述日志为准，不能把计划写成结果。

执行：node --check harness/ordinary-failure-retry.mjs；ORDINARY_RETRY_OUT=<新目录> ORDINARY_RETRY_BUILD=<保存的本地E2E构建> node harness/ordinary-failure-retry.mjs。所有动作通过真实DOM/Phaser触摸；页面脚本仅观察状态和界面。详见status.json及压缩报告。
