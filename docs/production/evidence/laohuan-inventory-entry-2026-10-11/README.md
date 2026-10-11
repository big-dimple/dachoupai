# 老幻候选完成后道具箱入口恢复（独立候选）

## 当前父审补正：稳定只读/暂停仍可查看

父审发现旧候选c538686把原ready写入门槛绑到了整个箱入口：虽然只读/暂停零写入，却让查看也不可达。这是额外退化；下方旧测试和after.json保留，仅能证明旧版“点不开且零写入”，**不代表查看体验通过**。

补正产品 `136d049d81232f7476dc3944317d5f4a27cd30aa`，GameScene.ts SHA256 `7681fdb33f359eb8bcdc4891434c91f7b657907b39d1074bcde2f33947ee3bdd`。统一inventoryInspectable只放行稳定idle/paused/readonly、await-input；playing/presentation/saving、老幻候选、骰爷待兑现赌约、替换候选和会话working仍锁入口。打开showConsumables单独传原ready，禁用使用与销毁；回调重查inventoryInspectable、原ready及预览seq，再走原command/dispatch的租约和序号保护。没有扩大候选中查看，没有改领域、效果、存档或计分预览。

PC1366×768鼠标和390×740触屏各实际走普通三弃→戏法弃→候选确认→开箱：两端稳定paused与readonly都从**正常道具箱入口**打开T17，使用/销毁按钮禁用，实际点禁用位置不提交，两轮查看/取消state-journal-storage完整不变。paused原保存仅一个挂起/失败尝试；原菜单retry只保存并消费T17一次。readonly另外保留租约丢失前已打开的可用确认，真实点击后写入尝试为0。候选中箱仍不打开，演出/保存中禁用。四张新的只读/暂停详情PNG已实际查看。

`after-view-repair.json`为本次真实完整快照、入口状态及详情文本；测试时HEAD=c538686、已改源码SHA如上，随后提交136d049的src/tests/harness与被测文件逐字节相同，证据提交仅更新本目录。`after.json`/旧PNG及原FAIL均未覆盖。80项/7文件（原75＋新5）及typecheck通过；新测试分开查看与写入，并检查旧确认的租约/序号/阶段保护。未做新增自然旅程、18局、实机/GPU/听感或全工具矩阵。

当前产品落点：GameScene.ts329–330、358–368、458、928、969、984。与main6d2d954比较，仅这些入口块改变；domain/content/application/platform/audio/public及唯一DELIVERY_PLAN保持。C2计分预览区域未碰。未合并/部署。

当前短同步段：老幻候选后道具箱修复已补正父审发现的只读/暂停查看退化，稳定paused/readonly能从正常入口查看T17且不可用，候选/演出/不稳定提交仍锁入口；双端真实查看/取消/重复及过期确认零写入，80定向/type通过。候选同分支push、父独审串行集成；原PR POST/精确CI GET的gh请求层Forbidden已停止，未重试/换路，PR未创建、远端CI未核。未签dot18局/真人/实机/上线；未写DELIVERY_PLAN。

## 历史c538686候选身份与结果（有查看退化，保留原记录）

基线 main `6d2d954d1b41cddf632dfdce86fb75374e8f7e54`；与冻结版 `368397eeaf2aa518dd88feedaa12b947cb50cd0e` 的完整 GameScene.ts 无差异。基线该文件 SHA256 为 `9fcdbf04865c29734545214b73b8d3768976b94ed867165e3eb0876d29972aae`。产品提交 `5807d2d56f39da8b04d400b9e91c2945098b7b13`，该文件 SHA256 为 `05d344c880d4a061486d093a3e0bc8a388e9f96c7bcee4c7925a16759c570674`。

## 旧候选真实复现与修复

独立浏览器上下文，严格校验通过的受控第7正场/老幻成组/U02四弃预算/T17库存；库存与进度是工程夹具，不是 dot 存档，不是自然经营旅程。真实鼠标/触屏先普通弃三次，再戏法弃一次，真实候选收起/恢复、选牌及连续两次确认。每次状态都与原 `applyCommand` 完整结果比较。

| 观察时点 | 基线入口 enabled | 修复后入口 enabled | 完整保存结果 |
|---|---|---|---|
| await-input，弃牌4，T17无效果 | true | true | 可开箱查看；取消零写入 |
| pending-refill，弃牌0，ready=true | false | false | 收起/恢复不改变固定候选或存档 |
| ChooseRefill完成，await-input，弃牌0，ready=true | **false** | **true** | 只保存一次ChooseRefill；基线点箱两次无反应；修复后能打开T17的0→1确认页 |
| 工具保存中 | 未另测 | false | 受控挂起commit，确认已禁用 |
| quota失败、paused | 未另测 | false | 原state/journal/storage完整不变；重复点箱零额外提交 |
| 原菜单重试成功 | 未另测 | true | 原T17候选仅保存一次；弃牌0→1，库存1→0；空箱仍可查看 |
| 租约drop、readonly | 未另测 | false | 预先打开的T17确认及两次点箱均不写state/journal/storage |

PC1366×768鼠标与390×740原生触屏各一条，上表两端均通过。软件Chromium Canvas、DPR1、减少动态；真实绘制和DOM点击，不是发射Phaser内部点击事件。`before.json` / `after.json` 保存逐阶段完整 state/journal/storage、实际入口属性及断言结果。前后两端PNG已实际查看。最终原生测试时HEAD为产品提交5807d2d；证据提交只增加本目录，不改变产品源码。

仅 GameScene.ts 入口状态：create中订阅会话变化并在shutdown注销；新增统一inventoryReady/updateInventoryControl；入口点击重查；updateControls恢复状态并删除两个分支式禁用。保持原ready的保存、租约、替换候选、忙碌门禁，加await-input/演出/老幻候选/骰爷赌约限制。弃牌次数和单件工具适用性不决定能否查看道具箱。没有修改ChooseRefill、计分预览、domain/content/application/platform、工具效果、弃牌或存档格式。

## 旧候选定向验证与原FAIL

- `npm run typecheck` 通过。
- 既有6文件75项通过：laohuan-refill、tool-inventory-entry、scene-view-refresh、recovery-save、recovery-queue、touye-wager。
- 新增 `tests/game-inventory-control.test.ts` 4项通过：同一控件经保存/演出恢复，候选失败暂停，租约/保存/替换门禁，骰爷待兑现赌约保持禁用。
- `INVENTORY_REFILL_OUTPUT=/tmp/... node harness/tool-inventory-refill.mjs` 双端通过；`--before`用于旧产品复现，预期旧入口残留禁用。该回归脚本没有加入全局CI或修改既有smoke。
- 源码范围检查及 `git diff --check` 通过；领域、内容、application/platform、音频、所有public、唯一DELIVERY_PLAN与基线逐树相同。

`observer-failures.json` 保留原观测器FAIL与原报告SHA256：夹具首轮B03缺花色、商店回执绑定不合法均被原校验拒绝，未削校验；首次原生额外resize观察合并掉了resize而超时，该额外断言移除，核心故障已在当轮实际复现；两次工具页操作被既有自动打开的保存/只读菜单遮挡，改为真实点击菜单关闭后继续原断言，没有force点击或移除modal门禁。产品源码未因这些观测器失败改动。

## 旧候选边界与已失效短同步段

未跑dot18组合或其存档、自然第七场旅程、实机/GPU/听感、非减少动态全旅程、多浏览器专项、全历史身份矩阵；骰爷仅定向单测，其他工具不做全套效果复验。最终HEAD标准CI与draft交付另在PR/最终报告核，不借本地绿灯签main或上线。无合并、无线上写入。GameScene改动落点为329–330、358–361、451、921、962、977；C2计分预览传参区域未改。

供唯一DELIVERY_PLAN负责人同步：老幻道具箱独立入口修复已在main6d2d954受控双端复现并修复，候选/忙碌/保存/租约/只读门禁保持；79项定向及type通过，双端完整保存与原命令相等、取消/重复/失败/只读零额外写入。候选draft与最终精确CI由本交付核，父独审串行合并；不签dot18局、真人、实机或上线。未写DELIVERY_PLAN。
