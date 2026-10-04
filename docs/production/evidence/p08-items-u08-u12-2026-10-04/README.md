# P08 最后五张长期道具手绘图 — review

基线 main `8888e82ede1776e259096bbdfe4eef63fc6f2415`；实现与实际浏览器构建 `625e77a0aaec7b33af93f95cc169f24bdb927bdc`，`modified=false`。只取 source `e11f7f8efaf2114b1ef0b928855230cfdb5c4863` 的 `art/sources/handdrawn-runtime-items-20261004-u08-u12/` 新目录，没有合并其父分支。source 精确 [CI37217979845](https://github.com/big-dimple/dachoupai/actions/runs/37217979845) 已成功；该 SHA 是公共成品交付，不冒充原始生图来源。

消费侧核对全部13文件189000B、10WebP162578B（thumbnail10970/detail151608）；原source1677个旧blob相同。Node内建 verifier、SHA/字节、Pillow全解码、无EXIF/XMP/ICC均PASS，五张615×768实际成品详情图已view。原PNG由父侧查看批准、另存且未进仓库，消费侧不声称读过原PNG。U09靠左的书签保留批准原图，完整contain，没有再裁切或重绘。

沿现有GoodsArt manifest追加 `item-u08`…`item-u12`，domain U08…U12/category item-card，public目录仍为`assets/handdrawn-tools`。runtime总计30WebP464104B，长期道具覆盖 **12/12**，消耗工具仍 **3/39**，其余36工具保留机制示意。Joker72/72覆盖单独保持，不称全美术完成。旧20Goods图301526B逐byte相同；全部src树`1fe09441331f2729cffdebd6c40f2198a51f078b`同基线，已有src/art/sources/handdrawn-p08共567文件逐byte相同，a11两个内容哈希路径保留。只追加注册/成品与必要测试，未改loader/规则/价格/概率/RNG/save/容量/布局/火。

图片使用已有权威道具定义与描述：U08删牌下限16；U09成功Boss后本章最多使用牌型+1；U10首个成功购买减1、最低1、不优惠自身；U11新店道具货位1→2、当前店不补；U12每章首个普通场成功+3、买入不追补。这些规则原实现不变，图片没有替换文案或引入新机制。

42项受影响单测/type/content46公开文本PASS。只复用现有harness的单ID参数运行U08代表路线：合法checkpoint导入、100gold、一个U08货位，不是自然获取或线上部署。真实触摸和DOM按钮验证商店实际卡面、`/items-review/` BASE_URL、无HD预取、精确HD hash/contain、取消完整run不变、一次12金购买/sequence+1/RNG不变、持有同ID详情与HD缓存复用。真实404保留机制图，显式thumbnail与HD重试恢复同ID，frame与完整run不变。旧harness中“U08未注册”的过期预期由本次绘制注册路线接替，未知/category mismatch仍由单测检查。

只做一次e2e构建；30个构建内成品逐byte/SHA/尺寸同public，10条新增路径保留在编译bundle中，MIT notice仍随输出逐byte相同。现有远端必需CI执行production构建；本地不重复production构建或完整冻结。唯一[实际查看的390×740持有详情PNG](390-u08-owned.png)来自625e77a、软件Canvas、DPR1、safeInset0、减少动态，不声称GPU/真机/听感/整体审美或线上验收。

[summary.json](summary.json)保存来源与字节证明；[browser.json](browser.json)保存该单ID的实际详情、request/缓存与404检查。现有handoff/plan和并行72文案、按钮分组、朱砂演出没有修改。独立`feat/p08-items-u08-u12-20261004`供父串行review；精确review CI与当前FF资格在交付报告给出，先不main，P08仍in_progress。

```sh
npm exec -- vitest run tests/goods-art.test.ts tests/goods-art-loading.test.ts tests/detail-art.test.ts tests/detail-dialog.test.ts
npm run verify:content
npm run typecheck
GOODS_ART_REVIEW_ID=U08 node harness/p08-items-u01-u06.mjs
npm run verify:ci -- --scope=docs
```
