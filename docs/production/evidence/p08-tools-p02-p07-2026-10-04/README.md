# P08 P02–P07 星球工具图及当前交付文档校准 — review

当前已发布 main `1c103de6957eb3fd4c17d94d8f68c5a4d5466ca9` 仍为消耗工具21/39。本候选只追加P02–P07六图，review覆盖27/39、长期道具12/12、Joker72/72；没有发布，不称已上线或全部美术完成。成功代表构建 `926d2cee57e2f6d838e25363b693f28ed9461535`，modified=false，builtAt `2026-10-04T20:08:22.593Z`。

固定source `c139d70f5411c4991a73ac9ed50fc8fc13f478a7` 的[source CI37229985877](https://github.com/big-dimple/dachoupai/actions/runs/37229985877) 首次success、20:00:25UTC后才提取唯一 `art/sources/handdrawn-runtime-tools-20261004-p02-p07/` 新目录；不合source父分支、不运行外部脚本或安装。15files213292B逐byte同源，1927旧blob的mode/type/内容保持；12WebP181436B，逐SHA/尺寸/Pillow完整RGB解码及无EXIF/XMP/ICC、整个源矩形/居中/最近整数像素缩放/无stretch声明检查PASS。source manifest SHA256 `6690aff014c9298c1f558b6b8669341ecbf2e7e356858bc186dde800af38fc5e`。父逐六原图及P01/P11灰度近邻审通过；原PNG另存，消费侧没有收到原PNG。

P04真实原图1060×1484，完整contain为thumbnail107×150/detail514×720，外画布仍128×160及615×768；其余源1122×1402。没有假称4:5、裁切、拉伸、重构或重新生图。新增六Goods ID与第6条additionalSources；旧33条/五源/66图1085058B保留，候选共78图1266494B。全部src、320商店卡条、十四牌计数、工具包、CSScontain、失败摘要、朱砂、手牌/调序、严格五动作smoke、CI/依赖和license逐对象同main1c，没有机制或loader改动。

冻结前按父指令正常无冲突合入纯文档 `073561b3c6530fc442c873d73581d4c3949f7a8b`，合并SHA4270cb1，其[docsCI37230464126](https://github.com/big-dimple/dachoupai/actions/runs/37230464126)独立success。AGENTS/handoff/WORK_PACKAGES/plan和状态审计、六工具7证据文件逐对象同073，不改原98b证据身份或字节。工具包/749已发布、A03铜钱已接、main21/39、六工具fixture完成/D自然仍进行、C04/多人门禁和历史FAIL/NOT_RUN按该校准保留。本候选27不冒充当前main27；由父发布后统一更新。

42项相关单测/4files、typecheck、content58公开文本扫描PASS，内容hash `json-fnv-v1:24efe7a905216d85` 保持。六个ID源bytes/hash、类别、按需高清descriptor及固定已发现牌型、等级+1/上限30/只影响未来出牌的权威文案检查通过。没有重做六工具使用或自然局。

首轮P04样板错误保留于[first-failure.json](first-failure.json)，实际构建4270cb1 modified=false：未发现三条的P04不在真实获取池，原购买保护正确禁用确认，native tap超时；没有弱化保护、重试旧job或修改产品。仅harness改为合法导入已发现三条Lv1，并在造货位前检查真实r2ToolAcquisitionPool资格，修正后只重跑P04；首轮未保存截图。两构建src fingerprint相同。

成功路线为390×740 DPR1软件Canvas/reduced-motion/safeInset0的validator-approved checkpoint导入，100金、单合法P04货位、固定三条Lv1、无持有工具，不是自然获取。真实触摸/DOM检查缩略图/BASE_URL/无HD预取、26232B精确HD hash/contain/center、取消完整run不变；一次4金购买seq+1、RNG/Joker实例不变；持有同instanceId高清缓存和原Lv1→2预览，确认使用按原规则可用但没有点击，关闭完整run不变。真实404保机制图，显式卡面/高清重试恢复同ID、frame及完整run；未使用或销毁。

唯一[390×740持有P04详情PNG](390-p04-owned.png)已实际查看，完整画面在卡框内居中。实际figure `(111.4375,84.5,167.125,230.78125)`，visual/image `(115.4375,88.5,159.125,222.78125)`，四边内缩4px、水平中心195；商店、重开、持有和404恢复均通过真实image/visual bounds，contain/position50%50%。没有改CSS或裁图掩盖。

成功e2e构建78图逐byte同public，12新路径在bundle，browslatro MIT notice随dist逐byte相同。本地共两e2e构建（首次样板FAIL＋一次有依据的纠正），不重复production、无关全冻结或别的五工具UI；精确最终review CI负责production和原必须检查。[summary.json](summary.json)与[browser.json](browser.json)保固定来源、原失败和成功构建身份。整体审美/真机/GPU/听感未验；独立`feat/p08-tools-p02-p07-20261004`，本轮不main。
