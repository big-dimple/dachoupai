# P08 T01–T05 / P01 消耗工具手绘图 — review

父已实际图审T04并独立确认原review `9cae12ba6198965b333c9f8c4935c190f5d388ee` 的精确CI成功；随后按授权正常合入已发布main `749a85ee7d38f9edeac6f46ed67f092b6f7fdfe8`，无冲突，合并源码 `afde5974f5a0105a5377e910aa102657ae39052f`。全部src（含320商店卡条与十四牌计数修复）、严格五动作smoke、CI及主线AGENTS/handoff/UX/plan逐对象同新main；图源、66图1085058 B、Goods测试/harness及原T04 PNG/browser/summary逐对象同9cae。仅GoodsArt4项hash检查、typecheck和plan门禁复验，不重拍、不重建、不跑本地全矩阵；新head由精确review CI检查，本轮先不main。[a-main-alignment.json](a-main-alignment.json)记录对齐。原图仍是4589a888 modified=false，不能作为本次主线修复的新浏览器证据；下文保留原图审查身份与历史320 OPEN时点，当前已包含父批准的749a85e修复，真设备仍待验。

基线已发布 main `f10d2d0a6c1f80b199bfeef7272f60b5c962a7ca`；实现及唯一浏览器构建 `4589a888d0801c3d9dfe875a92fbad834891d262`，`modified=false`，builtAt `2026-10-04T19:23:50.644Z`。只从批准 source `0df5c1afac5e07e439c0cb164a06896bba9608ab` 提取 `art/sources/handdrawn-runtime-tools-20261004-t01-t05-p01/` 唯一新目录，没有合并其父分支。[source CI37227424742](https://github.com/big-dimple/dachoupai/actions/runs/37227424742) 首次 success，2026-10-04 19:18:37 UTC 后才注册。

15 source 文件247024 B逐byte同固定SHA，其基线7b787的1844旧blob全部相同；12 WebP214916 B（thumbnail15684/detail199232），源blob逐张SHA/尺寸及Pillow完整RGB解码、无EXIF/XMP/ICC检查通过，source/public逐byte同源。manifest SHA256 `092ec0b2bf83d2c566609598195e2abcfb09a1318966ac316d37f0afcae84207`。源portable verifier已只读审查，没有运行外部脚本或安装。消费侧自行检查整个源矩形、中心位置、最近整数像素缩放及无stretch声明，没有改图。父已实际批准六原图与74px灰度；原PNG另存，消费侧不声称看过原PNG。

T02只使用批准的`tool-t02-v2-original.png`。T04真实原图1073×1466，T05为1060×1484，不能称4:5；完整比例分别contain为thumbnail110×150/detail527×720、thumbnail107×150/detail514×720，外画布仍128×160和615×768。没有裁切、拉伸、重构或再次生成。

只追加tool-t01…t05、tool-p01六个Goods ID和第5条additionalSources。旧27条/四源/54图870142 B保持；review共66图1085058 B，长期道具12/12、消耗工具21/39（余18保机制图）、72 Joker/a11保持，不称全部美术完成或已上线。全部src、工具包、两处CSS contain修复、只读失败摘要、朱砂、手牌/调序、严格五动作smoke、CI配置、依赖、license及既有AGENTS/handoff/UX/plan逐对象同f10。没有机制或loader改动。

42项受影响单测/4files、typecheck、content55公开文本检查PASS，内容hash仍为`json-fnv-v1:24efe7a905216d85`。六个ID的源bytes/hash、类别、按需高清descriptor和权威文字通过；T01须选择已发现牌型、T02主动删牌须满足原下限/当前合法行动、T03/04/05保点数/增强/版次、P01固定已发现高牌，这些定义与文案没有改动。harness仅增加本批合法商店/扑克目标代表ID T02–T05，实际只跑T04，不套用T01/P01的牌型目标。

一次390×740 DPR1软件Canvas/reduced-motion/safeInset0原生路线：validator批准checkpoint导入100金、单T04货位、无持有工具，不是自然获取。真实触摸/DOM验证实际缩略图及BASE_URL、无HD预取、28316 B精确HD hash、contain/center；取消完整run不变，一次4金购买seq+1、RNG/Joker实例不变；持有同instanceId/同ID高清与缓存、未选目标确认使用禁用、关闭完整run不变。真实404保机制图，显式卡面/高清重试恢复同ID、frame和完整run；未执行使用或销毁。

唯一[390×740持有T04详情PNG](390-t04-owned.png)已实际查看：画面完整在卡框内居中。实际figure `(111.4375,84.5,167.125,230.78125)`，visual/image `(115.4375,88.5,159.125,222.78125)`，四边内缩4px、水平中心195；商店、重开、持有和404恢复均通过真实image/visual bounds，object-fit contain/position50%50%。没有改CSS或用裁图掩盖。

一次e2e构建66图逐byte同public，12新路径在bundle，browslatro MIT notice随dist逐byte相同。本地未重复production或无关全冻结；最终精确review CI负责production及原必须检查。[summary.json](summary.json)记录固定来源与边界，[browser.json](browser.json)保持本次精确构建身份。320商店构筑条裁切和真设备仍OPEN；独立`feat/p08-tools-t01-t05-p01-20261004`，先不main，由父协调发布。

```sh
npm exec -- vitest run tests/goods-art.test.ts tests/goods-art-loading.test.ts tests/detail-art.test.ts tests/detail-dialog.test.ts
npm run typecheck
npm run verify:content
GOODS_ART_REVIEW_ID=T04 node harness/p08-items-u01-u06.mjs
npm run verify:ci -- --scope=docs
```
