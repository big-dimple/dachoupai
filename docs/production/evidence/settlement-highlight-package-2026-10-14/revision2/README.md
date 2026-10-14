# PR181 第二轮：眼神 → 技能 → 倍率落位

产品冻结提交 `951826db68acf35e45b0e48f3023df11a883febc`，基线为 PR181 第一轮 `4d118f81c5efd509e1371e9a76cd7c2ab83b5887`。父实际图审指出第一轮重复脸、贴额头小图、零碎矩形和大留白；本轮继续同一表现包，不另开策划，不签美术收口。

## 本轮实际改变

- 第一镜头只出现独立的大幅眉眼近景与原人物短句；眼部画面占自己的镜头，人物全脸不在旁边或额头下重复出现。
- 第二镜头硬切到单个人物/本源插画、技能或来源名、本次真实效果及累计倍率前后值；原消费/助攻/交棒事实持续可读。统一一张纸墨镜头台，撤下拼贴小框。过渡墨线与边缘墨迹放在文字/人物后面。
- 第三镜头让**本事件之后的实际累计值**落位。例如燃10金显示本次 ×2、累计倍率2→4并将4作为主数；交棒显示本次+8、累计2→10并将10作为主数。不是预测后续事件或把本源因子冒称累计倍率。
- 镜头方向用墙钟驱动，4×仍至少保留180ms的眼神镜头；正常演出在实际 strike 后约600ms切到倍率落位。沿用原 `waitHeroSubject` 的一秒主体等待与原队列/输入/音路，未增加规则或通用GameScene等待。
- 低动态直接显示可读的倍率落位重点，不移动、不贴眼部图；中途减少动态立即落到同一静态重点。菜单快进/退出仍走原取消和清理。

产品本轮只改 `HeroClimax.ts` 与 `HeroClimaxLayout.ts`。`GameScene.ts`、`HeroPayoff.ts`、计分/成长/目标/经济/保存、AudioEngine、结果页数值模块、所有原画及安全配置均同第一轮；见 [identity.json](identity.json)。参考图403没有重试或绕过，全部镜头使用本环境实际已看的既有手绘素材。

## 先看连续关键帧及短片

关键帧都是原生导入、实际选牌/技能/出牌后的 **Phaser postrender 实际canvas**，不是拼图、模型生成或直接挂演出夹具。短片由同一实际render后的连续帧按原观测时间组成，静音，仅供画面审阅，不签软件/硬件FPS或听感。

| 输入 | 眼神镜头 | 人物技能镜头 | 倍率落位镜头 | 连续短片 |
|---|---|---|---|---|
| 燃10金，390正常 | [原图](films/xiemu-390-normal-shot-0-eyes.png) | [原图](films/xiemu-390-normal-shot-1-skill.png) | [原图](films/xiemu-390-normal-shot-2-landing.png) | [完整短片](films/xiemu-390-normal.mp4) |
| 燃10金，320正常 | [原图](films/xiemu-320-normal-shot-0-eyes.png) | [原图](films/xiemu-320-normal-shot-1-skill.png) | [原图](films/xiemu-320-normal-shot-2-landing.png) | [完整短片](films/xiemu-320-normal.mp4) |
| 燃10金，PC1366 | [原图](films/xiemu-1366-normal-shot-0-eyes.png) | [原图](films/xiemu-1366-normal-shot-1-skill.png) | [原图](films/xiemu-1366-normal-shot-2-landing.png) | [完整短片](films/xiemu-1366-normal.mp4) |
| 燃10金，390实际4× | [原图](films/xiemu-390-fast-shot-0-eyes.png) | [原图](films/xiemu-390-fast-shot-1-skill.png) | [原图](films/xiemu-390-fast-shot-2-landing.png) | [完整短片](films/xiemu-390-fast.mp4) |
| 交棒，390低动态 | 跳过动态眼神镜头 | 直接静态重点 | [初帧](films/erxiang-390-reduce-shot-0-landing.png) / [晚帧](films/erxiang-390-reduce-shot-1-landing-late.png) | [完整静态停留](films/erxiang-390-reduce.mp4) |

[阿默助攻](regression/amo-390-normal-0.png)、[阿燥释放](regression/azao-390-normal-0.png)、[骰爷赌约达成](regression/touye-390-normal-0.png)、[320长期捧场](regression/e11-320-normal-0.png)、[320一次性招牌](regression/f06-320-normal-0.png)、[长期捧场低动态](regression/e11-390-reduce-0.png)。第一轮[燃金旧图](../heroes-after/xiemu-390-normal-0.png)保留原样供比较，不能作为本轮新图。

## 低动态图错拍的准确结论

第一轮 `heroes-after/erxiang-390-reduce-0.png` 实际只有牌桌：[保留的原错误图片](original-reduced-wrong-poststep.png)。原因是观察器挂在 **poststep（绘制前）**，读取到内存中已经挂出的交棒group，却从canvas取到上一帧牌桌。

本轮在完整第一轮源码 `4d118f81` 上仅替换观察器、**没有改第一轮产品**，重新实际出牌，并在postrender取图：[原产品正确首帧](original-reduced-corrected/erxiang-390-reduce-0.png)、[原产品正确晚帧](original-reduced-corrected/erxiang-390-reduce-shot-1-old-single-panel-late.png)、[原产品完整静态停留](original-reduced-corrected/erxiang-390-reduce.mp4)。首/晚图相隔约778ms，两帧标题墨色像素均2381，实际红色加成像素均788。因此原产品面板确实可见；原一秒等待没有消失，不能将旧交付图片缺陷写成产品面板消失。

新产品的低动态交棒首/晚图约相隔780ms，标题墨色1033像素、主累计倍率红色6706像素；可直接看上述实图，而不是只检查group数据。最终阶段持续到原一秒等待完成后按原取消/退出清理。原错图、原报告及第一轮拒收事实没有改写。

## 实际时点与验证

[painted-timing.json](painted-timing.json) 逐张记录 eventId、镜头、`performance.now()`、相对原 `subjectVisibleAt` 的时间、实际像素计数及原图路径；[films/report.json.gz](films/report.json.gz)与[regression/report.json.gz](regression/report.json.gz)保留完整控制器状态、journal、IndexedDB、localStorage和原命令对账。JPEG连续原帧在各 `*-frames` 目录，短片末段包括原淡出，没有暂停场景、改时钟或强迫render。

- 5个连续关键片样例、13个额外原生回归均通过：五种技能、真实丑牌来源、320/390/PC、实际4×、低动态、菜单快进/保存退出、冷恢复。所有可见文字落在视口内，主数字单行；实际操作结果完整等于原权威命令，观看/播放/取消不改保存元组。
- 类型检查、生产build、7文件82项定向通过；见 [typecheck](logs/climax-revision2-type-freeze.log)、[tests](logs/climax-revision2-tests-freeze.log)、[build](logs/climax-revision2-build-freeze.log)。新测试用真实墙钟推进验证快 strike 仍先眼神再技能再落位、同时只显示一个镜头层、减少动态与销毁清理；像素可见性由真实postrender检查与原图另证。
- 第一轮产品的低动态更正1例也完整通过，原稳定队列与一秒等待原文不变。
- 首轮单测的旧mock不支持Phaser `Container.add(array)`，新增层使其错误嵌套数组，已修mock并保留[原失败](logs/climax-revision2-tests.log)；不是删掉断言。一次同时启动两个同端口观察器发生端口占用，增加独立端口参数后重跑，未改产品。

所有输入都是明确受控的软件样例，不是自然试玩/自然高分或实体手机验收；本轮提供可实际复查的演出候选，完整审美仍由父/用户观看关键片后判断。

## 复跑

```sh
HERO_TITLE_PORT=5592 HERO_TITLE_CASES=xiemu-390-normal,xiemu-1366-normal,xiemu-320-normal,xiemu-390-fast,erxiang-390-reduce HERO_TITLE_CINEMA=1 HERO_TITLE_OUT=/tmp/climax-revision2-films node harness/hero-source-title.mjs
HERO_TITLE_PORT=5593 HERO_TITLE_CASES=amo-390-normal,erxiang-390-normal,azao-390-normal,touye-390-normal,e11-320-normal,e11-390-normal,f06-320-normal,f06-390-normal,erxiang-390-skip,erxiang-390-exit,e11-390-reduce,e11-390-skip,e11-390-exit HERO_TITLE_OUT=/tmp/climax-revision2-regression node harness/hero-source-title.mjs
```

原图、影片和原帧均保留文件hash于 [manifest.json](manifest.json)，源版本与保护树见 [identity.json](identity.json)。
