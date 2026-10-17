# 六英雄真实扑克牌目标持续附着

基线 `e82c7df8d3e004cb9ad5a86b27389496d397b2ad`；分支 `dev/hero-target-attachments-20261017`。苏轼优先提交 `e34a9330a94a24ea70c433674b5dfacfa1ccab78`，六人基础产品 `f0deb61c3a0db50321347e6c94537957a0c088c9`，最终秦琼窄标签修正产品 **`614e10e7dba186a75819669e1f6a6fbba3a82028`**。只提交开发分支，交 root 顺序整合；未操作 main、CI 或域名。

目标语义依据 [功能 owner 的目标合同](https://github.com/big-dimple/dachoupai/blob/8a1d8d6b5ad718cd08af78e08d966980eed19c32/docs/production/HERO_CARD_ATTACHMENT_TARGETS_20261017.md)。复用刘娥既有 `HeroTargetAttachment / HeroTargetAttachmentState`，只扩充真实实例集合、整手括号与已保存事件投影；GameScene 是局部接线，未改 ShopScene。扑克牌自身的 hover/拖拽姿态、源牌导演时钟、计分等待与原画资源保持原样，没有新增规则、倍率、稀有度、存档字段或 RNG。

## 实际目标与动态覆盖

PC 为1366×768 DPR1，竖屏为390×844 DPR2/touch。每格均含静置超过3.3秒、无输入持续流动、实际保存命令、实际兑现过程、OS减少动态、隐藏返回与最终清理检查。视频包含完整过程，PNG只作定位。

|英雄/技术ID|持续附着和真实兑现|PC过程|竖屏过程|
|---|---|---|---|
|苏轼 / amo|原生选4张主手并按技能快捷按钮，K♠/K♥副组出现双侧短边与流动边缘；原“主/助”标记保留。原两张实例进入结算区，在实际 `amo.assist.pair` impact 才兑现。普通主手及另外两张手牌不误带附着。|[视频](1366-amo/process.webm) · [待出](1366-amo/pending.png) · [兑现](1366-amo/release.png)|[视频](390-amo/process.webm) · [待出](390-amo/pending.png) · [兑现](390-amo/release.png)|
|刘娥 / erxiang|只跟随所选8♠，待转→结算原实例→已保存 `erxiang.handoff`；相同点数8♥不误挂。|[视频](1366-erxiang/process.webm) · [待转](1366-erxiang/pending.png)|[视频](390-erxiang/process.webm) · [待转](390-erxiang/pending.png)|
|文成公主 / azao|实际命令积蓄1层后，明确释放合格两对；只画一个主手括号“本手待放”，在 `azao.multiply-multiplier` 兑现，不伪装单牌加成。|[视频](1366-azao/process.webm) · [括号](1366-azao/pending.png)|[视频](390-azao/process.webm) · [避让标签](390-azao/pending.png)|
|花蕊夫人 / xiemu|明确选10金档、合格两对且余额足够；“待付10”→保存后“已付10·待算”→实际 `xiemu.multiply-multiplier`。一个整手括号，无预扣或自动降档。|[视频](1366-xiemu/process.webm) · [待付](1366-xiemu/pending.png)|[视频](390-xiemu/process.webm) · [避让标签](390-xiemu/pending.png)|
|秦琼 / touye|真实押三条并弃牌后的2张 `commit.refill.refilledIds` 标“新·待判”（窄位“新?”）；成功只保留参与有效核心的梅花8，在 `touye.won.*` impact 兑现，另一新牌方块6不冒领。|[视频](1366-touye/process.webm) · [待判](1366-touye/pending.png)|[视频](390-touye/process.webm) · [按钮避让](390-touye/pending.png)|
|辛弃疾 / laohuan|实际弃5张产生7张已保存候选；选满5张才显示“待留”，真实 `ChooseRefill` 保存后只对进入手牌的这5张短暂显示“已留”，绑定命令回执，不创造 ScoreEvent。|[视频](1366-laohuan/process.webm) · [待留](1366-laohuan/pending.png)|[视频](390-laohuan/process.webm) · [待留](390-laohuan/pending.png)|

苏轼使用真实牌桌点击、技能快捷按钮、出牌按钮，本样例快捷按钮直接选定合法副组，没有覆盖弹窗手选（原始报告scope里的泛称dialog不能当作已实测）；其余五人的合法草稿由脚本设置 Scene 选择，再走现有真实保存和演出方法。补牌、蓄层和押注来源均经实际领域命令建立，checkpoint通过正式校验并从公开菜单导入。这是 **GameScene目标接线与显示验收**，不能替代功能 owner 的全原生技能输入回归、自然获取或完整对局验收。

## 动态、边界与清理证据

[report.json](report.json) 汇总12项通过结果；每项保存4个无输入时间样本、真实事件ID/impact阶段和目标实例集合、标签与原控件矩形、减少动态结果。牌外9px带按RGB差值>5比较，排除印刷牌面与原有控件；普通卡实例必须完全不在附着集合中。

|目标|PC流动像素差|竖屏流动像素差|减少动态像素差（两端）|
|---|---:|---:|---:|
|苏轼|1947|751|0 / 0|
|刘娥|868|585|0 / 0|
|文成公主|997|968|0 / 0|
|花蕊夫人|1016|973|0 / 0|
|秦琼|1402|136|0 / 0|
|辛弃疾|4114|1112|0 / 0|

各目录 `pending-start.png / pending.png` 是同一次静置首尾原始画面；`process.webm` 是连续录屏。`reduced.png` 保留静态边缘和语义标签；秦琼、辛弃疾竖屏另有 `reduced-start.png` 原始对照。12项标签与技能/道具箱/出牌/弃牌/理牌控件均无交叠，原有点数、牌面和原画未被新效果遮挡。标签只调整自身位置，不移动牌或控件。

每项都验证隐藏立即移除附着和飞行，返回仅恢复 idle、不补播来源飞行；苏轼/刘娥另检取消草稿即清除。实际保存后，领域 state 与按真实 journal 命令重算的结果完全相同，journal只增加1条；预览期间 state/journal/storage逐字一致。完整演出后无残留，模块destroy与Scene stop后无 `hero/target-*` 对象。单一update监听限15Hz重画，减少动态不重画流线，无新增纹理、粒子或持续tween。

静态像素检查中途发现取样污染：最初把原出牌按钮的呼吸边缘算进秦琼未抬起牌下方9px带，出现108/105个差异像素。[原始完整批报告](report.full-attempt.json) 与 [保留原图的诊断报告](report.mask-diagnostic-attempt.json) 原样保留，不能称第一次全过；[诊断首帧](mask-diagnostic-start.png)/[末帧](mask-diagnostic-end.png) 的全图差异仅在 x263..381、y752..817 的原按钮周围。排除原控件及其6px外沿后，仅重跑剩余秦琼/辛弃疾两项竖屏，[报告通过](report.portrait-tail.json)，期间没有修改产品源码。初次肉眼发现的窄屏组标签/未抬起新牌标签压按钮问题已在产品中修复并重新验证。

最终兑现截图另外发现秦琼窄标签仍把成功文本缩成“新?”，已修正为成功“已成”、失败“未成”。[修正前画面](qin-caption-before.png)保留；只复查受影响的秦琼两端，[真实兑现帧断言与报告通过](report.qin-caption.json)，目录内秦琼视频和图片均为此次修正后结果。其余10项沿用未受该条件分支影响的六人基础产品证据，没有重跑无关矩阵。

基础浏览器运行时真实HEAD是 `e34a9330`，秦琼最终复查时真实HEAD是 `f0deb61c`，当时均包含对应未提交产品源码；原报告不改写执行HEAD。[基础source-binding.json](source-binding.json) 与 [秦琼修正source-binding](source-binding.qin-caption.json) 分别将当时4份产品源码原字节SHA256与对应产品提交逐一核对，并显式记录Git换行规范化。汇总逐项记录实际对应product，全部绑定通过，未把基础版本10项伪装成修正后重跑。

## 检查与明确未覆盖项

- `npm exec vitest -- run tests/hero-target-attachment.test.ts tests/hero-attachment-facts.test.ts`：2文件17项通过，含真实六人命令结果、精确实例/错英雄拒绝、失效回调/abort、减少动态、主手付款标签时序、赢局核心收窄与输局“未成”/无假成功归属。
- `npm run typecheck`、最终 `npm run build`：通过，346模块；保留既有大chunk提示。`git diff --check`通过。
- `node harness/hero-attachments.mjs`：最终12项覆盖，原始完整批10项通过后停在被原CTA污染的静态采样；纠正采样后用 `HERO_ATTACHMENT_CASES=390-touye,390-laohuan` 完成剩余两项。最后秦琼窄标签修正只用 `HERO_ATTACHMENT_CASES=1366-touye,390-touye` 回归两项，其余不重复，详见上述原报告和汇总。
- 本批实际演示苏轼对子副组、刘娥单牌、文成1层、花蕊10金、秦琼三条赢局、辛弃疾7选5。苏轼三张副组、文成2/3层、花蕊20/30金和秦琼输局未做本批浏览器演出；花蕊20金标签与秦琼输局仅做窄测。未冒称全档位原生输入、真机、主观听感或真人理解验收。

P08保持 `in_progress`，本批不解除C04/V01/L01等正式门，不改变用户已批准原图字节，不写整体完成百分比。
