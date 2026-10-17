# 高光来源图预算适配

产品提交：`49d962bf56417e42ea07adb181c5fa0fe87395b7`，开发分支 `fix/card-art-display-regression`。本次在已交付卡图放大修复之后单独提交，不依赖 GameScene 接线改动。

## 原因与实际消费

`GameScene` 只在真实保存事件产生高光时，异步请求一次 `loadClimaxSourceArt(id)`。计分不 await；同场景最多一张纹理，完成/快进取消，退出清理。`HeroClimaxStage` 优先消费 `climax-source/<id>`，未就绪则使用同 ID 缩略。当前 PC/390 原生来源槽实际为 58×72.5 CSS px；短横屏现有构图不显示来源槽，不在本次修改其布局。

旧路径直接取 `HANDDRAWN_ART` 的详情输出，预算仍为 **96 KiB / 边长 768 / 超时 1800ms**。72 张新详情中有 52 张超限，f09 的 163,216 字节因此被拒绝，而旧测试仍期待旧详情的 45,274 字节。这既造成三项测试失败，也使对应高光始终只能回退缩略。

原始三项失败完整保留：[source-stage-original-FAIL.txt](source-stage-original-FAIL.txt)。

## 修复

- 20 张仍合规的详情直接复用原字节。
- 52 张超限图由**当前完整详情**独立导出高光变体，`inside` 等比完整取样、无裁切、不放大；320×400、WebP quality 86。新文件总计 **2,714,052 字节**，单个派生最大 **61,570 字节**、128,000 像素（理论 RGBA 512,000 字节）。
- f09 从高光误用的 163,216 字节改取 **57,192 字节 / 320×400**；a11 高光变体 43,248 字节，完整保留已修复的详情构图。全部 72 个选择中最大 96,814 字节，仍小于 98,304 字节上限。
- 独立 `handdrawn-climax/manifest.json` 记录 ID、输入详情 SHA、输出 SHA、像素和字节；路径保留 BASE_URL 与内容版本。当前详情 SHA 若变化，拒绝旧变体，避免同 ID 的过期画面混用。
- 加载器的响应头、流式字节、精确长度、解码尺寸、1800ms、代次/取消校验均保持。没有提高上限或删除失败断言；旧精确详情期望更新为实际高光变体的精确值，并增加全部 72 个真实文件的尺寸/字节/哈希和过期变体测试。
- 72 张原稿、全部当前缩略/详情、51 件商品图片、前次放大修复、GameScene/ShopScene/AudioEngine、领域/存档/平台均与 `38bd514a` 相同。没有压缩或覆盖当前详情。

构建脚本：`node scripts/build-climax-source-art.mjs`；只读复验：`node scripts/build-climax-source-art.mjs --check`。更换卡图后须重新生成对应高光映射；脚本不会写输入详情或原稿。

## 验证

- [source-stage-14-PASS.txt](source-stage-14-PASS.txt)：14 项全部通过，原三项失败已消除。
- [targeted-172-PASS.txt](targeted-172-PASS.txt)：高光、布局、详情与原卡图相关 7 文件 172 项通过；[类型检查](typecheck-PASS.txt)通过。
- [derive-CHECK.txt](derive-CHECK.txt)：52 张逐字节可复现、20 张原字节复用，实际解码元数据与 manifest 相符。
- [resource-audit.json](resource-audit.json)：原图/详情及受保护源码无变化，首屏仍为 146 项，高光专用图片不进预加载。
- [build-PASS.txt](build-PASS.txt) / [build-files-audit.json](build-files-audit.json)：干净产品提交 49d962bf 的生产构建通过，72 个实际选用文件在产物中的 SHA 均匹配。保留既有 bundle 体积提示。
- [browser-report.json](browser-report.json)：Chromium 151、DPR1、软件 Canvas；合法校验的受控持牌夹具，经真实导入、选主手、助攻、出牌与高光。1366×900、390×844、740×320 各只发起一次 57,192 字节请求，实际纹理 320×400、响应 SHA 匹配；完整结算与冷恢复 state/journal/storage 相等，页面错误 0。PC/390 实际展示 `climax-source/f09`；740 验证加载与状态，现有布局隐藏来源槽。
- [完整本地回归](full-suite-three-existing-FAIL.txt)：**3806 通过、3 失败**。余下为原有 score-recorded-audio 1 项、assist-profile-ui-copy 2 项，不含 source-stage-art；相关产品和断言未在本次修改。未将父整合分支的其它修复复制进本开发分支。

截图：[PC 原生高光](1366-multiply-native.png)、[390 原生高光](390-multiply-native.png)、[740 既有短横布局](740-multiply-native.png)、[完整详情与高光变体对照](detail-and-stage-comparison.png)。这些是受控软件证据，不是自然获得率、真机、真人美术或听感验收。

## 保留的探针失败

- [旧助攻入口](browser-assist-entry-observer-FAIL.json)：历史脚本的按钮名已失效，改走当前“换一组”原生候选，不改产品。
- [旧成长夹具](browser-retired-growth-fixture-FAIL.json)：现有规则下不触发该高光，保留原超时；三档改用仍真实触发乘法高光的同一合法 f09 夹具，没有制造新触发。
- [对照图库来源](browser-comparison-origin-FAIL.json)：三档原生已过，独立 about:blank 图库因来源限制无法解码本地图片；图库改为同源空白测试页，单独补跑图库，不重复已通过的三档。`--comparison-only` 只在同一提交、三档均已通过时允许复用原生记录。

未推 main、未强推、未部署或操作 CI；原 FAIL 与前次详情修复证据保持。
