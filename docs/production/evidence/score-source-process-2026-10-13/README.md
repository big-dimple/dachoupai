# 计分过程实际来源最小接线（Draft PR155）

最新补正：[父审后玩家文案补正](PLAIN_COPY_REVIEW.md)。本次标题已改“本次倍率 / 本次加成”；下方首次候选证据按各自 SHA 保留。

基线为开工时最新 main `2ef9180c066308e06d7d09850983ea469aa67fd8`。产品提交 `da7c51eafddc570eb0db780a1f8bbb62cb3bf4fb`，`src` tree `3598be1e60d4bb90b75a9a122ec9b8c02b4965f5`；后续提交只补测试替身、局部验证脚本与本 evidence，运行时代码相同。独立开发分支 `review/score-source-process-2026-10-13`、[Draft PR155](https://github.com/big-dimple/dachoupai/pull/155)，不合并、不 push main、不强推。唯一执行计划主文件未改，由父线程整合本记录。

用户本次明确开工/并行授权覆盖仓库旧“暂停/串行”入口。`.agents/skills` 未提供本地文件；未新增/重做资产。环境断连通知收到后，本环境实际命令、提交、push、截图仍正常完成，没有转移执行器或绕过拒绝。

## 修改边界与真实缺口

- 新独立 `src/game/ScoreSourceProcess.ts` 只消费当前 trace 中真实事件的精确 `before/after`：增量由差值计算，乘法因子由实际比值计算，不把累计倍率归给卡或英雄。
- 原 `GameScene.showScoreEvent` 接线及 `fitScoreReadouts` 来源行排字，旧位置/14px字体/现有动画时槽保持。来源行保 +倍率/×本源因子/版次/实际额外重触次数；重触牌显示实际执行 `1/2`、`2/2`，不把每张牌上的多个 enhancement/joker hook 计成多次重触。
- 像素检查发现既有 `HeroClimax` 在助攻 ×2 时大字显示累计 ×≈99.38，在独家戏 ×1000000 时大字显示累计 ×16500000。追加已报告的窄范围 `HeroClimax.ts` 计分来源读数修复：大字本源、原说明行累计，来源读数按原说明行的高度预算适配，避免大数覆盖说明。`finalScore` 分支、最终得分落幕布局和动画时间未改。
- scorer/target/domain/application/platform/content、计分公式/次序、新成长规则、旧档身份/迁移、存储格式、历史详情/回看入口、选角、资产/音路未修改；零新输入层、色块、动画、等待或声音。没有写死族增长、指数或倍率上限；新数值主线继续提供实际事件即可。

共享文件潜在冲突已提前报告：`GameScene.ts` 只触及来源行 fit 和 `showScoreEvent`，`HeroClimax.ts` 只触及计分事件读数/来源数字尺寸；父整合结算恢复时请保留 `award` / `mountScoreLanding` / `finalScore` 布局独占边界。

## 局部原生验证与像素审查

每个浏览器上下文为空白隔离环境，导入合法受控 checkpoint，经当前真实鼠标/触摸选牌、推荐助攻、PlayHand/PlayAssistedHand，一手后结束。输入以公开手牌/持有/成长/金币作为受控条件，所有初终 checkpoint 都经生产校验。未自然获取这些持牌/成长，未打一整局或修改用户存档。

| 档位 | 真实保存分数 | viewport / 动态 | 实际来源证据 |
|---|---:|---|---|
| 普通 | 27 | 1366×768、390×844 / 普通 | `7♣ · 热度+7`，累计倍率 ×1，原牌/头像可见 |
| 连锁 | 34,681 | 1366×768、390×844 / 普通；390×844 / 低动态 | 版次 ×1.5、额外重触+1次、执行1/2、倍率+2、助攻本源×2；累计≈49.69→≈99.38单列 |
| 亿分受控大数 | 12,886,500,000 | 1366×768、390×844 / 普通；320×740 / 低动态 | 独家戏本源×1000000、累计16.5→16500000；源读数单行，不撞说明 |

[最终八例逐事件与 bounds](final/report.json)、[完整初终 state/journal/storage](final/states.json.gz)、[main 六例完整保存逐项相等](final/baseline-comparison.json)、[main 原生报告](baseline/report.json)保留真实输入/输出。六个普通模式 cases 的完整 initial/final state/journal/storage 与 main 同输入深比较相等；两低动态 cases 与原领域命令相等。各例实际冷刷新再次核完整保存相等。没有删档/迁移/回灌，金额与奖励由原领域一次保存。

代表原尺寸截图：

- 普通：[PC](final/ordinary-1366-normal-heat.png)、[手机](final/ordinary-390-normal-heat.png)。
- 连锁：[手机版次](final/chain-390-normal-edition.png)、[重触次数](final/chain-390-normal-repeat.png)、[加倍率](final/chain-390-normal-add.png)、[本源助攻](final/chain-390-normal-hero.png)、[PC本源助攻](final/chain-1366-normal-hero.png)。
- 亿分：[PC](final/billion-1366-normal-multiply.png)、[手机](final/billion-390-normal-multiply.png)、[320低动态](final/billion-320-reduce-multiply.png)。
- 同输入基线：[错误归因的手机助攻累计大字](baseline/chain-390-normal-hero.png)、[手机独家累计大字](baseline/billion-390-normal-multiply.png)。

已实际 view 普通/连锁/亿分双端、手机版次/加倍率/重触/本源英雄及320/390低动态的这些代表像素。来源行避开原牌面、头像、操作按钮；特写人物脸与实际卡面完整，来源数值不遮说明。新增组件仅修改既有文字，未新增 Graphics/Rectangle/背景色/interactive handler；源行在 windup/impact/rest 不闪背景色块。以上是本云 Chromium 软件 Canvas 局部检查，不能以 bounds、截图数量或测试数量签整体美学/物理设备/听感。

## 中断和设置

[真实菜单/设置/resize 报告](interactions/report.json)及完整[保存](interactions/states.json.gz)：PC来源特写中真实菜单快进、390计分中菜单勾选减少动态并选4×、390亿分计分中缩至320×740，均清理来源标识且完整最终保存/冷恢复与原命令相等。源行逐 phase 采样无 backgroundColor / input handler。中途设置改变沿既有 callback 结束当前播放，因此不把该例说成后续完整低动态播放；完整低动态仍由 final 两例证明。

## 原 FAIL 与检查边界

- [旧 assist 按钮 selector 超时](failures/old-assist-selector-FAIL.json)及[原图](failures/old-assist-selector-FAIL.png)：未进入计分，harness 改为当前 `selection/assist-recommend`，不改产品入口。
- [未冻结首轮的低动态超时](failures/unfrozen-pre-cut-in-run-FAIL.json)及[原图](failures/unfrozen-pre-cut-in-run-FAIL.png)保留；当轮同时改来源特写，记录不能作为最终冻结验证。冻结 `da7c51ea` 全八例低动态通过，不把未冻结首轮误写为通过或已确认产品根因。
- 新增测试替身 initially strict typecheck 有 `repeat` 可空错误，修为断言已存在 repeat 后通过；后扩英雄读数时，两旧期待把累计值当来源读数的测试失败，按新语义更新为本源 ×1.5、累计单列，原实际规则不变。
- [首精确 CI38425124030](https://github.com/big-dimple/dachoupai/actions/runs/38425124030)绑定 `da7c51ea`：domain 有 `hero-ability-cue` 押输场景替身缺 scoreLabels 的真实 FAIL。补齐现有场景测试的标签/文字/scoreBoard，继续验证 ×0.85、精确记录、音路和清理；不修改运行时代码规避检查。CI 原失败日志另存。最终新精确 HEAD CI 由 PR 查询，不借旧 green 或其他线程 CI 代签。

仅局部可审查候选：父完整节奏/像素独审、数值主线整合后的受影响体验、自然获得率、整体美学、正式域名/实体手机触控/听感仍 OPEN。没有执行整局试玩。

复现命令：`node harness/score-source-process.mjs`；基线设置 `SCORE_SOURCE_ROOT=/workspace/score-source-baseline SCORE_SOURCE_BASELINE=1`；局部交互设置 `SCORE_SOURCE_INTERACTION=1 SCORE_SOURCE_PORT=5587`。最终定向命令/输出见 validation.log；产品 source tree 保持上述 SHA。
