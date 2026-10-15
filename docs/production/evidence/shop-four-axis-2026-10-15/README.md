# 真实商店四轴与完整操作链（2026-10-15，开发候选）

基线 main `4a52fd0b0fb9ac0a49b8cb5e79abc8db4326e2d7`。产品与专项观察器提交 `f350047d1d7578314b77db907bd68dce373f3c38`，src tree `32877bb58457b0817eef1011d9e0c52dbdd92c7c`。本目录为其后仅证据提交，不更改产品；未合 main、未部署，不签物理手机、人类理解/审美、自然获取/经营平衡或完整游戏体验。

## 实际实现

- 货架独立版次纸签贯穿手机和 PC（含满槽）：名字/效果来自 `R2_EDITIONS` → 现有 `editionLabel`/`editionEffectText`，普通/闪箔/全息/多彩；PC 价格只表达报价和动作。固有稀有度仍读定义、保留独立框和徽记。
- 货架五颗实空星改为固定向量轮廓，与购买/逐槽比较的 SVG 共用轮廓；原星值、五星算法/颜色保持，没有配额或新阈值。路线小标签与组合潜力仍各自独立。
- 购买详情、比较候选/每槽、管理页共用稀有度/版次标签。由比较进入管理时明确显示“换入「候选名」的推荐”，使用原指定售后推荐，避免把候选推荐算成已持卡强度。组合显示仍是缺项/条件/待触发，既有上手记录明确“新牌未参与”。
- 390×568 有效卡面宽 73.714：原组合可用宽 43.714 导致标记被省略，现移至稀有度上一行。短屏比较中候选与槽位共用原生滚动面，长组合不会挤空独立槽位滚动窗；固定底部动作仍完整。
- 第五槽管理显式返回、关闭按钮、Escape 都回原候选比较，保持该实例、滚动与焦点。出售取消回原管理卡；出售和买入仍分别走原事务。PR180 的整牌、逐槽比较、做牌/库存/立即用/保存恢复均保留。

产品改动只在四个授权 Shop 文件及 shop 专属 CSS；DetailDialog、GameScene/B05、失败页、领域/推荐算法、加载模块均未改。

## 验证结果

| 检查 | 结果与精确范围 |
|---|---|
| 类型/构建 | `npm run typecheck` PASS；`npm run build` PASS（内含 tsc，保留既有 chunk >500 kB 提示） |
| 定向单测 | 7 文件、69 项 PASS，见 [tests.log](tests.log) |
| 四轴矩阵 | 精确产品提交，4 视口 × 3 类场景 = 12 PASS；每次查看/取消/缩窗 state/journal/IDB/localStorage 相同、send=[]。详见 [visual/report.json](visual/report.json) |
| 完整链 | 精确产品提交、clean HEAD，1366×768、390×844、320×568、390×568 全 PASS；每视口6笔权威交易，共24笔，state/journal/IDB/revision 逐字段相同。详见 [journey/report.json](journey/report.json) |
| 只读返回 | 货架→购买详情→比较→第五槽→管理→返回/关闭/Escape→出售取消：dispatch=0，完整保存不变；原生触屏滚动和 document.activeElement 为第五槽管理按钮均断言 |
| 失败/重试 | BuyOffer 与 UseConsumable 两类 quota 故障均先保持全保存不变，再重试保存同一原命令一次；冷刷新 state/journal/IDB 与最终保存相同 |
| 实际整屏图审 | 父与并行只读审查实际查看 PC/320/390货架、五星、长组合、第五槽管理/返回、购买和使用失败重试；未发现本范围信息/操作遮挡，独审未发现阻断问题。320长组合需滚动，未以 bounds 代替整屏图审 |

矩阵包含普通高推荐 b10（4星）、稀有低推荐 e08（2星）、四种权威版次、d09 缺重触来源/有 b06 搭档（仍“成长待触发”）、既有 b06/a11/a06 五星。均为合法公开受控存档，不冒充自然获得率或五星频率。完整链每端验证 SellJoker、两次 BuyOffer、两次 UseConsumable、BuyBasicTool，并保留 PR180 做牌选择/取消/存入/立即用/返回库存。

本目录只精选整屏 PNG（四端反例/五星/长组合、第五槽/购买失败和保存/工具目标与重试），完整运行分别生成28与104张图。其余图可重跑以下观察器；完整 state/journal/storage 已压缩保存在各目录，sha256.json 列出本次复制文件。报告中的其余 screenshot 名称对应观察器原始输出目录。

```sh
npx vitest run tests/shop-card-value-visual.test.ts tests/shop-card-journey.test.ts tests/shop-layout.test.ts tests/shop-post-purchase-condition.test.ts tests/shop-replacement-cash-risk.test.ts tests/shop-recommendation-evidence.test.ts tests/shop-practice-service.test.ts
CARD_VALUE_OUTPUT=/tmp/shop-four-axis-visual node harness/card-value-visual.mjs
JOURNEY_OUTPUT=/tmp/shop-four-axis-journey node harness/shop-four-axis-journey.mjs
```

## 真实失败与边界

`prior-failures/` 保留初次观察器/产品失败：有搭档夹具误用了非重触来源 a06（改为 b06）；随后390×568确实丢组合（已修）；新链观察器 reload 后读取已清除计数（已改为 reload 前快照）；源码变更时 HMR 使元素 detached（最终 clean HEAD 复跑）；短屏等待离屏 lazy 图片超时（改为只等待与屏幕相交图片，仍核 naturalWidth，并保留失败诊断/截图路径）。没有削弱交易、保存或只读一致性断言。最终 PASS 均在精确 f350047d 取得，不借旧 PASS。

PR145 远端读取 `gh pr view` 被 GraphQL `Forbidden` 拒绝后停止该读取，未绕过；本地无其提交对象，仅依据 DELIVERY_PLAN 已落库的“人物主导、独立版次、短窗固定关闭”记录借鉴，未复制原型或把原型写成已验收。发布与CI另由开发分支实际回执判断，本证据不代签。
