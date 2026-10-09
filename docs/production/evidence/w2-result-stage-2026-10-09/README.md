# 胜败谢幕 → 下一场：有限整屏证据

输入 main `59586a46d1a0b2f2b1f258e9b944931ded37293c`，2026-10-09 父07:31UTC已普通FF。首版产品 `ca8c633980e415f827ee72624f8374c6f53ea4a9`；最终产品与以下候选显示/操作均为 `eba4f240708f6bdf40c2a15b8df399e9e6c24dc5`。当前范围见 [RESULT_STAGE_SCOPE](../../RESULT_STAGE_SCOPE.md)，原W1/W2 §5/§6，不改变W4结算、奖励、成长、存档身份、BGM或音量30/80。游戏6.1 Medium单线，无并发；新增图/音频0。

## 三份原有结果，先看画面再修改

1. ordinary：原 w2-build-keepsake/report.json profiles[0] 的 normal continuation hand，seq6，两对325=93×3.5，全场643/400、奖励6金。二响实际加倍率，b10本手读取10、手后保存20；两者才显示prepared来源图。
2. high-growth：原 w5-natural-flush-midgame/report.json.gz final，seq79，第三章中场同花3802=338×11.25，全场5776/3600、奖励12金。c06本手读取已有加倍率2.25、手后保存2.5；二响对这手没有真实加成，因此不突出其立绘。晚买回马枪未发动，也不展示为贡献。
3. failure：原 pc-shop-2026-10-07/controlled-lose.json，seq7；这是**已存在的明确受控失败**，不是新自然败局。最后高牌25，全场99/400差301，出牌耗尽、弃牌余3；保留旧group-upgrade身份及同种子重试。

baseline-59586a4：三结果 × 1366×768、390×740、320×740，共9张原生导入截图。先实际view普通/高分/失败PC与手机代表图，然后复用prepared selection人物、b10/c06缩略图、p00-paper以及现有纸墨/奖励组件。没有出牌、扫描种子或重跑自然经营。

candidate-eba4f24：同三结果以上三尺寸及740×390必要短横，共12张原生导入截图，完整控制器状态始终等于输入存档，0业务命令。实际view最终普通1366/390/740、高分1366/320、失败320，数值、来源/成长、奖励与主操作分区可读。普通墨色短收势，高分朱红强调真实分数，失败静纸明确差额；装饰不接输入。关键数字和主按钮立即显示，视觉收势180/260ms，不持有业务回调；跳过使用原footer位置，不再占来源文本。

## 拒收与补正，保留原记录

- original-observer-FAIL-ca8c633：初次观察器误对Graphics调用getBounds，保原报告/FAIL图/原脚本。改为读Graphics已标注的bounds，没有放宽业务保护。
- REJECT-phone-overlap-ca8c633：首版捕获report的PASS仅覆盖输入状态/页面错误，**不签无遮挡**。实际图审发现390/320奖励纸条覆盖全场进度，原390普通和320高分图及完整报告保留。eba4f24仅调整手机score/source纵向区域与奖励位置，保原字体和业务数字；最终同批结果重核。
- actual-text-bounds.json：最终12例真实文本位于纸台内，实际全场进度在奖励纸条上方。它是辅助几何，不能代替上述实际看图，更不能代替用户实机。
- 阿默已保存真实助攻身份摘要继续在奖励行下方呈现；短横保留在下一步事实区。未添加无事件助攻或新增角色规则。

## 有限原生操作与完整保存

native-actions-eba4f24/report.json.gz：只用上述三份结果。

- 普通PC默认动态：在视觉timer有效时主继续已启用；原生跳过完整state不变。双击继续只新增一笔OpenShop，全部保存state与applyCommand相等、IndexedDB checkpoint完整相等；等待旧视觉timer期限后不变，刷新恢复仍同state。
- 高分390低动态：不创建庆祝timer；真实拦截c06缩略图加载，退回可读“越染越深”和真实3802，没有色块或失效按钮。一次缩窗320，完整state不变，IndexedDB一致。
- 受控失败320：原生双击同局重试，只有一个规范新局，全部state等于createRun，同种子/角色/旧身份；新局journal为空，IndexedDB完整相等。没有再PlayHand或重开经营链。

32必要定向（5文件）及typecheck通过，原初版/最终日志均保留。最终仓库全套/content/build/三浏览器smoke/docs只在最终精确head标准CI执行一次，结果由PR/交付回报附上，不在此预写成功。files.json按每件实际字节记录bytes/SHA256，不自哈希；reports以gzip无损保存，保留完整对象/状态，没有删断言。

## 未签事项

heard:false；当前只保原success/overkill/failure语义调用及RewardCoin真实cue边界，不签新音频听感、设备性能、真人审美或继续意愿。W5其它顺子/晚到/缺件自然经营、六角色/工具战略价值、W6用户PC/手机/GPU/听感仍开放，不能用本三份结果代签。无长录屏、软件GPU FPS、全旧档矩阵或新自然路线。本候选只draft父审，main/部署由父任务协调，不强推或绕保护。
