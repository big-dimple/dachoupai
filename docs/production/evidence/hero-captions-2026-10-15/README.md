# 六英雄说明与演出字幕：有界核查及补缺

基线：`4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`。产品提交：`f2386c09795011785a7848a8b92257e7018c0965`。独立分支 `dev/hero-explanation-captions-20261015`；不合main、不重试此前Forbidden PR。执行前已读AGENTS、DELIVERY_PLAN当前批次、CARD_AND_HERO_GUIDANCE_SCOPE及SHORT_ANIMATION_REPAIR_SCOPE；本环境 `/workspace/.agents` 为空、仓库无 `.agents/skills`。本次用户并发授权覆盖历史串行文字。独立Astra子任务完成只读核查、老幻专属受控脚本及最终产品复审；不对模型或计费作额外承诺。

## 已有实现，保留不重做

选角立绘、商店头像/PC立绘、牌桌HUD头像/PC装饰、结果英雄、手记嵌套均已调用HeroExplanation。该模块按真实存档身份取CharacterRunCopy，牌桌再取HeroSkillGuide，展示“做什么／何时能用／现在”、折叠完整限制及按需示例。六角色能力语义一致；未改这些入口或技能规则。

当前PC1366×768与手机390×740分别60行报告：每组含六角选角、商店、结果、牌桌、手记、关闭/Escape/焦点和原技能操作入口；手机6行明确为没有PC装饰的布局，不算入口通过。因此120是记录数，不是120个独立界面或命令。查看/取消/展开/关闭不改变完整state、journal、IndexedDB及localStorage，牌桌选牌/技能草稿保持。完整记录在 [PC](explanations-pc/report.json) / [手机](explanations-mobile/report.json)，gzip另存完整状态。本目录仅保留两端六角牌桌及各三张主要页面代表图，未保留全部示例展开重复截图。

## 本次真实补缺与公共文件窗口

1. 老幻真实留牌特写没有传技能名，原来回退标题“老幻”；GameScene.showLaohuanPayoff仅新增 `skillName:characterForRun(this.run).passiveName`，现在显示同说明的“戏法换牌”。不把留牌虚构成计分。
2. 原作用说明只在skill/landing镜头显示，首镜头为空；提取独立HeroClimaxCaption，把标题、归属和同一条原value.note挂共同board，跨镜头保持。真实作用仍来自原savedBenefit/scoreSourceProcess，数字仍独立Phaser Text，scale=1；不把文字烘入低清图，不随图片放大。
3. HeroClimax只接新字幕模块、移除两个镜头内重复note与切镜重复设同文标题。原眼神/技能/落位镜头、250ms预备、原1秒主体等待、150ms退场、4×、低动态、快进/退出及回看边界均保持；没有新增长等待或短反馈跳过按钮。

**公共文件清单：GameScene.ts仅上述一处传参；ShopScene.ts零改动。** 其余产品仅HeroClimax.ts及新增HeroClimaxCaption.ts；测试在hero-climax.test.ts。独立可cherry-pick产品提交。未动renderer、Viewport、TextRaster、HeroClimaxLayout、HeroPayoff、领域/经济/保存、声音或原画；逐Git对象相同见 [identity.json](identity.json)。没有下扫曲线、暗背景套参考图、图片生成或服务购买。

## 实际受控演出证据

- [after](after/summary.json)：13例，五种计分技能、PC/390/320、4×、低动态、菜单快进/退出、两种丑牌来源。原生导入合法受控checkpoint、实际选牌/技能/出牌，完整事务与权威命令对账、演出不写存档及冷恢复通过。
- [caption-boundaries](caption-boundaries/summary.json)：额外4例，逐镜头一条常驻作用、同文持续、数字字体scale=1、字幕与可见文字不相交。4×主体1024.8ms，低动态1010.6ms；原生菜单快进/退出在本次分别约531.9/250.7ms结束主体，完整保存元组保持。不声称每次菜单动作必能在同一固定毫秒发生。
- [laohuan-r3](laohuan-r3/summary.json)：PC普通、390普通/4×/低动态共4例，8笔真实弃/留牌命令，主体1006.2/1016.5/1016.4/1014.8ms；技能名来自真实身份，实际留牌数、“多看2张”和“不增加计分”持续可读，只读查看和冷恢复不改完整保存。
- [dpr3-caption](dpr3-caption/summary.json)：精确产品HEAD f2386c09，390 CSS / DPR3，4×实际出牌，主体1049.5ms；字幕同源、独立字体、无遮挡及保存对账通过。只是浏览器像素密度受控样例，不是renderer性能、实体手机或FPS验收。
- [caption-source-review.json](caption-source-review.json)：对13+4例真实postrender记录做离线核对，每镜头作用逐字等于原已保存来源给出的heroClimaxValue.note，且不与其他可见文字相交。不是另一轮浏览器或自然试玩。

普通自动播放主体记录约1033.9–1160.4ms；实际镜头分段仍短，字幕跨镜头累计可读不代表真人能读完所有细则。完整规则保留在可随时打开的英雄说明中。老幻落位红色local-effect与黑色note有同文重复，是基线已有布局，未扩范围重做。

## 看图

- 手机六角示例：[老幻说明](explanations-mobile/390-laohuan-table-HUD-first.png)、[骰爷商店说明](explanations-mobile/390-touye-shop-first.png)。其余六角牌桌first图在两端目录。
- 首镜头作用对比：[修前燃金](before/xiemu-390-normal-shot-0-eyes.png) → [修后燃金](after/xiemu-390-normal-shot-0-eyes.png)。
- [PC燃金技能镜头](after/xiemu-1366-normal-shot-1-skill.png)、[手机燃金落位](after/xiemu-390-normal-shot-2-landing.png)、[低动态交棒](after/erxiang-390-reduce-shot-0-landing.png)。
- [PC戏法换牌](laohuan-r3/1366-normal-1-skill.png)、[手机戏法换牌](laohuan-r3/390-normal-1-skill.png)、[DPR3手机4×字幕](dpr3-caption/xiemu-390-fast-shot-1-skill.png)。

主任务实际查看上述类型及阿默首镜头/技能图；独立子任务实际查看老幻PC/390各镜头及低动态晚帧。截图来自真实postrender canvas/原生页面，未改图或生成图。

## 检查、原失败与限制

47项定向（5文件）、typecheck、生产build、production-plan32项通过，见checks。build原有大chunk提示保留；检查与源码提交是软件证据，不是整体游戏验收。产品源树已冻结，早期after/mobile/boundaries报告保留它们原来的base HEAD+dirty记录，其实际产品工作树随后原样提交f2386c09；PC重跑/老幻最终/DPR3在f2386c09上完成，未篡改旧报告身份。

原始失败保留在original-failures：

- explanations：跨PC/手机串跑在手机首次导入shop等待18秒超时，已完成PC60行和手机选角12行；两端分开重跑各60行PASS，没有证据归因产品或并发，未增加timeout掩盖失败。
- laohuan：观察器收到了已完全透明board，标题数量断言失败；改为只采实际可见帧后继续。
- laohuan-r2：只读故障注入自动打开原菜单，挡住说明触点；原生关闭菜单后r3四例PASS。没有修改产品来迁就夹具。

最终独立源码复审结论为局部可整合、无新增阻塞：真实来源、字幕生命周期、时长/skip/save保持，未改全局DPR。任意极端长文本未全覆盖；14px下限并非所有文本长度的截断保证。无自然试玩、全旅程、实体手机、真人阅读速度、听感或整体审美签收；CI若由push触发，应另核精确HEAD，不将既有绿CI移作本次结果。

## 定向复跑

```sh
npm run typecheck
npx vitest run tests/hero-climax.test.ts tests/hero-payoff.test.ts tests/hero-explanation.test.ts tests/hero-skill-guide.test.ts tests/settlement-presentation.test.ts
npm run build
HERO_EXPLANATION_WIDTHS=1366 HERO_EXPLANATION_OUT=/tmp/hero-pc node harness/hero-explanation.mjs
HERO_EXPLANATION_WIDTHS=390 HERO_EXPLANATION_OUT=/tmp/hero-phone node harness/hero-explanation.mjs
HERO_TITLE_CAPTIONS=1 HERO_TITLE_CASES=xiemu-390-fast,erxiang-390-reduce,erxiang-390-skip,erxiang-390-exit HERO_TITLE_OUT=/tmp/hero-boundary node harness/hero-source-title.mjs
HERO_TITLE_DPR=3 HERO_TITLE_CAPTIONS=1 HERO_TITLE_CASES=xiemu-390-fast HERO_TITLE_OUT=/tmp/hero-dpr3 node harness/hero-source-title.mjs
HERO_CAPTION_LAOHUAN_OUT=/tmp/hero-laohuan node harness/hero-caption-laohuan.mjs
```
