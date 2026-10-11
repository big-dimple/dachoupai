# 少量持牌拖拽提示单行边界返修（2026-10-11）

父dot第8局老幻/顺子1180×757实玩发现、父已看图确认；本代理自行按同尺寸真实浏览器复现，不借此前1366/390的通过结果签1180。输入main `56f5ad5e175ad16b1f89adc544c3332eed6ffb71`，产品与实际有界验收 `ce9ea52554fbb5338bdb8dc313cb9e44a707d2ca`、src树 `acaed586ebf3eb299d364a79270ad842ddba41a1`，无src/test/harness本地改动。最终draft HEAD/精确CI在PR描述登记，父独审串行合并，本代理不合并。

根因：原提示宽度取“已持最后一张”的右边界，1张仅80px、2张172px；同时PC写入手机长按和触发顺序长句。真实1张提示4行、高64px（y40–104），2张2行、高32px（y40–72）；卡名约y67起，实际遮挡。5张和390竖屏原版已单行，不能用这些通过覆盖少量持牌缺口。

最小产品只改ShopScene 5增/3删：PC“拖动换位 · 点牌查看”，触屏“长按拖动换位 · 点牌查看”；提示用完整持牌栏的独立宽度，不随已持张数收窄，位于卡槽顶部前24px。14px字号保持，实测16px高、底缘距卡槽8px；不压卡名、不移动/缩小卡槽或隐藏全部引导。取消提起复位使用同一设备短句，防止重新换回长文。真实输入范围仍只覆盖已持牌，未扩大到空槽；手势/命令/合法时机/保存保持。

| 数量 | 1180×757缺陷前 | 1180×757修复后 | 手机390×844修复后 |
|---|---|---|---|
| 0 | [原空栏](before/1180x757-held-0.png) | [无孤立拖拽空行](after/1180x757-held-0.png) | [空持牌](after/390x844-held-0.png) |
| 1 | [4行压卡名](before/1180x757-held-1.png) | [短句独立单行](after/1180x757-held-1.png) | [触屏引导](after/390x844-held-1.png) |
| 2 | [2行压卡名](before/1180x757-held-2.png) | [短句独立单行](after/1180x757-held-2.png) | [触屏引导](after/390x844-held-2.png) |
| 5 | [原正常](before/1180x757-held-5.png) | [卡名/槽位保持](after/1180x757-held-5.png) | [原长名截断保持](after/390x844-held-5.png) |

必要短屏：[1180×600单牌前](before/1180x600-held-1.png)同有换行遮挡→[后](after/1180x600-held-1.png)单行，5牌也通过；[740×360](after/740x360-held-1.png)原折叠持牌管理分支保持，不签在该分支提供可见栏拖拽。共11个真实浏览器受控布局场景，前后slot坐标/大小逐值相等；主六图、空栏及短屏图已实际查看。

老幻/顺子current basic-suit-choice身份，正常域命令进入第二商店后明确受控导入0/1/2/5持牌；不是dot原存档、不是自然获得，更不是18局重跑。真实Phaser文本高度/实际屏幕bounds与14px字体、卡名/提示不相交已核；阅读/布局前后完整state/journal/IndexedDB相等。两端各一次原生取消提起（PC鼠标+Escape、手机CDP触摸取消）仅检查短引导复位和完整账不变，不重新全套拖拽/买卖演练。

[before摘要](before/report.json)、[完整账](before/full-state-journal-idb.json.gz)绑定main56f5ad5；[after摘要](after/report.json)、[完整账](after/full-state-journal-idb.json.gz)绑定ce9ea52，各自有实际执行观察器SHA256。before的PASS表示观察完成，三个BASELINE_FAIL（1180×757的1/2、1180×600的1）仍保留。17项既有布局回归/type通过；软件截图/geometry不签真人/物理设备/全屏美术或18组合验收。

[原观察器失败](observer-failure-1/report.json)：手机5牌“真正的压轴”原本按现行宽度截断，观察器错按未截断字符串找名字而失败。只改观察器读取卡顶真实Text及其displayedName/bounds，未改名字显示；前两个PC缺陷已在该次真实复现，但最终使用修正观察器完成11行。原FAIL/完整账保留。

[保护树](protected-trees.json)：GameScene/道具选择组件、ShopLayout、OwnedJokerInput/JokerReorder/PointerIntent、PR118建议模块、领域/保存/内容/资产均同main；唯一计划仅当前段登记，历史段字节保持。父最新报告7/18终态，第7老幻成组第7正目标105000、实际84623失败，19clear累计481198、峰单手77985；第8老幻顺子进行中。C2数值Max仍本地实现未发布，本包不改数值、不代签scorer；独立GameScene道具箱修复不触碰。

后续父已合[PR119](https://github.com/big-dimple/dachoupai/pull/119)至main df5d92a；本分支正常merge 7afbc1d保完整GameScene版本，提示/ShopLayout/OwnedJokerInput/JokerReorder/PointerIntent字节同已验ce9ea52，没有重拍或重跑未变11场景。最终综合src树因继承GameScene变化而为36f5b2e08773ece2c38f40e6f276bfd3c8fa48ef，不能冒称综合源树仍为旧acaed586。见[对齐证明](main-alignment.json)；GameScene并非本排版源diff，后续仅type及必要新HEAD CI。df5d92a main CI/线上版本仍待父核。
