# 骰爷合同只读公开例子

当前规则main1317e6e；实际手牌来源PR69 b03 normal老幻/group-natural-17 commandSeq5。public-example.json只含当时可见手牌/ownedJoker ID/静态四牌规则、218子集的唯一evaluate类型集合，不含抽牌序/RNG/预计分。没有骰爷实际下注、成功补牌或新领域/UI实现；只支持待评审合同的公开可达资格算例。

runner无createRun/applyCommand/金币牌序修改或seed搜索。可从已保存../w7-laohuan-refill-2026-10-08/native-b03c9f9/report.json.gz解压到/tmp/laohuan-native/report.json后，在当前仓库安装依赖条件下运行runner；仅加载唯一evaluate及公开定义，不启动浏览器/评分。结果应同样R={high-card,pair,two-pair}，不是复跑自然局。

候选共同合同及A/B费用/倍率见../../TOUYE_PRE_DISCARD_CONTRACT_REVIEW.md，未锁前不实现。plan/diff通过只验证文档，不签可玩、真机、听感、趣味。sha256.json覆盖本目录自身以外所有文件。
