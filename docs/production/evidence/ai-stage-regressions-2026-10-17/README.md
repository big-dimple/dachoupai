# AI 与节目录回归修复

输入：`7d7921e76ca794a14e715e3eac3b4d66143862ff`。开发分支 `dev/ai-stage-regressions-20261017`；正确性产品提交 `ffab8132`（完整 SHA 见 Git）。只普通 commit/push；不改 main、不强推、不部署、不触发或读取 CI。

本包 requirementId：AI/STAGE-REGRESSION-20261017。依赖既有 SavedRun、SkipStage、IntermissionResult 合同；允许 GameScene、ShopScene、BlindSelectPresentation、对应定向测试、harness 与本证据目录。数值、领域命令、hash、内容身份、存档、AudioEngine、DetailDialog、卡图与出分打击感不在范围。新增底栏布局由后续独立提交承担。

## 复现与结果

主证据是 `baseline-current-identity/report.json` 与 `after/report.json`。基线由精确 Git archive 的 src、配置和英雄文案 JSON 单独运行，资源与依赖只读复用。当前报告记录三个产品源文件 SHA256，已逐个核对与正确性提交一致。浏览器为 Chromium 151.0.7922.173、软件 Canvas；导入经 checkpoint 验证的当前真实新局身份，所有动作经真实鼠标/触摸入口，不调用私有游戏操作伪装点击。

| 检查 | 原版 | 修复 |
| --- | --- | --- |
| 390px AI 候选与真实出牌 | `invalid-route-growth-snapshot`，AI unsupported | ready；点 AI 仅选牌，不改完整 state/journal/storage；随后真实 PlayHand 的完整 state 与 journal 精确等于领域同命令 |
| 稍后开战 / Escape | 重复按钮；关闭后回 character-select | 单个稍后按钮，停留同局 stage-ready；重开不发命令，明确入场后才 EnterStage |
| 暖场 / 正场跳场 | 已保存 stage-cleared，但 `identity.isBoss` 读取 undefined，activeScenes=[] | 裸 IntermissionResult，读取已保存 stage 的 index/heat/handsLeft/goldEarned；正常结算，完整 state/journal 与领域命令相等 |
| 跳场保存失败、双击、重试 | 按钮一直 disabled，无本弹窗重试 | 注入首次真实 store.commit quota 失败；保存前 state/journal/storage 均不变，原候选重试；两次 commit 尝试、仅一条 SkipStage 日志，无重复奖励 |
| 商店关闭与 Boss 不可跳场 | PASS | 两次开关不改 state/journal/storage，Boss 无跳场按钮 |

`unit-final.txt`：3 文件 28 项通过；覆盖重复 handler、保存失败同候选重试、异常后可点、取消后迟到回调、旧 controller 保存完成不转场。`typecheck.txt` 及 `build.txt` 通过；构建保留既有大 chunk 提示。

GameScene/ShopScene 的复数定义入口恢复原始领域 defs；单卡展示函数在输出边界继续用新名字，未修改领域内容或校验算法。关闭目录后使用同 SceneView 的待开战页，原局保留且入口明确。三联折页、Boss 警告和不可跳场规则保持。

## 保留的 FAIL 与限制

`baseline-current-identity` 保留真实产品 FAIL。`after-initial` 保留新增待开战页在 create 阶段过早检查 active、阻止首次弹窗的 FAIL，最终已修复；`observer-failures` 保留初始测试观察器与夹具失败。旧 `baseline` 使用旧 v11 身份，其 AI PASS 不适用于本批新局，不能覆盖当前身份的 FAIL。最初 `before` 运行期间源码变化，报告只留作观察器记录，不作为基线签收。

未验证：物理手机、Firefox/WebKit、GPU/FPS、听感、完整自然长局与整体平衡；本轮不改音频/卡图、不跑全套测试或 CI。浏览器来源检查是开发 E2E 源服务，生产 bundle 只完成类型与构建检查。未宣称真人或全平台验收。
