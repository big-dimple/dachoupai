# 父审后玩家文案补正（2026-10-13）

父已实际查看旧 `chain-390-normal-hero.png` 并认可 ×2 / 累计49.69→99.38分开；纠正的是“本源因子”等面向玩家的内部术语。本轮产品提交 `d7d92c0aca154a145a51c5d4c989d1aa62e8f495`，src tree `dacf7e02aa46e8b29d82d242a1289900ac5e7d04`。

产品仅改 `ScoreSourceProcess.ts` 两处文案：乘法标题为“本次倍率”，加倍率/加热度标题为“本次加成”，来源短句中的“本源”也改为“本次倍率”。具体英雄、技能、卡名、实际 ×/+ 数字、累计行、布局、动画、评分/事件次序、保存不变。内部组件名/变量不改。旧证据按原 SHA 保留，不用旧截图代签本次新标题。

[六例真实 UI 报告](plain-copy/report.json)、[完整初终保存](plain-copy/states.json.gz)、[四例与旧候选完整 initial/final state/journal/storage 相等](plain-copy/comparison.json)、[34项相关测试/typecheck](plain-copy/validation.json)。每例单手、合法受控保存导入与原命令/冷刷新相等，没有整局试玩或删用户存档。

| 标题 | PC1366×768 | 手机390×844 | 真实读数 |
|---|---|---|---|
| 本次倍率：阿默助攻 | [原图](plain-copy/chain-1366-normal-hero.png) | [原图](plain-copy/chain-390-normal-hero.png) | ×2；累计≈49.69→≈99.38 |
| 本次加成：二响交棒 | [原图](plain-copy/addition-1366-normal-hero.png) | [原图](plain-copy/addition-390-normal-hero.png) | +7倍率；累计16.5→23.5 |
| 本次倍率：独家戏 | [原图](plain-copy/billion-1366-normal-multiply.png) | [原图](plain-copy/billion-390-normal-multiply.png) | ×1000000；累计16.5→16500000 |

手机阿默、二响、亿分和PC二响已 actual view，标题、技能/卡名与累计值均可读，脸未遮、数字不撞说明。没有重做布局或新增规则。其余维持原任务有限软件验证边界，父整体观感、设备/听感未代签。

新 cap4 候选尚未整合。本组件继续按实际单次 route-factor 的 before/after 算当前因子，不写死上限或双族叠乘；未来数值候选集成仍须复验，不能借本轮文案测试签其体验。
