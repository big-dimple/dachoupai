# 六英雄运行时文案采用 · 2026-10-15

规范来源 `856c30ed4145da9c75310982ed1cd368276c5d80`，顺序合入提交 `fa50d73aa198b8e32ebdad69a501782622a8046b`。最终文案产品 `116d85245fa035c531ddecf65d74f47aa54f55da`，`src` tree **`c84c69b5b146ce8b106e646ba7dc17dfb1c6b291`**；本目录后续证据/计划/脚本提交不改产品源码。各报告保留实际被测HEAD和源码hash，当前检查汇总见[status.json](status.json)。

第一阶段六图/加载/R03已正常发布main **`c9737cf31a06ad277be663411dde8b6dcaceb7c2`**，完整tree与已验证开发版 `605bfc3c99ffb5de7ccdcd6cb4ac713b965f322d`相等；[第一阶段证据](../tangsong-art-delivery-integration-2026-10-15/README.md)。第二阶段按用户明确授权独立验证后正常merge、push main；最终发布SHA以交付回执/远端为准，不强推、不查CI/域名。

## 实际可见变化

| 人物 | 原新局技能名 | 本次规范新名 |
| --- | --- | --- |
| 苏轼 | 主手＋助攻 | 余韵相和 |
| 秦琼 | 弃前赌约 | 新锋入阵 |
| 辛弃疾 | 戏法换牌 | 挑灯择锋 |
| 刘娥 | 交棒 | 移筹定势 |
| 文成公主 | 蓄势／爆发 | 步步成势 |
| 花蕊夫人 | 留钱／燃金 | 藏锋散金 |

选角宣言、英雄说明、实际技能操作标题与真实来源高光采用新名。六主题保持原字，宣言与故事逐字对应[唯一规范](../../HERO_TEXT_SPEC_20261015.json)。故事采用架空青年意象，并保留“台词为游戏创作”说明。

此前说明首层先放主题、宣言、故事与三段说明。现在首层显示**短效果、条件/次数标签、实际当前状态**；人物故事/宣言、技能例子与完整规则均点击展开，不原样把长skillSummary塞首屏。展开规则去掉文案作者用语和技术集合名，保留条件、次数、成本、倍率、禁用与重置。DOM正文15px，完整规则14px；标题和Phaser高光文字独立渲染，文字不随人物图片缩放。

文成公主统一说明**“同牌型未释放则清空”**，同时明确**合格的同牌型仍可释放**；不是每场一次，也没有改释放资格。秦琼未押×1.15仍标“常规倍率”；输约保存结果标“新锋入阵 · 已结算”，不伪装收益。高光标题只由真实保存事件决定，辛弃疾实际留牌仍不增加计分。

## 截图与状态证据

| 尺寸 | 首层 | 展开的长规则 | 故事与宣言 | 实际高光 |
| --- | --- | --- | --- | --- |
| PC 1366×900 | [辛弃疾](browser/1366-laohuan-first.png) | [正文](expanded/1366-laohuan-rules.png) | [正文](expanded/1366-laohuan-story.png) | [原生流程](native/summary.json) |
| 390×844 DPR2 | [辛弃疾](browser/390-laohuan-first.png) | [正文](expanded/390-laohuan-rules.png) | [正文](expanded/390-laohuan-story.png) | [五个计分技能](climax/summary.json) |
| 320×568 DPR2 | [辛弃疾](browser/320-laohuan-first.png) | [正文](expanded/320-laohuan-rules.png) | [正文](expanded/320-laohuan-story.png) | [花蕊夫人紧凑布局](climax-compact/summary.json) |

[完整文案浏览器报告](browser/report.json)覆盖三档每档六人：18组现代说明、18组实际操作入口、6组旧身份说明。展开与返回前后完整状态/日志/存储相等；新局有真实条件/次数标签，旧随机押注与旧顺同+120被动不套新名/例子。第一层短效果在滚动区内完整可见，无横溢出，返回触点≥44px，选角文字scale=1。长正文额外用[聚焦报告](expanded/report.json)检查三档两人，可正常滚动，规则字号≥14px且宽度在列内；这不是保证所有长规则首屏同时可见。

[三档原生新局](native/summary.json)：自然6金开局、真实买2金工具、明确携带、只打开一次当前手牌目标、取消保物不重开、再用工具K♠→A♠；继续真实戏法弃/留牌，焦点/人物/数值高光后归位并冷恢复。六条实际命令通过SavedRun重放，完整状态/日志/存储/RNG相等。PC另外逐出一张已载纹理，延迟资源等待仍保留携带意图。没有导入原生路径夹具、覆盖货架或制造金币。146项、4,458,496像素、17,833,984字节RGBA（17.01MiB），预算20MiB。

[高光报告](climax/summary.json)与[紧凑320](climax-compact/summary.json)保留真实来源、实际数值、头像回落、冷恢复与文本边界；五个计分技能逐一出现新名，另测PC、4倍速、减少动态、跳过及退出。标题/归属/效果/数字无重叠，持续效果说明仅一份，人物主体显示时间按原合同，不改领域或演出时钟。辛弃疾三档真实留牌见native中的三镜头与逐帧记录。

[R03回归](r03/report.json.gz)继续覆盖12组确切实例、取消/Escape、资源等待、保存失败/重试、冷恢复、B05与一次性提示。[构建产物smoke](smoke/report.json)覆盖PC/手机短玩家路径。

## 保护范围与检查

[源码审计](source-audit.json)逐树/逐blob证明领域、content、application、platform、audio、公开资源、六张原图、CharacterArt、SceneResources、LoadingScreen/PaperFlow、ToolCarryIntent、ShopScene、RunLaunch均与第一阶段main字节相等；[GameScene显示差分](raw/GameScene-display.diff)仅局部标题/首层文案/标签与实际留牌标题。没有改contentVersion/hash、技术ID、存档键、命令、价格、概率、倍率、计分或人物资源。

新文案严格匹配`R2_S04_FINISH_VERSION/HASH`。旧身份继续自身passiveName/完整说明；旧“只押未成目标”与新局“已成型也可押、新补牌进有效核心”有对照测试。文成公主同牌型释放和不放清空均通过真实applyCommand验证；已用/停用状态、普通×1.15与输约×0.85也用实际状态/事件验证。

- `npm test -- --maxWorkers=1`：270文件、3652项，[原始输出](raw/unit-final.log)。
- `npm run build`：包含TypeScript，[原始输出](raw/build-final.log)；原有大chunk提示保留。
- `npm run verify:content`：[输出](raw/content.log)。
- `node scripts/check-production-plan.mjs`：只证明计划结构，[输出](raw/plan-final.log)。
- Chromium软件环境的实际浏览器、视口/DPR/renderer见各报告；以上不是物理设备性能、真人理解或听感验收。

原失败保留在[failures](failures)：初版脚本误认返回按钮名称、关闭后立即点下一英雄被现有350ms防误触保护拦下、错误挑战seed、以及旧技能名测试期望；最终状态汇总生成时曾因JSON生成脚本漏括号导致计划检查找不到status，修正后结构检查通过。修正脚本/预期，未放宽原产品超时、保存或领域断言。初版长规则正文截图也保留，最终展开正文另拍，不把只展开标题当正文验收。

## 参考许可与剩余边界

本阶段没有引入外部图片或动画。原开场复用的本地Inkwave弹簧保留MIT归属与完整许可证；山河、日印、三牌为本项目原创SVG/CSS。[原开场变化与录屏](../loading-opening-2026-10-15/README.md)、[参考访问/许可记录](../loading-opening-2026-10-15/reference-access-and-license.json)保留原事实：指定demo代理403、仓库/原始源码404，**未声称已经实看参考加载画面或重新获取其源码/许可**；没有复制未核许可素材。后续仍需恢复访问才能完成参考实看。

用户只签六张原图，软件图审不扩签运行时美术、独立眼原画、真人理解、听感、真实手机/GPU、平衡与完整通关。P08保持in_progress，C04剩余教程/图鉴/高光历史和正式门不因此解锁。
