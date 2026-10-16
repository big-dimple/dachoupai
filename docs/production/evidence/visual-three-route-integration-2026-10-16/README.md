# 六英雄原画、苏轼新图、高光与胜利页整合

用户已批准当前三路合并提交。此前main为8728e18e823ef9cbe28a4350a566de21f1e3127c；来源胜利dfa755dff70c9296b847409e55fb604f758a4356、原画76e64c14ab03032b45bba4778ebf4c9b7fe389a1、最终高光3924854b482a528764398eaac290be40f8636a19（已含原画祖先）。独立整合分支 integrate/victory-art-highlight-20261016；普通merge，无冲突，无重复cherry-pick。运行时并集f4d814b1f2c8c6e7388f8bb367b59352248dd8fc；交叉观察器最终2e500ef4e52231bdf656b123695d384df143c905，src tree c36cd1b31b813acdf1c5a37b1be22c15e92121f7。最终发布完整SHA以实际Git回执为准。

## 同一并集的实际画面

[新苏轼黑底全图](screens/portrait-full.png) → [关闭返回选角](screens/portrait-return.png) → [固定眼神蓄力](screens/highlight-eyes-390.png) / [真实×1.3与累计10.4](screens/highlight-value-390.png) / [落位](screens/highlight-landing-390.png) → [胜利页3931分](screens/victory-390.png) → [商店14金](screens/shop-390.png)。短横：[10位倍率](screens/long-value-740.png) / [科学记数最终结算](screens/long-victory-740.png)。均为实际UI操作后的原生PNG，没有合成、暂停或改演出时钟。

我已看图确认：原画完整等比居于黑底、关闭不盖画作；新眼位保持两眼眉线，高光外部完整遮挡，眼神之后即接真实倍率；胜利标题简洁，分数/来源/奖励依次排列，商店入场动画结束后货架完整。用户批准的是本批范围，不代签物理设备、听感或整体P08。

## 只补交叉，没有重跑各自大套

- 390×740一条原生链：公开查看新苏轼原画→关闭返回→生产检查点导入→真实选牌/出牌→高光→胜利→回看关闭→OpenShop。原画关闭、演出、回看和冷恢复均不改完整state/journal/IndexedDB/localStorage；出牌完整结果等于原applyCommand，进入商店只增一条OpenShop，金币14→14，不重复奖励。
- 实际HTTP的avatar/selection/focus/portrait响应及版本hash与资源manifest一致；focus为f158579f7e05、56012字节；原PNG SHA256为abe4446d6c57b1c2d8d83434c766e0a452aeb8ee198615cf58bd918b1021dfcb。原图和派生与76e64c14逐字节一致。
- 740×320一条既有合法受控大数链：真实燃30金/出牌，四个实际来源高光，10位累计3034462500保持36px单行，最终1952400131333767按既有科学记数显示；回看和冷恢复完整不变。正常八章首次胜利按现有生产保存策略写入标准难度解锁，已逐字段核对；没有静默忽略localStorage变化。受控库存/等级不代表自然可达率。
- 两条最终报告PASS、页面错误0。生产typecheck+Vite构建PASS，既有大chunk警告保留。原23项胜利/68项原画/28项高光及各自原生矩阵按完全相同的责任源码保留原证据，本轮没有冒称重新跑完。
- 复用clean E2E构建16d648b9；它与最终观察器/候选的src/public/art完全相同，源码树和每个责任范围见runtime-equality.json。新增只是有明确消费者的交叉脚本/观察器及证据；领域/内容/存档/音频/平台/GameScene/package/CI配置与此前main无差异。

复跑使用现有原生脚本：HERO_RESULT_CROSS=1、HERO_TITLE_CAPTIONS=1、HERO_FOCUS_FIXED=1，HERO_TITLE_CASES分别选e11-390-normal及integration-long-740-normal，运行node harness/hero-source-title.mjs。前者加HERO_FOCUS_ASSET_PROOF=1；HERO_TITLE_BUILD_DIR仅用于已确认src/public/art完全相同的clean E2E构建。

## 原失败与边界

history保留两份原FAIL：第一次回看关闭后立刻点继续，撞到原有350ms防穿透保护；脚本随后等待保护期后真实再点，未改产品输入逻辑。短横首次脚本误断言跨局解锁完全不写localStorage；修为调用生产recordSavedRunProgress推导精确期望，完整状态/journal/存储仍严格对比。原画/高光/胜利产品没有为这些观察器失败改动。

P08仍in_progress；C04/A03/V01等正式门、自然晚期与平衡建议不被本批解锁。不强推，不查CI/域名，不宣称部署已完成。原证据与原图历史均保留。
