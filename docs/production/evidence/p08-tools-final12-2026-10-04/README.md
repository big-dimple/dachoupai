# P08 最后十二张工具图 review

已发布基线 `58e9d223ee5f29b965532551e71afc6fc6785d51` 为工具27/39、物品12/12；本候选工具39/39，仅交 review，不推 main。运行源码逐树保基线，截图的实现 source 为 `e161c1c509fd105661ee3ce52d491013523d1047`、modified=false。

原样取两个已经终态 success 的固定 source：

- `1cbc3e7cbfe31ba522514c79b866787f2866cbe8`，只取 `art/sources/handdrawn-runtime-tools-20261004-p08-p12-s01-t19`；P08/P09/P10/P12/S01/T19，12 WebP／176,648B，[CI37231115389](https://github.com/big-dimple/dachoupai/actions/runs/37231115389)。
- `6d3596b728008aa35caed454ab46038fdb7ac975`，只取 `art/sources/handdrawn-runtime-tools-20261004-s03-s08`；S03–S08，S04 只接修复完整握柄的 v2，12 WebP／299,638B，[CI37231767753](https://github.com/big-dimple/dachoupai/actions/runs/37231767753)。

两 source 各15文件按 git blob/mode 完全保留。只平拷24张图并追加12个真实 ID 和两条 additionalSources；原39行、6来源及78张旧运行图保持。候选合计102 WebP／1,742,780B，Joker72/72、物品12/12。只读审查完整 RGB 解码、hash/bytes、元数据、整张来源 contain 几何；未安装或执行外部 verifier。固定源 verifier 的额外 EOF 空行照原样保留。

现有四组42相关测试、typecheck、内容 v10/hash、public-art-privacy64文件通过。仅扩展既有 goods harness 的 P12/S04 两个合法样板，真实 acquisitionPool 检查通过后经原生菜单导入。各一次构建及软件 Canvas 原生商店图／详情／取消／一次购买／库存同 ID 详情／缓存／真实404和显式重试通过；全 run、RNG、Joker 保持，确认使用没有点击。两 build 的102张图及 `licenses/browslatro.MIT.txt` 按 hash/bytes 完全核同 public。

- [P12 实际详情](390-p12-owned.png)：固定已发现同花五条 Lv.1→2 预览，确认可用但未使用；[原生报告](browser-p12.json)。
- [S04 实际详情](390-s04-owned.png)：完整 v2 握柄可见，全副牌花色未选择，确认仍禁用；[原生报告](browser-s04.json)。

两图均实际 view，原共享 figure 内完整居中，image/visual 比 figure 四边内缩4px；object-fit contain、object-position 50% 50%，不改 CSS 或布局。来源/保存树/全102文件构建核验见 [完整审计](summary.json)。原型观测为合法导入 fixture，不证明自然获取、真机、GPU 或听感。

D 的 `e8991940ad69b36cbbbdc325352226cecbb096b8` 只取 [原自然流程证据目录](../p08-natural-run-2026-10-04/README.md)，11文件按 blob/mode 完全保留，[CI37231091422](https://github.com/big-dimple/dachoupai/actions/runs/37231091422) success。该证据的实际 runtime 是 `7b78777347dd854f5759870c7934b8c28279889e`：首 Boss1018/800、seq26/journal25、奖励2→10金、唯一 T16 补给及三次恢复检查。T10 自然购入和使用已观察，T16 未使用，未进入第二章；不改其原截图／报告身份，也没有本地重跑。

当前文档区分已发布27/39与候选39/39，记录 D 有界结论；保全部历史 FAIL/NOT_RUN 和旧覆盖数字。P08仍 in_progress，C04 D32暂停、V01/L01人工／多人门禁、A03整包 planned/humanGate 及整体／OnePlus／GPU／听感未验保持。最终精确 review CI 由交接单另报；发布由父串行授权。
