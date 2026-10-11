# 关卡身份与 Boss 预告：有限修复候选

输入实时 main：`b29ae51855e894db5878d6e70f77475f6a491ba6`，经 `git fetch origin main` 核实。独立分支 `review/stage-identity-preview-20261011`；不合 main、不部署、不覆盖 DELIVERY_PLAN。最新用户补额度/开发授权覆盖 AGENTS 中额度恢复前的暂停；已读当前统一执行计划、原 RULES/CONTENT/UX/ENGINEERING/ART 的对应合同。执行环境 `/workspace/.agents` 为空，仓库没有 `.agents/skills`。18 组合实玩由父协调 dot，本批不承担。

## 先提交的范围与文件

预告、实际入场和过关身份用同一份保存参数显示 Boss 名、花色文字和符号；缩短首层规则，完整规则按需展开；明确普通点数归零的作用对象，不把它画成整牌失效。文件：新增 `src/game/StageIdentity.ts`、`tests/stage-identity.test.ts`、`harness/stage-identity.mjs`；修改 `GameScene.ts`、`IntermissionScene.ts`、`stageNotice.ts`，`style.css` 只追加 `stage-identity-entry` 独立命名空间；本证据目录为唯一新增文档。

`src/domain`、`src/content`、`src/application`、`src/audio`、`public`、`art`、ConsumableDialog、ToolChangePreview、SavedToolResult 和 DELIVERY_PLAN 均与输入 main 完全相同。没有新规则、概率、Boss 难度、英雄、倍率时序、成长数值、图片、音频或额外等待。没有新增世界观或重画。PC 和手机使用同一纸墨/青蓝/朱红/象牙语言。

## 已证实与未证实分开

**已证实的显示缺口：** `IntermissionScene` 原来在固定 100px 手机面板里先放场次/次数补满，再放完整多行 Boss 规则，随后以 `maxLines` 截断。`before/390-B03-preview.png` 实际像素完全没有 Boss 名/花色/限制；PC 也裁掉应对行，只靠很小的花色符号，没有花色文字。原入场使用通用大详情窗，规则少却占满屏幕。新预告将 Boss 身份置于标题，首层仅保留目标和实际限制；Boss 面板按需要保留 132px，短横不再把来源摘要挤到限制之前。实际入场改为按内容高度的简短纸卡，详情仍可展开；过关大标题明确已完成的 Boss。普通场空选区显示当前章节/场次，继续选牌后仍显示原实际牌型。

**用户报告的黑桃→梅花参数变化仍未证实根因，不能写成已修：** 用户明确同局未重开；另第6章红桃相符的报告保留，不推成全部预告错误。源码 `makeChapter` 只在 StartRun、章初 OpenShop、ContinueEndless 抽 Boss；第一章正场结算后的 OpenShop（stageIndex=2）不抽。EnterStage 复制已锁定 `run.boss` 为 `stage.boss`，活动场不一致会被 invariant 拒绝，保存恢复也核对。预告读取当前章已锁定计划，实际入场读取保存的场快照。四花色定向链和梅花原生流程均一致。候选统一文字/符号并把场内及已完成身份绑定场快照，但未改任何抽取逻辑，不能用可读性改善冒充已复现参数变化。

需要父/dot 保留原发生局的导出检查点及 seed、runId、contentVersion/contentHash、页面构建 SHA，分别在正场结算、OpenShop、EnterStage 后比对完整 Boss 参数和 rule RNG；当前没有这些原局数据，不能猜测重开、字体或部署为已证实原因。

## 原实玩图片读取边界

Library IDs：`libfile_9da2bed805cc819184caa61607885698`、`libfile_0d7dc40657dc8191a28682427b5fed5e`。使用当前 Library 材料化流程和本环境私有 helper 尝试，含网络权限重试，两图均 `download failed`；后备 read 只返回图像引用和 OCR，没有可见像素。**本执行者没有看过这两张原图，不使用 OCR 判定花色。** 本目录 before/flow/entry 图全部来自本执行环境实际浏览器截图，已逐个检查下述代表像素。

## 冻结验证与证据身份

- 原基线 `b29ae518...`：`before/report.json`，modified=false，PC1366×768、手机390×844，两 Boss 各一条。原生选择/Play → 正场结算预告 → 原生 OpenShop/LeaveShop → 实际 Boss EnterStage → 原生 Play → Boss 结算 → 页面刷新/继续。每笔完整 state 与 canonical applyCommand 相等，入场 rule RNG 未变；全程无切局。
- 行为及预告冻结 `75eb5e9adfe6d829924eaea208123c8381bafcdb`：`flow/report.json`，modified=false，同四条流程。`state-comparison.json` 逐字段核四对完整最终 state 与 main 相等，含 trace、成长、收益、Boss、RNG 和回执。真实保存后刷新/继续与原状态相等。不是只比较分数。
- 后续仅入场 CSS 修正及证据观察器：`entry/report.json` 冻结 `801308d01356c58a72c56f61e0b59af272a8ce8a`，modified=false。四个原生受控入场，PC1366/手机390，另同状态320×740、740×360实际缩窗；开启完整限制/关闭开始出牌前后完整 state 保持。实测首层卡片高度和按钮完整在视口，真实 hover 文字对比度5.24–6.77（≥4.5）。行为/预告冻结之后 GameScene、IntermissionScene、StageIdentity、stageNotice、tests 没有变化；flow 里的旧满高入场图保原SHA，不作为最终样式图。
- `targeted.txt`：4 文件143项通过；`typecheck.txt`：通过。含四花色预告→店→入场→保存恢复、历史场快照/新章计划分离、普通场负例、B02只抑制普通点数。后续仅样式/验证脚本，不重复全库；整包最终精确 HEAD 的标准 CI 由 draft PR 回执核验。
- B02 真实选择 `flow/390-B02-selected.png`：仅第4/5所出张标“点数0”，两张纸面保持 `0xf3eadb`；实际事件/计分集合在完整 final trace 中，明确的大丑牌效果仍按原规则，不改分数。

受控前提明确：固定种子 `stage-identity-fixed`、当前阿默/成组身份；先正常跳暖场，再在合法检查点设公开 B03梅花或B02计划和已发现牌型Lv30，以有限出牌可靠到达结算。保原目标600/800、预算、随机抽牌、交易与计分；**这是合法受控成熟状态，不是自然获得、平衡、普通首章难度或真人实玩结论。** 不扫种子、不跑八章、不借高分签 Boss 公平性；四花色测试亦是显式受控计划，不冒称自然概率。

代表整屏图：

| 场景 | 原版 | 改后/最终 |
|---|---|---|
| PC预告 | [1366 before](before/1366-B03-preview.png) | [1366 flow](flow/1366-B03-preview.png) |
| 手机预告 | [390 before](before/390-B03-preview.png) | [390 flow](flow/390-B03-preview.png) |
| PC入场 | [1366 before](before/1366-B03-entry.png) | [1366 final entry](entry/1366-B03-entry.png) |
| 手机入场 | [390 before](before/390-B03-entry.png) | [390 final entry](entry/390-B03-entry.png) |
| 手机压轴过关 | [390 before](before/390-B03-result.png) | [390 flow](flow/390-B03-result.png) |
| 窄竖/短横 | — | [320预告](flow/320-B03-preview.png)、[740预告](flow/740-B03-preview.png)、[320入场](entry/320-B03-entry.png)、[740入场](entry/740-B03-entry.png) |

上述对照图及PC/390 B02入场与手机B02选牌实际像素已查看。1180×757仅预告缩窗证据，不冒称整链；320/740仅同态关键边界，不冒称新自然局、全部Boss/人物/安全区。系统Chromium151、DPR1、reduced-motion、软件Canvas；未跑长录屏、GPU帧率或18局。

## 原FAIL留存与回退

`FAIL/` 保留第一版大面积空白入场、手机主动作悬停淡底白字实际FAIL和首轮脚本/类型错误。大空白由通用对话框固定高度及原生modal的auto拉伸引起，局部改成fit-content。主动作淡底白字是通用button:hover覆盖的真实问题，只在本批命名空间保持朱红主动作；不改道具样式。首轮harness用了不存在的action/enter-stage，改用真实action/start-stage；首类型检查指出对可空nextStage作余数运算，补显式guard。悬停观察器最初硬认一个终态RGB，在既有过渡尚在途中时错误拒绝可读朱红；原FAIL日志保留，修为真实对比度≥4.5和记录hover状态，没有调低可读性门槛。

回退仅本批展示、样式和测试/脚本；规则、旧/新身份及保存格式没有变化，不迁移、不删用户进度。最终文档HEAD只新增本目录，父统一整合主计划。

未验：原报告参数变化根因、两张原图像素、实际用户设备/触控/GPU/声音、真人理解/吸引力、所有16Boss的完整画面、六英雄/三路线18格及八章/无尽自然旅程。保持draft，不部署，不宣称总体验收。

复现：`node harness/stage-identity.mjs`；入场样式修正有界检查：`STAGE_IDENTITY_ENTRY_ONLY=1 STAGE_IDENTITY_OUTPUT=/tmp/stage-entry node harness/stage-identity.mjs`。完整流程/入场分别保原报告HEAD，不用新文档SHA冒充原截图来源。文件哈希见 `sha256.json`。
