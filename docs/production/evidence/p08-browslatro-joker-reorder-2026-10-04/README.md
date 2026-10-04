# P08 持有 Joker 调序的 MIT 代码复用

资源发布顺序对齐：按父协调要求，先等已审六道具＋a11 main 精确发布到 `ce299b8a8ddf5cf399fecb889aa02882d315988c`，再正常合入本 review。合并源码 `8d0efea7b132c310847d0238b531005b616c28ed` 的整个 `src` 树逐树同上一绿 review `9f3db15`，public/assets 与 art/sources 两树逐树同 ce299；仅 handoff/plan 文档冲突，采用主线最新清理后的文字/状态并保留本包 evidence。205 项相关单测、content43公开文本及一次生产构建 PASS；a11-v2 两个内容哈希路径和 U01–U06 的12个路径在编译 bundle 中均保留，dist14个输出逐字节/SHA/尺寸同批准素材，旧 a11 canonical dist 路径不存在，MIT notice 仍逐字节相同。详见 [resource-main-alignment.json](resource-main-alignment.json)。此轮本地未重演未受影响 UI，旧截图/浏览器记录保留原构建身份；只等新 review HEAD 必需精确 CI，主线写入继续由父单独放行。

2026-10-04 主线对齐：原 review `663ace1d9ab87dba2cb4f270146024f91e6541a8` 的精确 CI37213762076 已成功。正常合入已发布排序 main `88b17e23c9aa778c8ac93c9998cd090ba48ab82d`，合并源码 `254863e44e086e170f6a40ec9d33df8d841fa467`；仅 handoff/plan 冲突，双方交接和 evidence 都保留。`sortHand` 与排序 main 逐字一致，Joker 入口与原审 review 一致。305 项受影响测试/type/plan、一次 exact modified=false 构建共享给现有排序与 Joker 两条浏览器路线均 PASS，MIT notice 再核相同；详见 [main-alignment.json](main-alignment.json)。本包仍不写 main，不拉入 Goods 候选，不重复完整本地冻结；新精确 review HEAD CI 在父交付报告给出。下文为原实现检查点历史，保持当时基线与检查范围。

基线 main `3938cee365994910d7d79f62fc91701273f2efe0`；实现与自然浏览器构建 `8b05042b11ee0e69a4675af3b502cea2189c9d69`，构建 `modified=false`。本小包只统一调序结果，没有视觉升级。普通 `feat/p08-browslatro-joker-reorder-20261004` 分支供父协调评审；这里不推进 main。

复用 [oreoshake-s-team/browslatro 的 insertIdAtIndex](https://github.com/oreoshake-s-team/browslatro/blob/eb3d51f1537e527b3a3b7a06976dc971b0a20979/src/scoring/reordering.ts)，固定 SHA `eb3d51f1537e527b3a3b7a06976dc971b0a20979`，仅原文件第 1–14 行。原算法逐字保留；前 8 个原测试只调整 Vitest/import。只读获取源码、测试与许可，没有克隆、安装或执行上游仓库的脚本/框架。

完整 MIT 与 `Copyright (c) 2026 Neil Matatall` 保存在 [runtime notice](../../../../public/licenses/browslatro.MIT.txt)。生产构建的 `dist/licenses/browslatro.MIT.txt` 已实核存在，并与 public 原文逐字节相同；notice SHA-256 为 `22b840bb0d85359cfb13e92b30d2be1b745798b599c9362cb2585e6148fcea38`。项目整体许可未变。

[summary.json](summary.json) 记录来源 blob/hash、236 项受影响测试与限制；[browser.json](browser.json) 保存两组自然输入的 33 项检查和逐次 sequence/实例顺序。最终合法存档测试含非默认 `7/5`、`3/2` 成长系数。首轮新增 fixture 错用不存在的 `a01` 定义导致 3 个测试失败，只修 fixture 后重跑通过，未改运行时、断言或超时。

`reorderJokerIds` 将最终槽 `to` 转成删除前间隙 `to > from ? to + 1 : to`。GameScene 的持有 Joker 详情左右移、拖放和 ShopScene reorder 共用它。非法目标、缺失实例及同槽返回原数组；入口不提交无操作。原命令、expectedSeq、排列校验和先保存后发布保持，未接 `nearestGapIndex`，原槽位命中、355ms 长按、10px 移动取消、空槽/槽外释放保持。

开发验证：

```sh
npm exec -- vitest run tests/browslatro-reordering.test.ts tests/joker-reorder.test.ts tests/r2-run.test.ts tests/r2-shop.test.ts tests/recovery-save.test.ts tests/pointer-release-time.test.ts tests/joker-art-loading.test.ts tests/detail-dialog.test.ts
npm run typecheck
npm run build
cmp public/licenses/browslatro.MIT.txt dist/licenses/browslatro.MIT.txt
node harness/p08-joker-reorder.mjs
npm run verify:ci -- --scope=docs
```

自然路线为 seed `r03-1`、二响、首店买满堂彩、正常首场四牌出牌、下店买借东风。Chromium `151.0.7922.173` 软件 Canvas，390×740 CSS px、DPR1；分别使用鼠标与原生触摸/DOM 触摸。覆盖详情左右移、拖放、同槽/空槽/槽外、长按前移动取消、原生取消，以及商店长按中缩略图更新。每次调序只保存一次且只增加一个 sequence，金币/RNG/完整实例状态不变；reload 恢复完整顺序和 journal。唯一现成自然场景 PNG 已实际查看，留在忽略的 `shots/p08-joker-reorder/`，不冒称美术升级或设备验收。

本地没有重跑无关完整冻结；最终普通 feat HEAD 由现有必需 CI 校验，精确 SHA/CI 结果在父交付报告给出。OnePlus、真 GPU、听感、部署和整体审美验收均 NOT_RUN，P08 仍 in_progress。

合并时只取 GameScene 的 Joker 调序入口与 import，保留并行的点数/花色排序收回选择改动；不要改手牌排序入口。另一包 U01–U06 GoodsArt manifest 与本包不重叠。文档若冲突，保留双方交接、追加本 evidence，P08 状态不关闭。父协调串行合 main；不强推。
