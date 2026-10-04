# P08 T06–T11 消耗工具手绘图 — review

基线 main `a6e482be77d82d9702e02f12f89679fff2045740`；实现与实际浏览器构建 `89acce2a9447403f10065eb2715bb6f68d63faa5`，`modified=false`。仅从批准 source `b25f00aaafbd79a475fa045eceea18a5d4df6b29` 提取 `art/sources/handdrawn-runtime-tools-20261004-t06-t11/`，未合并其父分支。source [CI37219676771](https://github.com/big-dimple/dachoupai/actions/runs/37219676771) 成功，2026-10-04 17:20:01 UTC。source SHA 是成品交付身份；原画由父侧逐六图及灰度批准，未进仓库，消费侧不冒充原画审查。

15 个 source 文件 209547 B 逐 byte 同固定 SHA，原 1677 source blob 保持；12 张 WebP 共 178950 B（thumbnail12814/detail166136）。已审的内建 Node verifier、SHA/尺寸、Pillow完整解码及无EXIF/XMP/ICC均PASS，T06成品详情已实际view。既有 GoodsArt manifest 追加六个真实 domain T06…T11/category tool-card，原15条注册和两条 additionalSources 保持。runtime 共42图643054 B，长期道具覆盖 **12/12**，消耗工具 **9/39**，其余30工具仍走现有机制图；72Joker/a11单独保持，不称全美术完成。

旧30图464104 B、既有582个 src/art/sources/handdrawn-p08/license 文件均与基线逐byte相同；src树 `3b7463eb6d9c1a4a5fa6579a559a4dcca9e896b0`，Joker图树 `522c5cd5b17336e40557687489fdb7d1d18330a7`。source新目录树 `045bf4ef4a569ba4b04980808b254fd2e84cf7aa`，a11两条内容哈希路径保留。未改loader、机制、定价、RNG、保存、布局、火或并行工作。

42项受影响单测、typecheck、content49公开文本检查PASS。新增文案断言首次误用工具名“加厚纸”为增强名，1红/41绿；按既有增强定义“热度纸/倍率纸”修正四项goods-art测试后PASS，没有改权威文案或放宽资源检查。T06永久改黑桃且保留其余属性，T07复制到底不洗牌不补抽，T08/T09点数无循环边界，T10/T11替换增强保版次，均由现有定义提供。

只复用现有harness单ID参数运行一次T06：合法checkpoint导入、100gold、一个T06货位、无持有工具；真实触摸/DOM验证商店实际缩略图、BASE_URL、无HD预取、精确HD hash/contain、取消完整run不变、一次4金购买/seq+1/RNG与Joker实例不变、持有同ID高清和缓存复用、未选目标时确认使用禁用、关闭完整run不变。真实404保留实际机制图，显式卡面及高清重试恢复同ID、frame与完整run不变。没有执行工具使用、销毁或其他五个工具UI路线。

唯一[390×740持有T06详情PNG](390-t06-owned.png)已actual view，图和权威文字完整显示，底部按钮原生可用；软件Canvas、DPR1、safeInset0、减少动态。不声称GPU、真机、录屏、线上验证或整体美术验收。一次e2e构建内42个WebP逐byte同public，12条新增路径存在于bundle，MIT notice随构建且逐byte相同；production构建由精确review远端必需CI执行，本地未重复production或完整冻结。

[summary.json](summary.json)保来源、字节、检查及边界；[browser.json](browser.json)保本次实际构建身份。独立`feat/p08-tools-t06-t11-20261004`供父串行review，先不main；当前精确review CI、主线对齐及FF资格在交付报告给出。

```sh
npm exec -- vitest run tests/goods-art.test.ts tests/goods-art-loading.test.ts tests/detail-art.test.ts tests/detail-dialog.test.ts
npm run verify:content
npm run typecheck
GOODS_ART_REVIEW_ID=T06 node harness/p08-items-u01-u06.mjs
npm run verify:ci -- --scope=docs
```
