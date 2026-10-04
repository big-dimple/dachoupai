# P08 T13–T18 消耗工具手绘图 — review

基线已发布 main `5d54421cac90e3d516770bba63f5f94904175219`；实现及唯一实际浏览器构建 `af6ac843f01ec137d8500d1c73b9c67800bae03c`，`modified=false`。只从批准 source `a8cab71d56d24aeaef919e6c04c5c22bf0106da3` 提取 `art/sources/handdrawn-runtime-tools-20261004-t13-t18/` 新目录，没有合并其父分支。source [CI37221884857](https://github.com/big-dimple/dachoupai/actions/runs/37221884857) success，2026-10-04 17:52:17 UTC；成品交付SHA不冒充原始生图来源。原图和74px灰度由父侧逐六图批准，原PNG另存、未进仓库，消费侧不声称读过原PNG。

15个source文件257685 B逐byte同固定SHA；source基线7d44的1740旧blob逐对象相同。12WebP227088 B（thumbnail13980/detail213108）已经审后的Node内建verifier、SHA/尺寸、Pillow完整解码及无EXIF/XMP/ICC检查，完整contain/无裁切/无语义改图由source几何合同保持。source manifest SHA256 `6c93741739a10ef676f2ba989988b70e580eecb16b51f6bfa45f867ad5bb7866`。

沿既有GoodsArt manifest追加六个真实ID tool-t13…t18/domainT13…T18/categorytool-card，原21条及三条additionalSources保持。runtime共54WebP870142 B；覆盖长期道具 **12/12**、消耗工具 **15/39**，剩24工具保机制图，72Joker/a11单独保持，不称全美术完成。旧42图643054 B、全部600个src/art/sources/Joker图/license受保护文件逐byte同5d54421；src树`d0c5bcea69f02ac6573e34ca63dbbe3259d2e004`，Joker图树`522c5cd5b17336e40557687489fdb7d1d18330a7`，CSS contain修复/失败摘要/朱砂/人话文案保持。没有任何src改动，也没有开发B工具入口、改loader/规则/RNG/save/价格/布局。

42项受影响单测、typecheck、content52公开文本检查PASS。全部六ID的源bytes/hash、类别、按需HD descriptor和权威文字检查通过。T13/T14/T15仍按既有增强定义，T16仍是首Boss供给且shopWeight0；T17恢复须实际用过弃牌且不超过入场预算；T18不刷新长期道具、不触发付费成长。没有为了展示图片创建非法T16商店货位，harness只开放该批有卡目标的合法商店代表ID，实际仅T13。

仅复用原harness跑一次T13：合法checkpoint导入、100gold、单T13货位、无持有工具，不是自然获取或部署。真实触摸/DOM验证实际商店缩略图与BASE_URL、无HD预取、精确38682 B/HD hash和contain、取消完整run不变、一次4金购买/seq+1/RNG与Joker实例不变、持有同ID高清与缓存、未选目标确认使用禁用、关闭完整run不变。真实404保留实际机制图，显式卡面/高清重试恢复同ID、frame与完整run不变。没有执行工具使用或销毁，也没有跑另五个工具UI。

已实际查看唯一[390×740持有T13详情PNG](390-t13-owned.png)，软件Canvas、DPR1、safeInset0、reduced-motion。实际figure `(111.4375,84.5,167.125,230.78125)`，visual/image `(115.4375,88.5,159.125,222.78125)`：四边内缩4px，水平中心195，contain/position50%50%。商店、重开、持有和404恢复四处真实image/visual均在figure内并居中；沿用已批准CSS修复，没有越框或裁图掩盖。图仅证明本代表路线，不声称真机/GPU/整体审美。

一次e2e构建，54个构建WebP逐byte同public，12条新路径存在编译bundle，MIT notice随输出逐byte相同；production构建由精确review必需远端CI执行，本地未重复production或无关全冻结。[summary.json](summary.json)记录来源/保持/边界，[browser.json](browser.json)保持本次精确构建身份。既有AGENTS/handoff/UX/plan与其他证据未修改，320商店构筑条裁切仍OPEN。独立`feat/p08-tools-t13-t18-20261004`，先不main；精确最终review CI/FF资格在交付报告给出。

```sh
npm exec -- vitest run tests/goods-art.test.ts tests/goods-art-loading.test.ts tests/detail-art.test.ts tests/detail-dialog.test.ts
npm run verify:content
npm run typecheck
GOODS_ART_REVIEW_ID=T13 node harness/p08-items-u01-u06.mjs
npm run verify:ci -- --scope=docs
```
