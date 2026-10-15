# 《唐宋牌》六英雄品牌与资源接线

品牌任务保存在 `/workspace/dachoupai`，独立分支 `dev/tangsong-brand-cast-20261015`。基线 `d31df43d615e358542661a4a01f41feac071928b`；验证头 `0097a5a1a30b56a520775358e0e301ab514dc4de`；产品源码最终提交 `c469d25485f293a4c7b488fdc929be8bef0e0b7f`，两者 src tree 均为 `7a71856a6801fee71f69bcc37f6559d4b8eb8836`。后续交付提交只补本文、AGENTS 和证据，没有重做/丢弃产品修改。

先前终报 `6be7ecbc737fea108cbbd1ab762d382850ada0c3` 对应另一工作区 `/workspace/growth-display` 的 `fix/growth-display-semantics-20261015`，基于4d2ff；它不属于品牌交付，未合入本品牌分支。推荐2aa1与f10 consume-rescue说明缺陷均不在此任务修改中。

## 实际代码与最终映射

- `src/game/Brand.ts`：游戏名《唐宋牌》与页面说明；`index.html`、`src/main.ts`、TitleScene与GameScene读取显示品牌。
- `src/game/HeroIdentity.ts`：六个玩家显示身份、青年简介与创作台词；characters/HeroOpeningCopy/HeroExplanation 接线。展示层有界替换旧角色称呼，保留技术ID、保存规则及卡牌/舞台的普通词语（如“逐个谢幕”）。
- `src/game/CharacterArt.ts` 与 `public/assets/cast-placeholders/manifest.json`：18个独立 avatar/selection/portrait 资源，严格同ID/key/URL、尺寸与SHA256。旧手绘目录和manifest原字节保留，活跃人物资源使用明确标注“人物图待交付”的姓名SVG。
- 选角、详情、HUD、结果、来源高光、可访问名称均接新姓名；四字名独立占手机HUD第一行，技能状态另行；旧B08内部角色词仅在展示边界适配，领域对象未改。

| 原技术ID | 最终显示名 | 性别 | 当前机制保持 |
|---|---|---|---|
| amo | 苏轼 | 男 | 副组助攻，真消费 |
| touye | 秦琼 | 男 | 押注换牌，实际成本与新核心条件 |
| laohuan | 辛弃疾 | 男 | 多看候选，自选补牌 |
| erxiang | 刘娥 | 女 | 首次普通点数转倍率 |
| azao | 文成公主 | 女 | 换型蓄势/释放 |
| xiemu | 花蕊夫人 | 女 | 留钱收息/10、20、30金燃金 |

六人均为架空青年形象，郭子仪不在名单。台词为游戏创作，不伪称历史引文。先前美术草案的四男两女按历史读取，当前以本表/HeroIdentity为准。

## 按同版已有验证交付

没有重跑已经通过的整套检查，先核对下列原始日志、报告与当前干净0097 HEAD/source tree一致；随后只补证据与交付文档。

- [tests](tests.txt)：263文件、3585项通过；[typecheck](typecheck.txt)、[生产build](build.txt)、[content](content.txt)、[plan](plan.txt)通过。生产构建保留既有大chunk提示，不冒称云CI已绿。
- [原生浏览器报告](browser/report.json)：1366×768/DPR1、390×740/DPR3、320×640/DPR2正常，以及390缺图、390迟到，共五组PASS。每组逐一原生切换六人、查看青年简介与真实技能代价、检查姓名与canvas aria。三组正常逐六人核验HUD和结果；缺图/迟到重点核验文成公主、花蕊夫人HUD。
- 真实新建文成公主局到首店；其他HUD/结果为验证器批准的受控checkpoint导入，结果由原PlayHand命令构成。详情开关完整state/journal/storage不变，未进行自然试玩、不代签物理手机或玩家理解。
- 每组旧人物脸资源HTTP请求为0；缺图时显示姓名/字形回退，名字保持；迟到组在冷资源时先切苏轼→文成公主，最终实际texture `opening-portrait-azao`，未串回旧角色。手机姓名/技能与金币/目标边界核验通过。
- [高光summary](climax/summary.json) / [完整报告](climax/report.json.gz)：PC普通与390快进燃金2组PASS，原生技能/出牌、原结果与完整state/journal/storage/localStorage/冷恢复保持；持续字幕写明花蕊夫人和“人物图待交付”，原时长/规则保持。
- [18个占位资源审计](placeholders.json)：实际SVG解码、尺寸、字节、SHA256与标注通过；这是排版占位审计，绝不是新人物立绘/眼神完成证明。
- [保护树](protected-trees.json)：domain/application/content/platform/core/audio、原handdrawn-p08、.github、package-lock与d31逐对象相同。技术ID、数值、保存键/格式与RNG未改。ShopPurchaseValue文件不在该基线中，未添加推荐文件。

已实际查看并归档：[PC标题](browser/1366-normal-title.png)、[PC选角](browser/1366-normal-selection.png)、[PC结果](browser/1366-normal-result.png)、[320文成公主HUD](browser/320-normal-azao-hud.png)、[缺图选角](browser/390-missing-selection.png)、[迟到切换](browser/390-late-switch.png)、[390花蕊夫人技能高光](climax/xiemu-390-fast-shot-1-skill.png)。这些是软件浏览器受控画面。

## 提交与未完成项

已有四提交顺序及完整SHA见 [provenance](provenance.json)：d0d490cc为品牌/人物/资源实际接线，389be653补持续待图标注，c469d254补B08展示边界，0097a5a1强化冷资源迟到归属检查。工作区原有修改均已保存为这些提交，没有重置或挪入成长分支。

首轮25个旧姓名/旧WebP期待及未挂载测试场景的格式化调用失败、随后残留旧技能名期待、布局类型错误均保留在 [failures](failures/)。已修正展示接线/必要测试期待与挂载守卫，最终3585通过；既有机制和保存断言保持。

正式六人新立绘、独立高清眼部素材及其美术/眼神验收仍待交付。现在只有姓名SVG待图占位；旧戏班脸未当作历史人物像，旧图归档保持。美术到齐后需逐ID补正式资源与manifest，另验新图，不在此报告预记完成。未合main、未部署、未创建PR；父持有d31的CI38724687012，本分支未重复触发或借该CI作为自身结果。
