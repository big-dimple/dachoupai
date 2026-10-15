# 第四批开发集成：唐宋牌美术契约与角色资源接线

从 `ab690f20c3c55cb61cf45d5628bea5e66adf48b3` 继续 `dev/astra-integration-20261015`。远端美术分支 `dev/hero-art-contract-20261015` 实读与指定来源一致：`ce2239586f0220f29d3ed3c87b1ebbf957e772f3`。完整正常合入，产品与本轮验证提交为 `2f845a11d3a92e1016db02be0e1f37837f002d71`，src树 `319a00327ec13e4b7dda0d2b73576c2301f4bcd0`；本证据提交不改产品/测试/观察器。

## 合并与保留

来源完整历史包含统一资源key/URL、精确尺寸拒收、技术验证器、交接合同及最终《唐宋牌》年轻成年四男两女/精致手绘漫画方向，没有只取末尾文档提交。没有生成或接入新人物原图，当前运行脸仍是旧过渡资源；新题材和美术决定不是已上线事实。

[merge-art.txt](merge-art.txt)与[provenance.json](provenance.json)记录两处文档冲突和处理：AGENTS保留来源最新《唐宋牌》美术入口，同时保留当前已批准实施的S04回执；DELIVERY_PLAN的三处美术冲突采用最新轮廓/色彩/人物规范，原S04实施、既有顺序和其他集成内容保留。没有整文件选一方覆盖。

产品代码自动合并。HeroClimax相比ab690f20只新增portraitKey import和heroKey选择，独立三方组合字节核对相等；持续字幕接线、文本生命周期、等待/时槽/快进与旧来源语义保持。GameScene、ShopScene、HeroClimaxCaption、Haptics、domain/application/content/platform/audio、public资产、CI配置和锁文件均与上一集成逐对象相同。

## 本轮最终同版证据

所有新软件及浏览器检查均运行于洁净2f845a11，sourceTree相同，没有使用来源分支的旧PASS签当前集成。

- [全量单测](tests.txt)：262文件、3581项通过；[资源验证器25项正反例](validator-tests.txt)通过；[typecheck](typecheck.txt)、[build](build.txt)、[content](content.txt)、[计划32包](plan.txt)及diff-check通过。构建保留既有大bundle提示。
- [18张现有资源审计](assets.json)为PASS_CURRENT_TECHNICAL_ONLY：实际文件尺寸、格式/预算/哈希与manifest对应。finalYoungAdultArt=false。12原图/24新输出的incoming合同由验证器正反例检查，不冒称这些新图已制作、图审或接入。
- [PC报告](art-pc/report.json)：1366×768/DPR1，normal与wrong-size两例PASS；[手机报告](art-mobile/report.json)：390×740/DPR3的normal/missing/wrong-size/late/avatar-only/name-only六例及320×640/DPR2 normal共七例PASS。实际rendererType=1（软件Canvas），角色选角/详情/商店/牌桌/高光按同ID映射；wrong-size立绘不进入纹理缓存，合法同ID缩略仍可用；迟到图不覆盖切换后的角色；头像/姓名回退保留操作。
- [新证据复核](evidence-check.json)：9例、53张原PNG完整解码、5笔完整state/journal/存储回执均PASS；每笔与权威结果相等、只追加原命令一次、revision+1、previous保持。所有53张原PNG和5份完整状态gzip均保存在本目录，可以离线重跑校验器。
- [持续字幕双端](captions/summary.json)：PC1366正常燃金、390/DPR3的4×燃金原生技能/出牌、保存/冷恢复、实际来源文字跨镜头与独立scale1文本均通过。完整postrender与事务保留gzip，没有移用前批旧源树记录。

实际view本轮PC normal高光、390 wrong-size详情（同ID缩略回退）、390 normal选中谢幕人、390/DPR3持续字幕首镜头共四张整屏。53张均技术解码不等于逐张人工图审。

角色资源观察器在postrender strike后sleep/wake短暂停循环截图，随后通过原生4×/菜单快进结束并对完整保存；仅证明该帧资源/回退/保存事实，不将静帧作为普通速度连续时长或真人阅读证据。持续字幕另外使用真实postrender观察器；不声称物理设备、GPU、听感、自然经营或整体美学通过。本轮没有出现新的产品/观察器FAIL；来源历史FAIL完整保留，不改写为本轮PASS。

复核本目录完整证据：

```sh
node harness/verify-hero-art-evidence.mjs docs/production/evidence/astra-integration-2026-10-15/wave4/art-pc docs/production/evidence/astra-integration-2026-10-15/wave4/art-mobile
```

## 最终开发分支与CI边界

现有ci.yml保留workflow_dispatch，push过滤没有dev/**，没有为本任务改触发配置、权限或预算。按用户本次明确授权，最终证据提交并push后，仅经现有gh workflow run入口尝试一次对dev/astra-integration-20261015触发；若被拒则立即停止CI操作，不换入口、不重试Forbidden PR。实际命令结果、最终head_sha与是否存在run由交付回复报告，不能把本地通过称为远端CI成功。上一批ab690f20已查明没有Actions run，无PR，未称作排队。

本批只整合开发分支，不合main、不部署、不改机制/技术ID/仓库/存档键。新年轻人物、独立eyes运行接线及完整《唐宋牌》视觉替换仍待原图/图审/接入任务。
