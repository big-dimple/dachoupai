# 选角页按需演示（2026-10-13）

基线：`2ef9180c066308e06d7d09850983ea469aa67fd8`（main/PR153）。本批按父线程最新明确授权开始开发，覆盖 AGENTS 旧“仅文档/暂停编码”调度。本目录是独立 evidence，不修改总交付计划、数学报告/目标实验或 settlement 文件。

## 产品范围

- 六英雄与三路线保留原立绘、姓名、现有宣言、示例牌面、收益和成本。首屏折叠扑克示例，手机腾出空间给已有立绘；“看看技能怎么用”才展开原示例，“收起”返回。
- 示例状态在换英雄、换路线、换模式、返回和重新打开时重置。比较、完整能力详情、路线选择、共同确认以及原保存流程保留。
- 默认仍为普通模式。选角与模式弹窗使用“普通/进阶/严苛/极限”，保留原解锁条件，并说明目标+20%、弃牌2次、4金开局和刷新起价3金等真实差异；不改规则或存档身份。
- 首屏无重看按钮。演示内紧凑单状态按“看变化/看原牌”切换；双状态只在能播放原卡面运动时提供“重播变化”。减少动态时双状态不显示无动作的重播。
- 未新增素材、雷达或玩法系统。运行改动限 `CharacterSelectScene`、`OpeningShowcaseLayout`、`OpeningPlayTable`、`ModeSelectDialog`；测试仅补对应布局边界。

## 构建与核验身份

`build-info.json` 如实记录 E2E 构建：基线 SHA + 四个产品文件和一个测试文件 dirty，不称已发布或洁净构建。`verification.json.sourceHashes` 绑定实际浏览器检查的四个源码文件；截图来自这份本地编译页面。

`tests.log`：6 文件/24 项通过。`typecheck.log`：通过。E2E 构建通过；原大包体积警告保留，未在本批调整构建系统。

浏览器最终 `verification.json` 为 PASS：390×740、1366×768、320×640、390×528、740×390、390×740 减少动态共六个 profile，逐个切换六英雄（36 次英雄查看）、比较选择、三路线（18 次路线查看）、查看前后全 run 与 IndexedDB 记录相同。390/1366 各一笔骰爷顺子普通新局真实保存，从标题原生继续后 state 相同并停在首店；其余 profile 不创建游戏。每个可见重播/切换按钮实际点击，关闭再开回到原牌，换英雄也回默认折叠。`verify.mjs` 使用原浏览器鼠标/触屏与 DOM 控件，观察器只读取 Phaser/IndexedDB；只创建并保存首店入口，不打一整局。运行：`HERO_SELECTION_URL=<本地 E2E preview URL> node docs/production/evidence/hero-selection-disclosure-2026-10-13/verify.mjs`。

## 截图与原始失败

- 对照：`before-390.png` → `after-390.png`、`before-1366.png` → `after-1366.png`；原 baseline 在产品编辑前独立编译，截图在该冻结构建上取得。
- `expanded-*` 为主动展开，另有 320×640、390×528、740×390 与减少动态必要边界图。
- 首轮观察器误读保存对象的 `modeConfig.difficulty`，实际字段是 `difficulty`：原 FAIL JSON/log 保留，修正仅在观察器。
- 第二轮观察器等待重载标题页上的 `runController`，中止后补原生“继续本局”操作：`observer-reload-WAIT.md` 保留。中止不计 PASS。
- 最初普通 Vite dev 不提供 E2E 观察器且 public import 报错；后改用原 `vite build --mode e2e` + preview，不修改产品/构建配置。一次执行环境瞬时断连，随后目录探测成功、继续完成验证。

## 原图及未验边界

本执行环境未查看用户附件。Library ID `libfile_8c07b3c06c7481918b936a6177de5c2d` 已正确解析为 `16230.jpg`，官方 materialization 辅助程序下载被网络代理 `Tunnel connection failed: 403 Forbidden` 阻断；追加权限及审批执行均未得到本地文件。父节点已实际查看原图，并明确承担原图像素级对照，解除这部分功能的前置阻断。以上截图仅证明当前本地页面，不代签用户原图。

物理手机/Android、真人美学/理解、听感、全游戏自然试玩、全部高难度/挑战保存、旧存档实际导入与完整18格均未验，由父继续负责。浏览器受控入口及保存一致性不等于整体体验验收。开发分支不合并、不推 main。
