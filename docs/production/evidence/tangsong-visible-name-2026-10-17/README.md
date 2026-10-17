# 唐宋牌展示名称整改

基线 `c4525b2c2faf77ad2df0b5486e0ea64276856d04`，独立分支 `dev/tangsong-visible-name-20261017`。只改玩家展示和现行文档，未改规则、数值、技术ID、存档协议、英文仓库/包名或美术。原工作区保持干净。

## 审查范围与保留项

本基线递归审查得到源代码26文件89匹配行、文档32文件91匹配行（含“戏班”的历史/否定语境），与此前其他快照的计数不混用。采用明确文件名单的有界替换，实际修改33个 `src/game` 展示文件及16个当前文档（含README）；清单、保留原因与检查结果见 [scope.json](scope.json)。

菜单版本信息、模式页动态“72张/槽位”、工具/物品/版次、72牌模板、六英雄详情与规则顺序、Boss提示/回顾均使用“唐宋牌”。README与PRODUCT更新为既定唐宋题材、苏轼/秦琼/辛弃疾/刘娥/文成公主/花蕊夫人、三男三女；不增加玩法或自动解锁教程/图鉴/历史门。

`r2-jokers.json`、`r2Modes.ts`、`r2Chapter.ts`以及已发布快照参与内容hash，原字节保留。`Brand.playerText`只转换输出字符串；旧身份的卡牌说明/商店兜底、挑战说明与Boss文本经展示投影或详情入口转换，不重写定义、运行状态或checkpoint。`HeroText`中的`Joker`展示词也改为“唐宋牌”，英文技术标识仍保留。

现行计划入口未改。DELIVERY_PLAN的106行后历史、WORK_PACKAGES历史段、DECISIONS、旧美术/体验记录、旧审查中引用的原名称、plan中已关闭任务名称及“不要恢复旧戏班”一类否定语境均保留。`archive/history/evidence`既有文件未改；公共美术/资源清单未改。离线模型资产清单的旧用途元数据不由运行时消费，也保留字节。

**ShopScene协调结果：** 该场景没有直接旧名称字面量；本分支没有编辑ShopScene或GameScene。已有72牌展示和规则兜底经共享文案函数/DetailDialog输出新名，当前无需给shop owner安排场景字符串补丁。

## 检查证据

- 定向15文件304项，分次收口：首轮11文件281项通过；受影响的旧文字/牌名断言3文件18项复核通过；新名称/旧身份测试文件5项最终通过。新测试遍历全部20个保存身份×72牌展示，比较调用前后定义、state、checkpoint、存储分区键与contentHash。未改领域以迎合断言。两项新夹具最初误用了版次枚举和身份参数，已按真实合法入口修正；Q11既有旧牌名预期改为使用已存在的展示名投影。
- `npm run build` 通过（TypeScript + Vite）；保留现有主包大于500kB提示。`git diff --check`通过。
- `src/domain`、`src/content`、`src/application`、`src/platform`、`public`、历史目录、ShopScene、GameScene、package/lockfile相对基线差异为零。既有证据文件差异为零。
- `src/domain/r2PublishedContent.json` SHA-256仍为 `47d2b0b0abcc923dc3495bd9059948bf3b8bf279a3da9f11b91696504421dc5f`；模块自带`published-r2-contract-drift`检查通过，已发布内容hash未变。
- 实际PC Chromium `153.0.8010.12`、1366×768：版本菜单显示“72张唐宋牌”，普通模式显示“72张唐宋牌”及“唐宋牌 5 槽”，无旧名。见 [DOM结果](native.json)、[模式截图](mode-normal.png)、[版本菜单截图](version-menu.png)。这是局部名称检查，不是完整界面/手机/实体设备验收。

实际菜单检查使用全新浏览器context，没有导入玩家存档、创建新局或写入解锁；现有全屏提示在打开菜单时标记自己的偏好，该既有行为如实记录在`native.json`，未修改存储协议。初次冷加载超时与随后过宽的“全部localStorage不得变化”观察断言分别保留为`environment-first-failure.json`和`observer-preference-failure.json`，不是产品缺陷；最终只排除该已知提示偏好后，同路径通过。没有为名称替换跑长局或重复英雄矩阵。

定向命令：

```text
npx vitest run tests/tangsong-player-terms.test.ts tests/tangsong-identity.test.ts tests/hero-text-contract.test.ts tests/joker-player-copy.test.ts tests/joker-plain-copy.test.ts tests/joker-copy-ambiguity.test.ts tests/detail-dialog.test.ts tests/stage-identity.test.ts tests/saved-boss-impact.test.ts tests/c04-mode-notice.test.ts tests/c04-mode-save.test.ts tests/content-schema.test.ts tests/program-dialog.test.ts tests/shop-decision-copy.test.ts tests/player-copy-closeout.test.ts
npx vitest run tests/tangsong-player-terms.test.ts tests/saved-boss-impact.test.ts tests/stage-identity.test.ts tests/c04-mode-notice.test.ts
npx vitest run tests/tangsong-player-terms.test.ts
npm run build
```

原生局部复现：`node docs/production/evidence/tangsong-visible-name-2026-10-17/native-check.mjs`。本分支待整合owner合入，未修改main、查询CI或部署；P08及正式门状态保持原值。
