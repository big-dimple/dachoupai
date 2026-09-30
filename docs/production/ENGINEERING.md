# 工程与可恢复执行合同

目标是让一个小型 H5 项目可验证、可恢复、可维护，不是搭建通用游戏引擎。以下为稳定目标结构；各项落地状态和验证限制只在 plan/handoff 中维护。

## 1. 保留与边界

保留 Phaser 3.90.0、TypeScript、Vite、Vitest、Playwright、npm lockfile。版本升级单独验证，不与计分重写混在同一提交。现有 SeededRng 和普通牌型算法可在金样例保护下迁移；Joker 数据和图片可以转换，不需要全部删除重建。

建议结构（文件名可在工作包内细化，边界不可放弃）：

```
src/domain/       # cards, evaluate, score, effects, commands, reducer, invariants
src/content/      # schema + versioned definitions/balance/localized strings
src/application/  # RunController, persistence, command journal, asset registry
src/game/         # Phaser scenes/views/layout/input; no scoring business logic
src/audio/        # one app-scoped bus, settings, lifecycle
src/platform/     # browser storage, visibility, filesystem export adapters
src/testing/      # fixtures and public-state bot policies, no production cheats
```

不是必须一次搬完所有目录。R01 先抽入口、旧行为对齐；R02 才切 r2；后续每一步都保持可运行。禁止同一算法复制在 src、tests、harness 各处。Phaser 对象不得进入存档。

## 2. 唯一领域入口

接口形态：

```
applyCommand(state: RunState, command: Command):
  | { ok: true; state: RunState; events: DomainEvent[]; receipt: Receipt }
  | { ok: false; code: ErrorCode; state: RunState }
```

输入不可变；失败返回原状态，RNG/金币/次数也不变。成功 command 带 runId、commandId、expectedSeq；同 commandId 的重试幂等，过期序号拒绝。不要通过 DOM 禁用按钮代替验证。

首版命令：StartRun、EnterStage、PlayHand、DiscardHand、ReorderHand、ReorderJokers、SetWager、BuyOffer、SellJoker、RerollShop、UseConsumable、DestroyConsumable、SelectProgram、SkipStage、LeaveShop、ContinueEndless、AbandonRun。排序/选择押注也必须受阶段限制；选牌高亮、悬浮等纯 UI 状态不必每次写存档。

控制器在单一串行队列处理命令，一次成功响应才接下一条；快速双击不会多扣钱或多打一手。UI 读取 ViewModel，不能直接 set run.gold 或 stageHeat。演出速度、声音开关不会提交任何影响得分的命令。

## 3. 完整状态和不变量

RunState 至少包含：schemaVersion、rulesVersion、contentVersion/hash、runId、seed、commandSeq、difficulty、characterId、chapter/stage、phase、deckInstances、drawPile/handOrder/playedPile/discardPile/destroyedIds、阶段热度/目标/出牌/弃牌余量、手次/前次牌型、Joker 实例及顺序/成长状态、消耗品/长期道具、金币、节目单、Boss 参数、shop offers/consumed/rerollCount、RNG 各流状态、最后命令回执、最后得分 trace。

阶段使用可辨识联合类型，初版：setup/shop/stage-ready/await-input/stage-cleared/run-won/run-lost。`presenting` 只属于表现层，不是会改变规则可用资源的持久阶段。胜败状态包含不可变原因/最终统计，不由一个 Scene 是否活跃来推断。

不变量：所有实例 ID 唯一；每个活动实例恰好在一个牌区；手牌不超过上限，必要的牌生成效果也受明确上限；整数资源非负；槽位受限；货架 offerId 唯一；不合法阶段没有资源消费；每场奖励唯一；状态可 JSON 往返；规则版本与内容 hash 匹配。每个命令的测试均运行不变量检查。

## 4. RNG 与重放

固定并版本化现有算法，提供 snapshot/restore，不用“重建 seed 后猜消耗了多少次”恢复。随机域至少 deck、shop、rule、reward 四类；cosmetic 单独在表现层，禁止读取规则域。

相同 seed、rulesVersion、contentHash、行动日志应得到完全相同结果；不是宣称同 seed 不管玩家操作都相同。稳定字符串派生算法需有黄金向量；不要使用语言平台不稳定的 hash 或数组对象迭代顺序。

一次命令在临时状态中消费随机，验证失败不提交。预览使用只读确定项和公开概率；需要试算时克隆 RNG，不推进真实流，也不返回未来隐藏货架/牌堆。机器人从公开视图选择合法命令，再用真实 reducer 结算，不能带着真实下一张牌或未来骰子结果做选择。

回放文件包括版本、初始 seed/角色、配置 hash、命令列表和关键 stateHash。状态 hash 使用规范化排序/字段编码，排除时间、UI 坐标、特效随机和个人设备信息。脱敏调试导出不得包含账号 token 或任意用户文件。

## 5. 计分与效果接口

ScoreTrace 每条事件至少：eventId、rootId、phase、sourceType、sourceInstanceId、targetCardId 可选、operation、value（有理数）、before/after H/M、原因键、可见条件、retriggerDepth。sourceDefinitionId 与实例 ID 分开。UI 将文案/声音映射到事件，不从浮动文本反向解析分数。

EffectContext 是该时点明确的只读快照；效果返回有限的 typed operations/state patches，而不是传一个任意可执行字符串。数据由 schema 验证，定义 ID/条件/效果/时点要穷尽检查；未知种类启动时报内容错误，不能静默当无效果。

TriggerEngine 可保留为 UI 通知总线或重命名；不要把当前四种 emit 误称为规则引擎。真正规则分派由 reducer/score 明确调用，各时点顺序由 RULES 固定。

数字建议使用小型 BigInt 有理数服务：分子分母为整数，分母始终正，每次运算约分；最终 floor 一次，阶段分数为 BigInt。存档存十进制字符串，禁止裸 BigInt JSON。UI 科学记数法只格式化，不回写领域值。输入配置值只接受有限、范围合法的整数或分数。

用 Python Fraction 或另一独立算术实现作测试 oracle，仅验证数值运算，不另写一套游戏逻辑。至少覆盖 10^1000、连续分数乘法、零/负输入拒绝、保存往返。对数字长度和 512 事件上限作保护；保护触发应返回可恢复诊断，不能变成 0 分、Infinity 或篡改玩家状态。性能不达标时评估成熟数字库及替代表示，先 ADR、再基准，不私自改成浮点近似。

## 6. 原子存档与中断

IndexedDB 为主存储，保存 complete checkpoint + 有界命令日志；同一事务写新状态和对应回执。保留上一份有效 checkpoint，用 schema 校验、版本和内容 hash 检测损坏。校验和是完整性检测，不是反作弊保证。

先在临时状态完成领域命令，持久化成功后公布可交互的新状态；保存失败时给明确“未保存”反馈、保留内存结果并暂停进一步不可逆操作，允许重试或导出，不默默重算扣款。刷新时从最后完整 checkpoint 恢复，不能把半条动画当半次结算。

回到页面可选择播放最后一手 trace 或直接显示结果；两种选择状态完全一致。提供继续/新局确认/导出/导入，导入是纯数据 schema 校验，禁止 eval 和任意资源 URL。旧版实验数据不兼容时先保留原数据与可下载备份，再解释版本限制，不能静默清空。

多标签页使用单写者租约或版本 compare-and-swap；第二标签只读并提示接管，不能两页各自覆写较新的局。visibilitychange 尝试刷已完成状态，不能把 unload 回调作为唯一保存时机。离线恢复必须在已缓存版本实际测试；Service Worker 的资源版本与存档规则版本不能混用。

## 7. 演出生命周期

EffectQueue 对一次 trace 创建独立 generation/AbortSignal，drain 返回该代共享的完成 Promise；并发调用不能立即假完成。clear/cancel 必须让正在等待的 tween/timer Promise settle，并且不消费下一代的效果。

Scene shutdown/destroy：取消本代、停止并清理 tween/timer、解除监听、释放视图引用。所有异步继续点检查 generation；playSelected 入口锁在 finally 恢复或被新 scene 接管。旧回调绝不读取新局的 selectedIds 或操作新局 hand。

动画期间可以快进、静音或退出；退出确认后保存已确定结果，再取消演出。后台切回和布局 resize 不重新打出一次牌。连接音频与游戏事件的订阅有对应 unsubscribe，不用全局匿名监听永久累加。

## 8. 资源、构建、依赖与部署

资产分 source/runtime/preview 三种用途，由注册表白名单生成发布文件；public 内存在不等于全部应该发布/预加载。先保留旧目录并建立映射，确认无引用后再迁移；禁止破坏用户已放好的素材。资源地址统一经过 BASE_URL，测试根路径和 /dachoupai/ 子路径。

注册表包含 id、kind、source、runtimeVariants、尺寸/字节/hash、裁切安全区、用途、技术验证、视觉批准、来源/使用许可证据。首屏只加载小头像和必要牌桌/字体；长音轨、高清立绘、源 GLB 按需或不发布。

npm ci + lockfile；直接 import 的工具包声明为直接 devDependency，固定 Blender/Python/Pillow 工具链信息；本机路径用环境变量/配置，不写死每个开发者都拥有 D 盘。核心 runtime 不依赖 Blender/CLI。新鲜克隆应能仅安装 Node 运行游戏测试。

CI 至少拆领域/内容验证、构建、浏览器 E2E、资源检查、文档图校验。检查模式只读；输出放临时 artifact，不能重写 manifest 然后假装工作区无变更。禁止 audit fix --force；安全告警按 advisory、依赖链、生产/开发可达性及修复测试记录处理。

发布使用 PR + 被测试构建哈希，不用本机脚本直接 main 作为唯一门禁。部署 manifest 包含 build/content/rules 版本、资源哈希与支持环境；预发完整一局验证后发布，回退时保持存档兼容或明确恢复策略。没有部署目的地与授权不能假装已上线，更不自动开付费云资源。

## 9. 渐进披露与机械检查

plan.json 是唯一任务状态；每条依赖必须存在且无环，只有一项当前工程任务。被阻塞的人工门禁可以保留 blocked，选择不依赖它的另一包继续；不能将其改 done 解锁依赖。每包完成必须有证据路径及实际被测 SHA。

check-production-plan 只证明协议结构：ID/依赖/路径/当前状态等，**不证明游戏质量、文件内容真实性或真人签收**。其反例测试必须能捕获重复 ID、环、完成依赖缺失、缺证据和双当前任务。

工程 Agent 的完成报告不写“预计能过”。要写实际跑了什么、没跑什么、为何没跑、谁负责后续验证。新会话不得把未运行项目从上一次 handoff 复制成通过。
