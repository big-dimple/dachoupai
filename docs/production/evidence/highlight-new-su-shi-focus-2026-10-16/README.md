# 新苏轼眼神裁切与高光接入复核

运行时代码：`d5355651ccb8d36dc4746c9d453bafdc4ef2a3e3`。分支仍为`fix/highlight-manga-focus-20261016`。在自有worktree以merge提交`3278475e1392d4cd22ce1f4691695d3605e734da`接入资源分支`76e64c14ab03032b45bba4778ebf4c9b7fe389a1`（资源产品d6a52afc）。没有修改对方工作区、原图或派生文件；资源/原画文件与该依赖逐字节相同。未合main。

新480×480 focus中的双眼位置与旧图接近，旧条带未切眼，但带入较多鼻部、笑容。针对用户新图，将amo归一化条带从`[.25,.177,.667,.271]`收紧为`[.313,.19,.51,.221]`，实际采样`x150/y91/width245/height106`。两处已看图确认的眼位锚点约`(271,137)`、`(339,165)`都在内部，底边197避开笑容。其余五人坐标不变。

## 390实际出牌关键帧

直接来自原生画布，未合成或重绘：

- [同一新图、收紧前](390-before-tightening.png)
- [蓄力](390-eyes.png)
- [一次释放、真实×1.3与累计10.4](390-skill.png)
- [落位](390-landing.png)
- [少动效静态](390-reduced.png)
- [DPR 2](390-dpr2.png)

双眼与眉线保留，嘴部不再被截在条带边缘。三个阶段沿用相同裁切、坐标、角度和等比缩放，外围墨线只释放一次；没有图片往复跳动、扫描或采样像素放大。仍然是用户原画的既有派生资源裁切，不是新增独立眼神原画。

其他必要尺寸：[320](320-skill.png)、[740×320短横](740-skill.png)、[1366×768PC](1366-skill.png)。

## 数据与资源证据

[validation.json](validation.json)和可运行的[verify.mjs](verify.mjs)复核原始报告。

- 19项定向测试/2文件通过：`tests/hero-climax-focus.test.ts`、`tests/character-art.test.ts`；TypeScript检查与生产`npm run build`通过，原大chunk提示保留。最终同源E2E构建revision=d5355651、sourceStatus=clean，运行时代码与该提交一致。
- [收紧前单案](before-report.json.gz)是已合新资源但未收紧裁切的clean构建3278475e；[最终5案](final-report.json.gz)覆盖390/320/短横/PC及390少动效；另有[DPR 2单案](dpr2-report.json.gz)、[实际资源响应单案](asset-proof-report.json.gz)，合计7案PASS、页面错误0。
- 逐渲染帧确认eye条带变换完全固定，scaleX=scaleY且scale×DPR≤1，全部截图文字碰撞0。收紧前/后同一390输入的initial/saved/after/cold中完整state/journal/storage/localStorage逐字段相等。
- 实际HTTP响应为`amo.focus.webp?v=f158579f7e05`，56012 bytes，SHA256=`f158579f7e055d16a4f2d9c2f36609fcbb5d8980469e31e063517f1e6fea02ad`。原画PNG SHA256=`abe4446d6c57b1c2d8d83434c766e0a452aeb8ee198615cf58bd918b1021dfcb`。头像、选角、立绘的响应版本及SHA也与依赖manifest一致。不是把blob图像地址当成源文件版本；报告另保留真实响应体哈希。
- 继续使用原portrait/portraitFocus资源接口，未硬编码无版本URL。GameScene、IntermissionScene、领域、规则内容、存档、音频与平台代码均未改动。黑底查看器来自原作者分支，未自行重写。

复跑实际资源断言：`HERO_TITLE_CASES=e11-390-normal HERO_TITLE_CAPTIONS=1 HERO_FOCUS_FIXED=1 HERO_FOCUS_ASSET_PROOF=1 node harness/hero-source-title.mjs`；必要DPR 2加`HERO_TITLE_DPR=2`。也可直接`node docs/production/evidence/highlight-new-su-shi-focus-2026-10-16/verify.mjs`核对已交付报告。

本次关闭了[上一批](../highlight-manga-focus-2026-10-16/README.md)的新苏轼裁切接入待办；上一批18场景与58测试仍对应其各自精确旧资源/SHA，没有冒称本次重新跑完。新的检查点仍是受控合法存档和实际UI出牌，不代表自然获取率或长局。无CI、域名、部署或新图生成，未签物理设备流畅度、听感或真人视觉偏好。依赖的原始tests.txt尾部空行原样保留，未改写其日志以满足本分支的diff检查。
