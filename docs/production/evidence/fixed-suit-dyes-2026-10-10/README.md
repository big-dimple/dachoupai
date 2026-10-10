# 固定染色自选：开工合同与有限证据

状态：实施中，未上线／未验收。requirementId沿W3/W5基础自选与已授权染色补充；inputSHA d67ca8379a147e5ccadca018473d69855a9072b6。

依赖：已有基础五选、四染原画、真实选目标／前后对照／购买保存合同。允许文件：src/domain/r2GroupUpgrade.ts、r2Run.ts、r2Shop.ts、r2BasicChoice.ts；src/application/checkpoint.ts（真实4金回执编码的必要边界，原身份2金不变）；src/game/RunLaunch.ts、BasicToolChoice.ts、ShopScene.ts；src/style.css；tests/basic-tool-choice.test.ts、fixed-suit-dyes.test.ts、route-starter.test.ts（仅新局身份hash期望随授权身份更新，原供给断言不变）及本证据目录；harness/screenshot.mjs仅新局身份断言随批准版本更新。计划授权／暂停文化记录独立文档提交。

输出：新内容身份九项自选，原五项2金、四染4金／原优惠最低1；每店一次共用额度／刷新不恢复；PC全展开、手机两组；原染色1–3合法目标、保点／增强／版次及保存不变。旧五选身份保留原池／价格／RNG，必要一条旧局兼容检查，不做大矩阵。随机重复商品沿真实现货入口。

nonGoals：更换世界观／门派名／原画、改变计分／概率／刷新经济／工具目标规则、额外货架额度、新音源、全六角自然旅程或设备验收。stopConditions：发现身份倒灌、价格与支付不符、九项挤压可读性、取消／失败扣款或重复消耗，先局部修而非扩包。

验收：必要规则与保存门禁、PC／手机真实购买→立即使用→选目标→已保存前后对照，完整state/journal/storage同原applyCommand；实际像素看价格、红黑花色、命中与返回。软件证据不签真人观感／真机／听感。最终精确HEAD CI另核，父审协调main。

## 候选结果与边界

核心产品 `48a25ee`；手机五项首屏返修 `cf4d08b`；320重复现货短文案返修 `4a57b19d24f94be883c058c191a53254d44584e5`。最后产品文件与transactions报告源码 `32fed03` 一致（后者为独立计划状态文档），readonly报告源码 `4a57b19`。世界观当前PAUSED_BY_USER；成熟开源仅保留父只读研究输入，未接入。

- 新内容身份quality-r2-basic-suit-choice-v1：九项仅新局启用；旧五选hash与随机工具/RNG保留，旧局重试不迁移。四染原目录4金，原五项2金；每项按既有优惠/最低1实付。原BuyBasicTool资格/容量/重复随机/序号/原子扣款入库/每店一次/刷新不恢复均沿用。编码层只扩新身份的染色回执及命令ID允许集。既有set-suit使用规则、增强版次及目标前后对照组件无改。
- PC1366×768：公开受控当前身份，原UI购买红桃染4金，6→2金，再确认使用三张非红桃。手机390×740同法黑桃染。每笔完整state等于同命令applyCommand，checkpoint含journal有效；购买前取消、分组切换、目标预览及保存回执返回完整state/journal/storage保持相等。每张实际保存牌仅suit变，点数保留；第一张热度纸/闪箔版次仍在，使用不额外扣金、消耗一次。原始完整元组见transactions.json.gz。
- PC九项三列同屏，不把九项堆成翻页；手机改牌5项／染色4项两组，44px选择/固定返回保持。四种符号红黑与已有手绘对应，路线适配沿原公开用途/契合色。1280×720、1920×1080及320×740只读新选择板/分组/完整元组不变，不冒称这些尺寸实际交易。已实际查看1366/390的选择、前后对照及已保存图，1280九项及320两组；1920另只读捕获，没有额外设备/GPU验收。
- 原两张视觉FAIL保留：390新增分组栏挤掉第五项说明→只压紧基础组48×68图窗；320重复现货长文案拉高行→九选内短为同名现货／现货·实际价，旧五选界面保持。旧report仅检查按钮或数据时PASS不能代签实际文字完整，复核以对应原尺寸图为准。
- 原编码FAIL两项4金回执超旧2金上限→按新身份修边界；中间漏加import的11项ReferenceError原log保留，补导入后通过。原生夹具修改初始seq1被opening-state拒绝，改为真实一次RerollShop后控制公开库存/6金预算与一张已有增强版次，不放宽产品校验。1280原harness误假设工具货架已展开→走原PC工具入口，不改原主布局。
- 64定向/typecheck通过；全库一次201文件运行除18条新局hash仍期待旧五选外，其余2960通过，仅更新route-starter的新局身份期望后64定向通过。内容校验/build通过。最终精确HEAD全库CI另核，不借历史绿。无新图／音源／依赖，世界观／命名／倍率／概率／刷新费用不改。

这是有限软件候选，受控手牌/库存与资源不是自然获得率或三路线平衡证明；没有完整旧档矩阵、六英雄自然旅程、真人理解/美术满意、设备流畅度/音频听感签收。check脚本是本保存环境检查记录，不新增生产harness。draft由父审协调main。

## 精确CI旧断言返修

首候选e7e3c073b9b402c68a1a4d78064ae9aeb0fd9871：CI38045255947的domain实际201文件／2978测试全PASS，docs及production-docs38045255946 PASS；browser在screenshot.mjs断言新局仍为quality-r2-basic-tool-choice-v1时FAIL。原日志保留。仅将此新局版本及对应冻结hash期望更新为quality-r2-basic-suit-choice-v1／json-fnv-v1:69c29f5cd54bb160；其余原操作、随机货架、存档、取消断言保留，没有产品规则返修。旧候选浏览器不签通过；最终HEAD新CI另核。
