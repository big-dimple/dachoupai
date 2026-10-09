# W5缺件改牌与留钱：有限证据

输入main `6178bb41a8f11b95d43a603a9bf3ac58a02156ab`，父22:07UTC普通FF PR94。产品 `3f9bb0c6454bd34a76f188c6f0b6868d2bf96e0e`；后续50b8277只补harness，当前源码三文件仍逐字相同。最终HEAD由draft PR精确CI回执另核，不把本本地结果当CI或部署。

## 改动与行为
原培养前层没有可执行的核心购买时，比较已有工具、真实工具货架或已有基础自选；保持留钱主动作。读有效持久牌组，不读抽牌顺序/RNG。最多一个明确局部例子：同点1→2或2→3且不拆别的对子/三条（先例示2→3，不称最优）；五点顺子窗口补唯一缺点且保留原点数；同花4→5且不拆另一可成同花。来源、原目标减少、花色/点数保留与不保证抽到都显示。买的实际金币/常规本金利息档不等于已到账；已有工具无新增金币但使用消耗。无例子可留钱或自主看基础位；基础位不含染色。

既有正向现货推荐优先且不改，六角色手记/更换方向/全部货架保持可达。只增加纯BuildFallback与原弹窗回调，使用原购买、立即使用、目标筛选、确认和保存结果。原美术零新图/音，不改数值/身份/随机/领域/保存。七棵保护树见protected-trees.json。

## 受控状态披露
复用PR91 `../basic-tool-choice-2026-10-09/window.json` 的第4店（stageIndex3）存档，不重新跑种子或八章。公开控制见harness/fixtures/missing-core-choice.ts：现金改5（缺钱案1）；同点保留一张7、两张8，其它7→9/8→10；顺子已有7→10；同花只保四红桃，其余红桃→黑桃，并加入已有T03，形成满箱。均由makeCheckpoint/readCheckpoint严格验证，导入journal为空。不是自然取得、概率、角色差异或经济平衡证据。

## 必要检查
- 33项定向（三files，9新fallback＋原build/basic24）通过；实际优惠1金/同名现货实价/已售/额度耗尽/满箱/缺钱/包场持币损失/阶段/合法目标/隐藏顺序不影响，以及原basic六角色新旧身份合同。typecheck与计划32包通过。
- native/report.json：产品3f9bb0c，PC1366×768同点原基础确认实付2、5→3，再自行选7♣→8♣，实际8由2→3张；390×740同花已有T03自行选2♣→2♥，♥4→5、现金仍5。两条BuyBasicTool/UseConsumable/LeaveShop/EnterStage按原领域命令完整state相等；仅前者购买。查看/关闭/购买取消的state-journal-storage全相等；刷新标题正常继续后全相等。完整输入、已保存结果、入场state/journal/storage在native/states.json.gz，gzip只是证据压缩。
- 同一harness顺子1366公开缺点3、4、5、6、7中只缺7以及390仅1金只读通过；顺子这条未原生使用，不冒称三条都完成购买使用。
- before/report.json：main6178同一受控同点/同花各只读查看/关闭，全state-journal-storage不变，无事务；配对原生截图显示原前层缺少这些可执行选项。报告通用scope文字列出了harness的能力，baseline=true下实际只有这两次只读，不能当购买证据。
- access/report.json：harness50b8277，flush同一未使用状态390/320/740只读，不重跑交易；320直接可见对照，740可选卡内容须滚动，滚动后工具按钮14px/44px且完整在视口；共同底部按钮固定44或56px。native中320/740另是使用后的同态留钱回看，二者不混。原边界轮shots/missing-core-boundaries是重跑flush事务，未重复纳入主证据。
- actual view：before PC/390；native PC对照/选目标、390对照；access320/740未用对照、740滚动可达、390目标；native顺子/1金与使用后320/740、PC已购/已存及390已存已实际查看像素。未声称其它未查看截图全部视觉签收。

## 保留FAIL与限制
first-unit-FAIL：初次组例子选先序6→7、顺子窗口期待错、测试错以为没有其它合法修补；改组例示先2→3、修正真实3..7期待和不拆组负例，未放宽保存比对。first-type-FAIL：可选reason赋给必选string，补明确可选类型。second-FAIL：测试find回调遮蔽选择对象，访问PlayingCard.example，改变量名。原日志全部保留。一次view_image误取main工作树路径（图片实际仍写当前工作树）无产品问题，随后按实际路径查看；无新原生失败。

这是有限云端软件证据。没有六英雄自然中盘/完整八章/长期平衡/人类理解/设备帧率或音频听感验收；W3/W5/W6/W7剩余及G1、P08、C04历史暂停不改变，整体第3包仍OPEN。游戏6.1默认Medium串行，无并发，最终draft父审并协调main。

## 精确首CI期待补正
34d9838首CI37999771455的domain：191files中189通过、2914tests中2912通过；build-journey-dialog与shop-current-decisions两条精确按钮文字仍期待旧“这轮不买，留金入场”，实际新“先留0/21金，进入牌桌”。本地初始定向漏纳这两files。补正仅两测试的明确新文案期待，primary/readonly/完整state断言不放宽，产品三文件与3f9bb0c保持逐字相同。扩大到五相关files50测试、typecheck通过，日志targeted-expanded/typecheck-expanded。ci-first-FAIL/domain.log及receipt.json保原FAIL、精确testedCommit和before/after不变；不冒称34d9838绿，也不借首轮docs成功或旧browser。新最终HEAD一次标准CI另核，不重复原生事务/主线对照。
