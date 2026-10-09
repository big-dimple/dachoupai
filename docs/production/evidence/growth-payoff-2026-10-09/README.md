# 真实成长入账与下一手兑现：有限软件证据

输入main `67fa9c3376b7f8d16f4cf62e23edfff350e8fea5`（父20:17UTC已FF PR91）。产品`ecce7dcdcc3592f4bab04f817e8b287dda12dfa9`，普通路径接入补正后实际原生证据源码`2c21cd1bb66e540e789a4c4a8a6d0ea66444177d`。不是已合main记录；最终精确HEAD CI/draft在PR回执中核对，不改源码追写CI回执。游戏6.1 Medium单线、无并发。

玩家能在空选牌区直接看到原来源卡、“上手读取”和“结算后存”，明确新增下手生效；选择牌后纸页让位。实际正增长短印记只贴原卡标签，与已有rest并行，不新增计分等待、音路、规则、随机、货币、身份、保存字段或美术资源。封禁无读取显示“未读取／—”，不能倒写成读0；消耗、归零、未新增不演成增长。当前持有余额或实例变化则不借用旧trace。

## 样板与明确限制

`current-controlled-fixture.json`：当前正常入口身份`quality-r2-basic-tool-choice-v1` / `json-fnv-v1:74a532e990d14b0d`，seed group-natural-17，二响／同点路线。**仅非起手货架ID受控为b10**，价格由实际r2Price计算，未注入现金、成长、发牌或奖励：6金买4金，余2；真实BuyOffer/LeaveShop/EnterStage之后原公开手牌两手两对，实际分数182、186，目标400，累计368，仍await-input。第一手读取+0、保存0→10；第二手读取+10、保存10→20。不要沿用旧身份318/325，不声称自然获得率、正常随机货架或稳定过关。

`native-PASS.json`合并原5条通过与仅补跑390低动态边界的1条；PC1366×768、手机390×740的normal/fast/reduced共6条最终**完整state、journal、storage相等**，storage.current与实际控制器一致；每条刷新并继续状态不变。normal用实际原卡标签印记观察并留帧，fast经菜单真正快进；不是模拟静态UI框。320×740同态完整纸页、选择/再次点击撤销且零保存写入。740×390原预览区域不足94px时保原摘要与“上手结果”入口；未硬塞、未缩小文字，不宣称短横也有完整新纸页。

`baseline-PASS.json`在只读隔离main worktree构建，生产仓库未回滚；PC1366/390同一fixture、同实际出牌两手，与after reduced完整state/journal/storage一致。`comparison.json`保存精确前后源码与复用b10原资产SHA256。只核本包实际复用卡面，无全库重新审计。

## 可见对照

| 状态 | main基线 | 候选 |
|---|---|---|
| PC第一手 | [旧提示](before/1366-hand-1.png) | [读取0、存10](after/1366-normal-hand-1.png) |
| PC第二手 | [旧提示](before/1366-hand-2.png) | [读取10、存20](after/1366-normal-hand-2.png) |
| 手机第一手 | [旧提示](before/390-hand-1.png) | [读取0、存10](after/390-normal-hand-1.png) |
| 手机第二手 | [旧提示](before/390-hand-2.png) | [读取10、存20](after/390-normal-hand-2.png) |

[PC真实增长印记](after/1366-normal-stamp-0.png)、[手机印记](after/390-normal-stamp-1.png)、[320纸页](after/320-same-state.png)、[短横回退](after/740-same-state.png)实际view检查；不做长录屏或软件GPU帧率。28项定向、typecheck与plan32通过；最终仓库CI独立核精确HEAD。

## 失败没有改写为通过

- `failures/growth-payoff-fixture-first-FAIL.log`：错误控制封禁及未更新f05初始实例，分别触发score-diagnostic与领域不变量；改用既有真实历史封禁记录，受控f05初始实例明确更新。
- `failures/growth-payoff-sealed-report-path-FAIL.log`：summary误当实际报告，报告结构失败；改读取既有native真实状态。
- `failures/growth-payoff-facts-final.log`：真实封禁历史值为20→30，测试旧0→10期待错误；期望按原状态修正。
- `failures/ordinary-path/`：原生发现新纸页只接助攻路径，普通路径仍旧提示；2c21cd1补普通路径，警示与选择操作保留。
- `failures/bounds-observer/`：观察器用未换算纸页本地坐标；实际父容器世界坐标补正，未改产品布局/字体。
- `failures/clear-observer/`及`growth-payoff-native-third.log`：前5条通过，最后窄屏选牌后等待不存在的clear按钮超时；改实际再次点同牌撤销，只补跑未完成390低动态/边界，日志`growth-payoff-boundary-final.log`。

静态测试、软件浏览器截图/帧、完整保存相等不代替真人理解、观感、物理设备流畅度或音频试听。完整第3包、六角色体验、其它自然路线、整体平衡、W0–W9与人类验收继续OPEN；不会以本样板签完整成长爽感。
