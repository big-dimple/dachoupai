# 二响 C：有限候选证据

输入/旧证据 main `832823de77cd733776b54f97a64bce1fc9971457`；候选产品 `2e8a562405e582f7610df5743f7304b2449d84c6`。候选规则 hash `json-fnv-v1:19925b539c9e1577`。本目录是软件行为与截图证据，不是用户设备、GPU、听感、真人玩法、三路线均衡或 main 合入证明。

## 严格分开的三类记录

1. **历史正常失败保留**：[baseline完整原生记录](baseline-832823d-straight-native.json.gz)是旧规则 Title→二响→顺子、既有 `route-first-19` 的实际买牌、两次P05升级、c11、reroll、四手820/860/1039/1375，到stage4正场404/1500失败、21金币；a06/借东风公开报价与未买决策也保留。四张baseline PNG保原来源，不贴成候选图；本次未重跑原30操作或拿失败补成赢家。
2. **受控有限比较**：[历史A/B失败](historical-ab-comparison.json.gz)、[ABC完整输入/事件](finite-abc-comparison.json.gz)、[简表](finite-abc-summary.txt)。C复用前15代表输入并补既有记录同花首个有效核心/假定续接，合计17个有限输入。增强、假定上手点数与额外来源明确是构造上下文，未声称自然获得、胜率或货架断供。独立C探针[源码快照](isolated-c-probe.ts.txt)从未作为生产模块导入；[最终生产C对照](production-c-parity.json)17例得分/RNG/Joker/金币一致。
3. **当前正常入口候选**：[成组完整原生状态](candidate-group-native.json.gz)与[顺子首手原生状态](candidate-straight-native.json.gz)携带产品精确SHA。正常 Title/英雄/路线创局，未注入存档或成熟库存；两个种子都是此前已有预声明记录，无扫描。系统Chromium，1366×768/DPR1，成组途中390×740窗口变化；低动态。真实输入指定A的2核心、取消再指定、两次AI切、两次排序按原合同清选、226首手保存、刷新恢复A连锁（本手草稿不恢复）、换5的3核心1290过场清链；顺子只核首手8核心852。不是完整中期或整章验收。

[成组原生执行脚本](erxiang-core-native.mjs)与[顺子原生执行脚本](erxiang-core-straight-native.mjs)仅通过浏览器输入操作，读取状态与同命令域结果比对；`node docs/production/evidence/w7-erxiang-core-c-2026-10-08/erxiang-core-native.mjs` 可在装有 `/usr/bin/chromium` 的环境复核，默认输出 `/tmp`。本轮最终产品源/测试无未提交差异。重跑不自动升级为设备或真人通过。

## 图与当前验证

- [PC当前指定组](target-1366.png)、[手机当前指定组](target-390.png)、[PC指定/取消详情](detail-1366.png)、[手机详情](detail-390.png)。已实际查看PC详情和手机组标记，未见相关控件遮挡；不是用户实机认可。
- [首手成功保存](first-committed.png)、[第二手葫芦过场](second-clear.png)、[顺子8核心](target-straight.png)、[顺子实际852过场](straight-clear.png)。每个来源的实际授予与封顶/下一手条件在保存后详情中，动画只消费该trace。
- 57项定向检查/typecheck通过；11项新能力检查包含非法核心拒绝、不同实体同点续接、弃牌/清链/入场、B08/Q01、三种不同真实来源＋增强共同封顶、零授予、保存失败重试、trace/根/次数篡改拒绝。共享约束extra≤4/depth1/events≤512，整手Joker不重放。
- 最终精确head标准CI由PR/API回执另报，不以本地定向检查代替最终测试/type/build/smoke。当前候选未合main；父独审与真人玩法、用户设备/GPU/听感仍待完成。

[文件SHA256](sha256.json)保来源核对。二响C的数值取舍与“普通两对/三条弱于旧 +1.5，顺子/同花显著收益依赖增强”的限制见[候选合同](../../ERXIANG_CORE_GROUP_CANDIDATE.md)。游戏6.1 Medium串行；D02 B1仍PROPOSED，不加费用、权重或新角色机制。
