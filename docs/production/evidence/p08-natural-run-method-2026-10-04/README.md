# P08：既有自然局的方法与留存范围

这是旧证据 [`e8991940ad69b36cbbbdc325352226cecbb096b8`](https://github.com/big-dimple/dachoupai/commit/e8991940ad69b36cbbbdc325352226cecbb096b8) 的纯方法补充。实测运行源码仍是 `7b78777347dd854f5759870c7934b8c28279889e`，终局仍是首 Boss B01 的 1018/800、金币 10、seq 26、journal 25。本轮只读取、哈希和复制已经保留的文件，没有启动浏览器、调用操作驱动、重放领域命令、重跑游戏、进入后续章节或重新截图。旧证据原文件没有覆盖。

**三组恢复对应两个已提交状态。** 第一组为 seq 2、金币 0 的购买后状态；第二、第三组均为 seq 9、金币 7，分别在真实 impact 演出中和已结算结果页刷新。它们验证同一已提交得分/奖励在两个 UI 时点的恢复，不能写成三次独立结算。原 [recoveries.json](../p08-natural-run-2026-10-04/recoveries.json) 三点完整 checkpoint/meta/current/previous 比较不变。

以下是原文件的归档副本，`.txt` 后缀用于阅读，不是新编的复现场景或运行指令。只做 [source-manifest.json](source-manifest.json) 列出的私人工作目录、临时目录、端口和进程元数据替换；清单分别列原始字节与公开副本的 SHA256、字节数、修改时间和替换次数。哈希在本轮归档时计算，不冒称运行当时已经签名的不可变记录。

| 留存文件 | 实际用途及版本边界 |
| --- | --- |
| [observe.mjs](scripts/observe.mjs.txt) | 建立隔离 Playwright context、原生新局与商店/选牌/整理/弃出牌/三次恢复、读取 checkpoint 和 readonly IndexedDB、保存 snapshot/report。当前磁盘文件已经含运行中的观察器修正；开局时不可变逐字节版本没有保留。绑定脚本后来读取其中的 `action` 函数，不能声称整个当前文件就是开局执行版。 |
| [native-extension.mjs](scripts/native-extension.mjs.txt) | 同一浏览器上的原生购买、工具控件、后续出牌、暂停及最终截图。归档的是最终留下的版本；每次自适应修改的较早版本没有单独版本存档。 |
| [p08-natural-bind.mjs](scripts/p08-natural-bind.mjs.txt) | 已执行的 Node debugger 绑定脚本：在原 Node 观察器闭包中暴露原 `page` 和读/操作函数，并将 `action` 观察器纠正为 `PlayHand/DiscardHand`。`Debugger.evaluateOnCallFrame` 改的是 Node 观察器函数与 report 元数据，不是浏览器领域 state。 |
| [p08-native-call.mjs](scripts/p08-native-call.mjs.txt) | 已使用的 Node inspector 调用器。`Runtime.evaluate` 发生在 Node 观察进程，加载当时 request/extension 后调用同一 `page` 的原生动作；没有调用浏览器的领域命令提交 API。没有独立记录每次调用时的扩展版本哈希或完整请求序列。 |
| [ui.mjs](scripts/ui.mjs.txt) | 冻结源码已有 helper：读 Phaser 实际 hit geometry，再 `page.touchscreen.tap`；DOM 控件用 `.tap()` / `selectOption()`。没有直接触发场景方法替代点击。此副本与原 helper 字节相同。 |
| [curate-evidence.mjs](scripts/curate-evidence.mjs.txt) | **终局之后**实际执行过的证据整理和离线重放脚本。它通过 Vite SSR 加载原 `applyCommand`，在 Node 本地副本上重放实际 journal，并验证末条命令 duplicate；没有引用运行中的 browser/page，也没有写回实际 run/IndexedDB。 |
| [report.json](logs/report.json) | 原始保留的最终 report，逐字节复制；包括 87 个实际观察记录、选择/offer/工具等原始 extra、saved trace、frame/phase 节点、三处恢复与观察器诊断。它是观察报告，不是完整 PTY 或 CDP 调用审计。 |
| [last-native-request.json](logs/last-native-request.json) | 原 request 文件最终只剩 `{"op":"finalize"}`，逐字节复制。此前值被覆写，没有把步骤摘要反推成伪造的请求日志。 |
| [blocked-state.json](logs/blocked-state.json) | 首次正常弃牌已保存后，Node 断言错误期待 `Discard` 而实际为 `DiscardHand` 的原始快照，逐字节复制。不是产品出牌失败或新造故障。 |

原始 report 的 SHA256 为 `96b8922fa0b6529b0c7b7f38831cddec8d0e8432758bd1b063739286d768936a`。87 个原始 snapshot 和既有暂停文件、诊断图的定位/原始字节哈希见 [local-records-manifest.json](local-records-manifest.json)。完整原始 snapshot 仍在本地留存；本补充不再重复发布全部快照或新增图片。终局后的实际重放结果仍是旧证据 [journal-verification.json](../p08-natural-run-2026-10-04/journal-verification.json)，本轮没有重新生成它。

动作范围核实：

- 新局由 `chooseCharacter` → 标题/角色/确认的实际触控开始，初始记录为普通 D0、6 金和标准牌组。三张初始 Joker 详情/取消、b05 购买、商店开场与过关继续、0/1/5 选牌、整理、候选 ghost/换组/撤销、弃牌与出牌走 `tapUI`。T10/a06 购买确认、工具目标及使用、Boss 弹窗、速度设置走实际 DOM 控件或 `tapUI`。
- `page.evaluate` 读取游戏对象、DOM 与 readonly IndexedDB；另将观测记录写入 `window.__nf` 并挂 `postrender` listener。这些是观察数据和监听器，不是改游戏规则、RNG、牌、金币或存档。绑定/调用脚本使用了 **Node inspector 执行**，不能笼统写成完全没有 evaluate 或调试器执行。
- 保留的浏览器动作脚本没有注钱、注牌、存档导入、RNG 写入或直接 `applyCommand`/`transactR2` 调用。已记录的局内步骤没有切换种子或重开，完整实际 journal 从 seq 2 到 26。
- **有直接领域调用：仅在终局后的离线核验脚本中。** 它从已保存 seq 1 状态出发，重放 25 条实际命令，结果与已保存终局 state/RNG 相同；它没有证明 seq 1 之前全部外部行为，也不是用领域调用推进浏览器游戏。
- 观察器曾在正常弃牌已保存后因错误命令名断言停止；原 Node 驱动后来绑定修正函数，浏览器和局继续保留。原始 JS/首图的 Buffer 哈希错误后来归一为原始字节哈希；旧 report 保留 `hashMaintenance`。这些是观察/指纹维护，当前磁盘副本不能替代缺失的历史版本或请求日志。

**不可独立证明的范围必须保留。** 没有留存 seed 选定之前的独立审计，因此不能以脚本只固定 `p08-batch3-natural` 就证明不存在任何预先 seed 筛选；现有 report 从浏览器开局起覆盖该 seed，没有 seed 搜索日志。完整 PTY stdin/stdout、完整 Node/CDP 请求日志、启动时观察器原始版本、每次较早扩展与覆写 request 值也没有导出。原驱动进程现在已经结束，无法从其内存补取旧 compiled script；没有重建这些缺失记录。离线核验的独立 stdout 日志没有保存，只有当时工具回显和已存在的结果 JSON。

此补充提供可读方法、原始报告与明确的来源边界；它不能把自报日志提升为第三方不可变审计，也不扩大硬件 GPU、真实 PC、OnePlus、听感、录屏/FPS、reduced-motion 或 P08 整体验收范围。
