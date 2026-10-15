# 商店升级基础值对照：有限验收

基线 `4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`；独立分支 `fix/shop-upgrade-base-stats-20261015`；产品与定向观察器提交 `1e4b2e30b9bac889d96defebc5fa6cc269c1707a`，测试时 `HEAD:src` 为 `5cf7ff0bb8da737b49b47d54f87d91109f223a4a`，`src/tests/harness` 工作区干净。后续证据提交仅追加本目录。

确认报价与升级已保存结果共用 `shopPracticeEffect`，从 `R2_BASE_SCORES` 和原等级公式生成基础热度、基础倍率的前后值及增量；倍率用 Rational 精确运算和既有小数格式。保存结果以真实已保存 receipt 的等级生成，不重新报价，也不读取后续变化的等级。例：同花 Lv.1→2 为热度 140→170（+30）、倍率 4→4.5（+0.5）。不计算基础乘积；提示实际手分还取决于计分牌、效果与关卡规则。

## 实际检查

- 已读基线 `AGENTS.md` 当前入口与相关约束；仓库未发现适用的 `.agents/skills` 或额外 `SKILL.md`，工作区 `.agents/.codex` 为空。按本次用户授权覆盖历史排程，串行执行，无子代理、无自然试玩、无 main 合并或部署。环境断连通知到达后，原环境 `pwd/git status/git rev-parse` 仍成功，沿用原环境完成。
- `checks/targeted-tests.txt`：6 文件、59 项通过，覆盖服务报价、合法性、等级上限、折扣费用、共享次数、保存 receipt、恢复接线、路线入口与原工具投资。新增具体断言包含同花 1→2 / 29→30、高牌四分之一倍率、对子、顺子、同花五条和后续 live level 不覆盖历史 receipt。
- `checks/production-plan.txt`：当前计划与引用检查通过。
- `checks/typecheck.json`：`npm run typecheck` exit 0；`checks/build.txt`：生产 Vite 构建 exit 0（271 模块，原大包尺寸提示保留）。
- `journey-report.json`：1366×768、390×844、320×568、390×568、844×300 五组尺寸，每组 group / straight / flush 三路线，共 15 例 PASS。390/320 使用模拟触摸；844×300 为鼠标短横屏。30 个确认/结果观察记录逐行文本与 DOM Range 几何、滚动可达、对话框视口边界、按钮至少 44×44。
- 15 次升级均与原领域 `applyCommand` 的完整 state / journal / IndexedDB checkpoint、revision、local preferences 对照相等。延迟/重复确认不多付、不乐观发布；顺子路径注入存储配额失败，原状态保持，原候选重试只支付/升级一次；取消与 Escape 保持完整保存，返回原简版/全部培养路线和原滚动/焦点；真实刷新保持已用共享次数，冷恢复相等。所有例子的库存、RNG、目标计划均保持。
- `journey-full-state-journal-storage.json.gz` 保留完整原始对象；`journey-report.json` 为去除完整对象后的可读报告，含每次真实命令和完整几何。截图来自报告所列同一次运行，本目录保留五尺寸的同花确认/保存及一张真实失败态；完整原始截图集在 `/tmp/shop-upgrade-base-stats/journey/`。`screenshots.json` 记录入库图的 SHA-256。
- `make-cards-report.json`：原升级/做牌入口在 320×844、390×740、1180×757、1366×900 共 4 例 PASS。原保存配额失败/固定重试、直接延迟成功、双击锁、返回继续做牌、已有 T01 免费使用与随机 T01 原价购存、染色/改牌反向共享次数、真实刷新和冷恢复均按完整 state/journal/IndexedDB 对照。确认/重试保存结果均断言对子基础热度 80→95（+15）、倍率 3.5→4（+0.5）。存储全量见 `make-cards-full-state-journal-storage.json.gz`。此既有观察器另含已存固定日志的通关回放和无尽确认回归，并非新自然试玩。
- 已实际查看五尺寸同花确认/保存图（844×300 中正文按容器滚动，固定操作可见）；原价格仍在确认按钮，利息原说明在报价摘要，窄屏未缩字或缩触点。
- `protected-trees.json`：`src/domain`、`src/application`、`src/content`、`public`、`art` 与指定基线逐树相同。存档格式、数值、RNG、音画资产无变更；产品仅服务文案、保存结果接线和该对话框换行样式。

## 失败和范围

首轮单测 27 过 / 1 失败，原因是新增高牌测试错误期待旧热度 8→18；源码表实际为 20→30，产品输出正确。`checks/initial-test-failure.json` 保留当次工具输出要点；修正测试期待后 59 项通过，未修改领域数值或放宽领域保护。

均为当前身份、通过现有 checkpoint 验证器的受控公开状态与浏览器鼠标/模拟触摸操作；不代表自然发现/自然经营、物理手机、GPU、主观观感或平衡验收。未创建 PR：沿用此前 POST Forbidden 限制，不换路径重试；查询本独立分支没有现存开放 PR，因此没有可更新 PR。开发分支提交/push 与 main 合并分开，main 未动。
