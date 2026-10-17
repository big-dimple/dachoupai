# 六英雄专用眼神图接入

基线 `a73d9ec2faae6e537e77a975f02e0a2cef220074`；独立分支 `dev/dedicated-hero-eyes-20261017`。用户指定本地目录 `D:\ai\dachoupai\lihui\eyes`，没有从 Library 取图，也没有重画、去底或删除原图。

## 原图与映射

六张逐张查看，并对照现有六人立绘的眉眼、额发、伤痕、眼色及冠饰。以下为执行者的视觉对应记录，不代替用户的最终同人一致性／美术验收。

| 技术 ID | 人物 | 用户原文件 | 对照特征 |
|---|---|---|---|
| amo | 苏轼 | 苏轼-墨韵凝眸：风痕少年眼神.png | 流动额发、平展眉峰、棕色双瞳 |
| touye | 秦琼 | 秦琼-战士凝视：墨影烈眸.png | 正面浓眉、额部伤痕、灰棕双瞳 |
| laohuan | 辛弃疾 | 辛弃疾-墨影怒瞳：漫画风眼部特写.png | 斜向碎发、内收剑眉，与秦琼正面宽眉区分 |
| erxiang | 刘娥 | 刘娥-鎏金红饰下的冷峻凝眸.png | 偏侧凝视、金饰红宝石与珠坠 |
| azao | 文成公主 | 文成公主-鎏金流苏下的琥珀凝眸.png | 琥珀双瞳、金流苏、红色绳饰 |
| xiemu | 花蕊夫人 | 花蕊夫人-墨染花影·凌厉双眸.png | 额心红宝石、水粉花簪、锐利眼线 |

全部原图为 **2048×768、8:3、RGBA PNG**，有真实零 alpha 与半透明像素；逐张未见白底或烘焙棋盘格。6 张原字节共 17,915,262 bytes，保存在 [source manifest](../../../../art/sources/tangsong-eyes-20261017/manifest.json) 同目录，各自原文件名、SHA-256、尺寸及 alpha 像素计数都绑定到副本；用户目录保持原样。

`node scripts/build-dedicated-hero-eyes.mjs` 沿用 sharp／WebP 的有界派生方式：完整画面等比降采样到 **768×288**，不裁眼、不拉伸、不放大，alphaQuality=100，单图不超过原有 128 KiB 传输门。1024×384 首次派生超过此门，已改为满足实际显示密度的 768×288，没有放宽预算。六张派生共 **685,752 bytes**；[runtime manifest](../../../../public/assets/tangsong-eyes/manifest.json) 记录原图与派生哈希，文件名及 URL 均使用内容哈希。

## 接入与边界

- `CharacterArt / portraits` 增加独立 `eyes` 用途；原 portrait/focus 资源不改。`HeroClimaxStage` 优先使用整张专用眼图；仅在新纹理不可用时保留既有静态回退。
- `warmHeroImage` 提前请求选定英雄眼图，`sceneResources('game', run)` 在牌桌可操作前明确准备该英雄眼图；不把六张全部塞进启动目录。启动仍为 146 项，选定英雄只增加 884,736 bytes 解码 RGBA，沿用 20 MiB 有界预加载。
- 眼图在蓄力、命中、落位间保持同一位置、裁区、比例及像素。外围只保留四条 1px 短斜线轻触发，去掉旧角框式折线；不增加全图移动、缩放、竖线、开发占位字或粒子。原来源连线与实际累计数值命中保持。
- **GameScene / ShopScene 零 diff，无需 owner 补丁。** 原触发条件、EffectContext、计分、音频、规则、存档及能力数值不改；减少动态仍沿用静态落位和清理。

## 验证

- 六个相关测试文件 **50/50**：character-art、scene-resources、hero-climax、hero-climax-focus、hero-climax-layout、hero-payoff。覆盖真实来源资格、专用图整幅采用、比例不变、静态回退、reduce／销毁清理和当前英雄有界准备。
- `npm run build`（含 TypeScript）通过，322 modules；既有大 bundle 提示保留。派生构建校验原图哈希、尺寸、真实 alpha、传输上限和完整解码；`git diff --check` 通过。
- [runtime.json](runtime.json) 与 [screens](screens/) 是有限实际 GameScene 检查：六英雄各一次 390×844、1×，通过存档导入与原生选牌／出牌操作，实际保存 `PlayHand`。公开手牌和已拥有 f09 为受控条件，真实 f09 事件 ×1.5，没有改触发器或计分强行播放。它不证明自然抽到 f09，也不冒充六人主动技能逐一发动。
- 每个案例均检查：出牌前纹理已加载、眼图请求发生在点击前、整幅 768×288 被采用、等比例、charge/impact 眼区像素哈希相同、来源为保存的 f09、倍率峰值约 1.539、结算后完整状态与规范命令一致、无浏览器错误。截图中的秦琼 2.3→3.45 来自原有常规倍率；其余 2→3。
- 首次 Edge 沙盒启动失败，改用允许的本地隔离测试进程；临时核验脚本的两处预期命令修正为 UI 实际提交形式（文成公主保留 `azaoRelease:false`，花蕊夫人未选支付时不传 `xiemuBurn:0`），各自只补未通过案例，既有通过证据复用。没有删减规则断言或重复大矩阵。

父级整合后的 dot 远端自然局、真人身份一致性／观感、主观听感与物理设备仍未验收；浏览器减少动态未另开矩阵，静态路径由相关单测覆盖。P08 保持 in_progress，无整体完成率、CI 或部署结论。
