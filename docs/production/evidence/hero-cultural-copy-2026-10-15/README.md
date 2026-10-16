# 英雄文化包装 · Windows 分支交付

基础 main `c009bc401d337fda7af052baa1c7f34798e97154`；分支 `codex/hero-cultural-copy-20261015`。沿用工作包日期 2026-10-15；实际检查跨至 2026-10-16 UTC。独立 worktree，不合 main；统一整合负责人收口。

## 本轮产品

| 人物 | 技能名 | 文化依据 |
| --- | --- | --- |
| 苏轼 | 余音袅袅 | 《前赤壁赋》箫声相和；宣言为摘句 |
| 秦琼 | 跃马冲阵 | 《旧唐书》卷68“跃马负枪而进”；宣言为游戏演绎 |
| 辛弃疾 | 众里寻他 | 《青玉案·元夕》寻觅；宣言为摘句，主题仍保留挑灯看剑 |
| 刘娥 | 垂帘听政 | 《宋史》卷242垂帘决事；宣言为游戏演绎 |
| 文成公主 | 和亲 | 故宫文成公主条目；不冒用金城公主“和同一家” |
| 花蕊夫人 | 赏赐 | 传世宫词散钱/买花钱；作者归属有争议，不钉死作者 |

权威文本与来源见 [HERO_TEXT_SPEC](../../HERO_TEXT_SPEC_20261015.md) / [机器映射](../../HERO_TEXT_SPEC_20261015.json)。规则展开改用操作白话。选择路线的确认显示“开始对局”；模式、无尽与结果导航去除登台/巡演等旧主题措辞。只替换显示字面，不改布局几何；GameScene 仅一处“无尽巡演→无尽对局”，CharacterSelectScene 仅确认/状态文案。旧牌名、Boss 名、技术 ID、reasonKey、历史 trace 与规则身份保留。

## 实测

- [最终定向测试](checks.json)：119/119 PASS，14 个实际匹配文件；技能面板/真实计分来源/高光名称、旧能力分派、蓄放、提醒与场间保持均在范围内。
- [浏览器报告](browser/report.json)：Chromium 153.0.8010.12，Canvas renderer=1；1366×900 DPR1、390×844 DPR2、320×568 DPR2。每档 6 人选角/宣言与故事出处/长规则展开、6 人实时技能面板、2 个旧局能力对照；状态/日志/存储只读相等，无页面异常，PASS。
- 最终 `npm.cmd run build` PASS（含 typecheck）；产物 `index-BUoeXzkO.js`，原有大 bundle 提示保留。
- `node scripts/check-production-plan.mjs` PASS（32 包/P08 in_progress，仅结构校验）；`git diff --check` PASS。
- [源码检查](source-check.json)：领域/内容/应用/平台/音频/美术/依赖无改动，JSON 的六人 mechanics/sourcePaths/oldSkillNames 全部相等。测试时为基线上的未提交源码，以 sourceFingerprint 固定字节；浏览器报告的 baseCommit 不是测试后的提交。

浏览器重跑命令：设置 `HERO_COPY_CHROMIUM_PATH` 为本机 Chromium，`HERO_COPY_OUT` 指向新证据目录，再运行 `node harness/hero-text-adoption.mjs`。Windows 沙箱内单测应把 TEMP/TMP 指到 worktree 内可写的 `.vite/tmp`，避免重命名权限错误；浏览器在正常 Windows 临时目录运行。

## 未通过与未签收

全量尝试 3652 项中 3635 PASS / 17 FAIL，不宣称全量绿。明细见 checks.json；其中旧故事“每句都含青年”的断言已改为统一青年声明并在最终定向测试通过，其他失败未扩范围修复。两个未改动历史 manifest 的工作区字节与 git blob 仅差 CRLF/LF（工具 manifest：checkout SHA256 1ca4adc7c380a721673fb7db9b303c75fb73530fcf48e03718797b49ea80a42b，git blob 45e9b14f1366a8c165c25deec3f2eb04e252144cb0a2974d9d9f73c53517eed2），未归一化素材来迁就断言。

软件截图与 Canvas 检查不代签布局任务、真人文化理解、运行时美术、独立眼原画、GPU、物理设备、听感或 P08 整体完成。没有读取 CI/域名，也未 force push。
