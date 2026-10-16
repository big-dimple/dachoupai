# 高光内容收紧与完整暗场

增量基线`efaad42768e64a3dd4815739e6b96ebe7205a84d`；产品`2a243b6256c388603defaa8237a2b2b217c1f8e7`；分支`fix/highlight-manga-focus-20261016`。只改高光布局/表现及必要测试、观察器，未合main。P08仍in_progress。

## 这轮具体修正

主执行目视指出：旧390蓄力帧眼神下方约150px没有内容，象牙面板占据中段，底部却露出截断手牌，仍像空白弹窗。根因是蓄力阶段隐藏数值，同时保留数值的固定区域和固定底栏。

现在用一套持续可见的已保存数值，蓄力/释放/落位不再切走数值；蓄力只作用于原外围墨线。标题、身份、固定眼神、局部实际变化与累计值、原短规则依次排布；根据实际图像和文字底边安排说明，再按内容高度收纸面，居中时取整像素。没有扩大低清图片或新加旁白。

390蓄力帧眼神下方最近可见内容的间隔从145.9px变为10.4px；纸面430px收至358px。数字下方到短规则约8px，末行至纸边14px。原字体按层级收紧，文字最低14px；眼神采样区域保持不变，没有靠缩小眼神来填空。

整个画布以不透明深色统一遮住背景，手牌、计分区或头像不会在纸面边缘露一截。退场时纸面与背景同步使用原150ms释放；原菜单、快进、退出仍可用。没有新增输入拦截、队列等待、图片请求或纹理；数字对象由两套减为一套。

## 390关键帧与目视记录

[旧蓄力帧](390-before-eyes.png) / [旧释放帧](390-before-skill.png)。以下是最终clean产品构建实际出牌后的原生画布，没有合成或暂停场景：

- [新蓄力帧](390-eyes.png)
- [一次释放](390-skill.png)
- [落位](390-landing.png)

我逐张看过最终390三帧，也看了320、短横、PC、DPR 2与刘娥普通交棒图。判断依据是：标题和眼神之间没有空框，眼神后马上接两列真实变化，下面的短规则自然收尾；外围暗场稳定，背景手牌碎片全部消失。三帧的内容密度相同，只有墨线明暗释放变化。这是具体目视判断，未用“碰撞0”代替美观判断，也不代签用户对风格的认可。

补充图：[320](320-eyes.png)、[740×320短横](740-eyes.png)、[1366×768PC](1366-eyes.png)、[刘娥实际交棒](390-erxiang.png)、[少动效](390-reduced.png)、[DPR 2](390-dpr2.png)。

## 本地验证

[validation.json](validation.json)、[可运行复核](verify.mjs)、[最终9案原始报告](final-report.json.gz)、[DPR 2原始报告](dpr2-report.json.gz)。

- Windows Node22.20，28项/3文件定向测试、TypeScript与生产构建通过，原Vite大chunk提示保留。
- 最终同源E2E构建revision=2a243b62、sourceStatus=clean。9案覆盖普通交棒及回看后选牌、390/320/短横/PC、少动效、快进和退出；另1案DPR 2及实际图片响应版本核验，总计10案PASS、页面错误0。
- 每张蓄力帧都有真实累计数值的已绘制像素，不再留数字占位；各阶段眼神变换固定，scaleX=scaleY且scale×DPR≤1。所有截图文字边界成对检查碰撞0，作为可读性检查单独记录。
- 8张原始PNG的四角与底部外围像素均为不透明`(23,37,42,255)`；结合实际看图确认外部不再露牌，不只是设置一个未绘制的遮罩标志。
- [原版报告](before-report.json.gz)的运行时src tree与基线efaad427完全相同（其clean构建提交为d5355651）；同输入5案的initial/saved/after/cold完整state/journal/storage/localStorage逐字段相等。其余控制场景也通过脚本自身的applyCommand和存档不变断言。已保存的真实结果提前在蓄力帧呈现，未改变领域结算时机。
- HeroClimaxValue、GameScene、IntermissionScene、领域/内容/存档/平台/音频、原图与派生资源相对efaad427均无变化。苏轼focus仍为f158579f7e05版本，没有更换图源或重制眼神原画。

复核已交付报告：`node docs/production/evidence/highlight-compact-stage-2026-10-16/verify.mjs`。复跑浏览器时按validation.metrics中的key选择`HERO_TITLE_CASES`，设`HERO_TITLE_CAPTIONS=1 HERO_FOCUS_FIXED=1`执行`node harness/hero-source-title.mjs`；DPR 2使用e11-390-normal、`HERO_TITLE_DPR=2 HERO_FOCUS_ASSET_PROOF=1`。仍用公开存档导入、选牌、技能和出牌入口，没有私有挂载、改时钟或长局试玩。

本轮是软件表现增量；不把浏览器视口、固定坐标或看图结论写成物理设备流畅度/听感/真人美术验收。没有新图、数值或旁白、CI/域名/部署操作。此前新苏轼与全屏原画接入证据保留各自SHA，不冒称本轮重跑了全部旧矩阵。
