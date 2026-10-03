# 开发入口

先读本文件、[handoff](docs/development-handoff.md)、[plan](docs/production/plan.json) 的 `currentTask`；再读该任务 `reads` 和 `WORK_PACKAGES.md` 对应 `## ID`。历史只按需查，不自动续做旧TODO。

用户最新明确决定 > 已采用DECISIONS > 对应合同 > 实现/测试。不得为了迁就实现修改机制或金样。当前P08依D44最新用户批准转为全游戏手绘墨线／纸色风格主线；第一批共享主题与响应布局独占src/共享清单。新图由独立art分支提供，未收到SHA前不读受限旧原图。C04.3/4与新玩法仍暂停。提交/合并/push遵循本轮授权；**D44本轮先本地实现／实际画面检查／本地commit，暂不push，由父协调发布**，不改既有部署链路。

## 开工与边界

- 检查工作树、分支、HEAD和远端变化；保留已有脏工作，不reset、不强推、不夹带他人改动。
- 报告任务ID、已完成依赖、本次范围、排除项与拟跑检查。一次一个有边界工作包。
- 保留npm/TypeScript/Phaser H5。规则不依赖DOM、动画、时钟或音频；UI/机器人/回放共用命令入口。演出只展示已确定结果，不消耗规则RNG。
- 保留计分金样、非法命令无副作用、RNG快照恢复、幂等、先保存后发布、旧存档原文、取消演出不重复结算。不得把Infinity/NaN作为分数，或省略joker参数时默认装全部牌。
- 素材走BASE_URL/注册表，母版不进首屏；不盲加3D、后端、联网、ECS或付费功能。改核心玩法/存档/整体美术先更新DECISIONS与相关合同。

## 按变更检查

| 变更 | 开发验证 |
| --- | --- |
| 纯文档/计划 | plan检查；改检查器时加self-test |
| 规则/存档 | 先失败用例或金样，再受影响单测；保留上述不变量 |
| UI/素材/加载 | 受影响单测、typecheck/build、对应真实浏览器操作与实际截图检查 |
| package/CI/发布脚本 | `tests/ci-gates.test.mjs`及相关入口检查 |
| 最终发布候选 | 冻结源码后运行`verify:ci`聚合；仅在变更或失败原因改变时重跑受影响项 |

完整命令见package.json。`verify:smoke`检查构建产物的确认/取消、购买、排序、弃牌、出牌与刷新恢复。长E2E、资产、平衡和多引擎按变化选择，不每轮重复全部检查。纯文档改动不重跑游戏全套；未改变源码或环境的同一瓶颈，保留失败证据，不反复空跑。

记录实际浏览器、renderer、GPU/软件渲染、CSS视口/DPR、输入及限制。“完整Chromium”不等于硬件加速。Canvas功能、软件WebGL诊断、真机流畅度分别报告，不能互相替代；不得靠提高超时、删除断言或修改机制洗绿。

## 收尾

- `git diff --check`，走查diff，只提交评审过的文件；排除构建、日志、诊断、凭据及未授权内容。结果要求不依赖缺失的外部skill。
- 同时交付实现、实际检查、证据、plan状态、handoff。没跑写NOT_RUN；截图/机器通过不等于真人、素材或设备验收。未达标保留IN_PROGRESS/BLOCKED。
- `release:checked`只运行只读`verify:ci`，`--plan`只列NOT_RUN计划；永不自动commit/push/merge。
