# 六图 + 新加载动画 + R03 整合

从已推开发整合 `a85be2a8817d5985746c9caeb5f978b2e66ac74e` 正常合入六图交付 `bd626e84c429b0e45aa61a52bba10af2eb953714`（产品 `111039b12ca3269e1bc1f574fa19ddb8f62b2c2d`），合并提交 `eb2b7cae40bc1a91ef91a075e6e6edfb3743975c`。仍使用 `dev/tangsong-delivery-20261015`。AGENTS 仅追加记录冲突，双方原文保留；未取另一路计划重构，也未拿旧文档状态代签本批结果。

用户后续已明确授权本批检查通过后正常合并并 push main。主分支发布结果见最终返回的远端精确SHA；本目录保存本地源码身份与验收证据，不把 push 当成线上域名验证。本批不查CI、不管理域名、不强推。

## 保留与必要修正

- 六源 PNG、24张派生图和运行时 manifest 均与六图分支逐字节相同。六张原图已在本云端逐张实际打开；SHA256、尺寸和裁切记录见 `original-bytes.json`，未重画或重新压缩。
- 原日印/山河/逐字标题/三牌动效及 `LoadingScreen`、`PaperFlow`、R03 `ShopScene`/`ToolCarryIntent` 保持。加载页只把已过时的“待绘”页脚改成“一纸纳山河 · 六位群英同席”。
- 预载为146项：8纸面、12人物小图、3JQK、72大丑牌、51工具/道具；4,458,496像素/17,833,984B RGBA（约17.01MiB），预算20MiB。完整立绘和头脸特写仍按需读取，不进入启动目录。这里是启动解码预算，不是浏览器总内存承诺。
- GameScene 仅叠入正式立绘alt文本，保留R03场景数据、唯一离店/入场序列、发牌/说明/可写守卫和只打开一次的意图清除。
- 三档初轮完整状态检查通过后，逐图发现320高光的长归属行碰到主体/落地标签，且落地重复显示同一效果。原图和报告在 `before-caption-repair/`。本批让主体/数值根据实测字幕高度留白，数值也为次要说明留空间，同一效果只显示一次；没有改变已保存效果、数值、演出时槽或主体实墙钟1秒。
- domain/application/content/platform/core/audio 与上批整合相同，规则、旧身份机制、RNG、存档格式和所有数值不改。精确文件身份见 `audit.json`。

## 同一次正常新局闭环

`harness/tangsong-delivery-integration.mjs`：PC1366×900、390×844/DPR2、320×568/DPR2，均正常动态。未导入状态、未改库存/金币/发牌，也未用脚本调用领域命令替代输入。

实际流程：146项真实解码 → 带正式图选辛弃疾/成组路线 → 普通6金币首店用2金币买往上挪 → 明确带入牌桌 → 发牌/说明结束才一次打开当前手牌 → 零默认目标，取消不重开 → 道具箱手动打开确切新购实例 → K♠改A♠、与已有A♣成为两张A → 实际发动戏法弃1张/从公开候选留1张 → 正式头脸/主体/实际“1张”高光 → 正式头像HUD → 冷恢复。

每笔 BuyBasicTool、LeaveShop、EnterStage、UseConsumable、DiscardHand、ChooseRefill 都用原 SavedRun 重放真实命令，与浏览器完整 state/journal/storage/current/previous/revision/checksum/RNG 逐字段相等。演出前后保存相同；取消与冷恢复不复活携带意图。PC额外仅移除一个已缓存J牌纹理并延迟该图1800ms，真实资源等待结束后仍携带正确实例入场，未提前激活game。

头脸特写来自原立绘安全裁切，不冒称独立眼神原画。对实际绘制帧检查 scale×framebuffer density≤1；数字和字幕拥有独立文字分辨率，不随图片缩放。修正后再检查字幕/主体/数值留白、效果句只出现一次和主体≥1秒。

| 视口 | 新加载 | 带图选角 | 做牌前后预览 | 头脸特写 | 主体与实际数值 | 最终头像 |
| --- | --- | --- | --- | --- | --- | --- |
| PC | [加载](native/1366-loading.png) | [选角](native/1366-art-selection.png) | [预览](native/1366-selected-preview.png) | [特写](native/1366-skill-0-eyes.png) | [主体](native/1366-skill-1-skill.png) | [头像](native/1366-after-skill-avatar.png) |
| 390 | [加载](native/390-loading.png) | [选角](native/390-art-selection.png) | [预览](native/390-selected-preview.png) | [特写](native/390-skill-0-eyes.png) | [主体](native/390-skill-1-skill.png) | [头像](native/390-after-skill-avatar.png) |
| 320 | [加载](native/320-loading.png) | [选角](native/320-art-selection.png) | [预览](native/320-selected-preview.png) | [特写](native/320-skill-0-eyes.png) | [主体](native/320-skill-1-skill.png) | [头像](native/320-after-skill-avatar.png) |

[320落地镜头](native/320-skill-2-landing.png)；[携带途中的真实加载](native/1366-carry-resource-gate.png)。完整帧与保存快照在 `native/report.json.gz`，精简摘要在 `native/summary.json`。

## 六人、恢复与回归

- 六人选角/说明/HUD/结果与晚到切换，三尺寸正常、390缺完整图和390迟到，共5组；完整报告见 `art-browser/report.json.gz`。代表性截图保存在同目录，其余生成图保留于本地临时输出，不把未保留截图冒称新原画。
- PC/390/320各启动头像404→重试或文字继续，共6组；同时验证详情缩略/完整图缺失后原生重试恢复615×768图、旧失败提示消失，完整保存与冷恢复不变。见 `recovery/report.json`、[320真实145/146](recovery/320-retry-missing-avatar.png)、[320详情恢复](recovery/320-detail-recovered.png)。三档按钮与文字恢复图均可查，不强行填满进度。
- 原 R03 十二组：发牌/B05说明守卫、同名实例、取消、双击、普通立即用/携带/存着、购买/离店/使用保存失败与重试，见 `r03/report.json.gz`。
- 146项加载八例，含弱传输、缺图重试、文字继续、实际缓存与持久状态；加载动画六例含系统/应用减少动态和四倍CPU。见 `loading/report.json.gz` 与 `motion/visual-report.json`。
- 初次缓存样板把说明页DOM图读取与场景纹理fetch混计，保存为 `failures/loading-dom-request-FAIL.*`。最终分开记录请求类型，仍严格检查已解码场景小图不重新fetch；只允许当前选择的正式详情DOM图和按需高清。没有修改产品缓存或预载规则。
- 数值高光的真实输入、已保存来源、字幕持续/不重叠、高清文字和不超采样，另见 `climax/`。
- 全量、构建、内容、计划结构与编译双端烟测，见 `raw/`、`smoke-result.json` 和汇总 `audit.json`。旧方案/旧FAIL保留，不以旧状态作本批签收。

这些是本地软件浏览器与正常首局前段/合法受控分支证据，不能代签物理手机、GPU性能、长期自然经营或整体审美。人物原图此前的用户验收保持，本批不重代签；独立眼神原画没有虚构。下一阶段技能名/宣言/故事按新规范单独推进，规则与旧身份机制继续保持。

最终本地源码 `c2a51b7ebe4a26fd0fdcea8f7ed9e9588a13debf` / src tree `5d8e26e170ce6ab95510165816cc435f67199d7a`：269文件3648全量、8文件39定向、构建/内容/计划结构、正常新局3、六人图像5、缺图恢复6、加载8、R03十二、加载动画6、其它英雄高光6、编译双端2均PASS。主体/数字排布修正后，320原生闭环与其它角色累计倍率镜头已重新实际看图。此前作用域未改的图像/缓存/守卫报告保留各自原SHA，不冒充所有报告来自同一次执行。
