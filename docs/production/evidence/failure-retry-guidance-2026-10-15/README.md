# 失败后再战指引：开发候选与本地有限证据

基线main `4a52fd0b0fb9ac0a49b8cb5e79abc8db4326e2d7`；用户重新授权继续既定L105/P2失败指引。独立开发分支 `feat/failure-retry-guidance-20261014`，保留PR184分支不合入；本批不访问此前被403拒绝的正式站、不改权限、不合main。唯一排程仍为 [DELIVERY_PLAN](../../DELIVERY_PLAN.md#当前统一执行计划)。

## 玩家现在可以做什么

失败页保留已保存的热度/差额、末手、资源和留影，新增加“再战建议”入口。先看本场实际差额/末手，再看2–3条简短建议和牌例；可回看末手、回到建议/失败页、查看留影/本场详情、返回选角或直接同局重试。次数用尽、无可出牌、主动结束分别显示；主动结束不当成构筑弱或玩法失败。无有效末手时不归因、回看禁用；Boss应对只在有效末手的历史记录中存在相应影响时给出。

升级与做牌说明读取该局身份及已有领域资格/基础价格：core-build已发现且未30级、Lv1原价4金/后续按等级、基础改牌2金/染色4金、每店共享一次；实付优惠、同名现货、容量与合法目标交原筹备店确认，不拿失败局余额做新报价。不承诺补到牌、供给、胜利或继承余额。重试仍走原startRun/GameSession/SavedRun，沿原种子/英雄/模式/规则重新创建；金币、构筑、工具与成长不继承。

只改FailureSummary（新增独立只读指引，原failureSummary返回合同不变）与Intermission失败支路。短屏失败启用既有compact-safe留影空间，320中不挤入立绘来盖差额/末手；成功、高光、声音及领域/保存/RNG模块没有修改。当前保护树与实际窗口见[final-source-proof](final-source-proof.json)；旧source-proof只对应此前12项阶段。

## 已执行的有限软件验证

[最终13项汇总](final-validation.json)及[原生完整报告](final-native-report.json.gz)在产品/观察器同一冻结head `7d1071cefa3eeb63966af3a2a46ec3afede3848a` 一整轮全部PASS，source/index/HEAD前后均不变。真实快照见[最终完整state](final-full-state.json.gz)，[最终截图映射](final-screenshots.json)只在PNG逐字节相同时复用旧文件，否则另存final前缀，不改旧图身份。

此前bd07d9ac的11项PASS/换角观察器FAIL和ecf1e564的换角PASS仍在原报告与12项汇总中按旧源码保留，只是历史阶段；最终13项不借旧报告合成、不借旧源码签收。补查发现主动结束刚跳过的场仍沿旧跳场标记、没有再战入口并把未计分当作差额；[原用例FAIL](failures/post-skip-before-FAIL.txt)保留。最终只在run-lost显示中让主动结束优先，跳场注明未计分，不修改真实skipResult、热度或保存。

| 尺寸/窗口 | 实际操作与结果 |
|---|---|
| PC1366×768、390×844、320×568，各三种结束原因，共9项 | 严格生产导入原命令结束的合法受控终态；主屏/建议截图、真实回看/返回建议、展开资格规则/滚动底部、返回失败页、留影→建议、返回选角→返回原失败页。完整state、journal、checkpoint、revision只读不变。各端次数用尽另做快速重复重试，实际仅1次commit、seq1空journal，完整新局等于原createRun，原局为同分区备份；刷新标题继续完整相等。 |
| 390×568 B02窗口 | 末手实际1笔计分牌普通点数抑制事件（第5张；第4张是陪衬牌），[原trace复核与计数勘误](boss-event-audit.json)，保存热度90、本场479/800、差321；3条建议包含真实前三张应对，不归因成单一败因。查看/返回完整保存不变。 |
| 390×568新局保存故障 | 原store.commit的受控quota故障；旧state/存储保留，pending为精确原createRun候选。重复保存失败不重建候选，恢复后共3次尝试、仅1次成功revision，菜单接回商店，冷恢复完整相等。 |
| 390×568跳场后主动结束 | 原SkipStage→AbandonRun真实命令终态；显示主动结束/最近场已跳过未计分，建议可达、无末手回看禁用、查看和返回完整保存不变。 |
| 390×568换英雄/方向 | 建议→返回选角，选择二响/同花，确认前原保存不变；确认后新随机种子、新局完整等于createRun，单次revision，冷恢复相等。原局节目关闭分区current/previous原样保留，新局节目开启分区独立保存，不能错要求两分区共用备份。 |

完整输入/逐点保存以[最终完整state](final-full-state.json.gz)为准；旧native/selection快照保原源码身份。它们为本地E2E构建的受控公开终态，不是自然获取、自然经营/18局、新手理解、实体触控或发布验收。所有原生操作通过鼠标/触控/DOM；只读观察窗口与store.commit故障封装未调用领域命令或编辑应用状态。320/390短屏需要滚动读完建议，原弹窗固定操作条始终可达；不是手机首屏全文可见声明。

最终相关8文件98项、typecheck通过，[新日志](final-targeted-checks.txt)对应最终7d1071ce代码；plan32及校验器自测仍通过。远端精确最终HEAD CI另在[draft PR186](https://github.com/big-dimple/dachoupai/pull/186)据实登记，不借原main/旧候选CI签本批。没有本地再跑全量或18局。

## 实际看过的代表画面与原失败

- [PC建议](pc-hands-advice.png)、[390建议](390-hands-advice.png)、[320建议](final-320-short-hands-advice.png)、[320底部规则/操作](final-320-short-hands-rules-bottom.png)。
- [320主屏，事实避让留影](320-short-hands-failure.png)、[390无可出牌](390-cards-advice.png)、[390主动结束](390-abandoned-advice.png)、[390 B02建议首段](final-390-short-boss-advice.png)。这些PNG已实际查看；B02后续建议需滚动，未冒称首屏3条全文。
- [跳场后主动结束](final-390-short-post-skip-advice.png)、[对应主屏](final-390-short-post-skip-failure.png)已实际查看。
- [新选角到商店](final-390-short-new-selection-shop.png)及故障页/恢复商店PNG另留原图，不按未查看图签审美。

[开发失败摘录](development-failures.txt)与[原FAIL目录](failures)保留错误夹具、模式配置/自动菜单/分区期待观察器失败和真实320遮挡。320的软件初版PASS没有发现像素遮挡，实际看图拒收后只修失败紧凑空间，最后加入真实bounds检查并重验；不改guard消红，也不改原截图身份。

实体手机/听感、整体美学、三路线自然经营/完整平衡与深层无尽仍OPEN。正式手机QA继续按PR184的NOT_RUN读取，本地通过不覆盖它。候选供父审，未合main、未部署；SHA256SUMS覆盖本目录证据。
