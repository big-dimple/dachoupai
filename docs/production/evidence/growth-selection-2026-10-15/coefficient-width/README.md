# 独家戏成长系数：五槽首层宽度补正

承接 `e5279f4a27534c789c3d86d3770f7f2c098e9906`，产品/测试/观察器提交 `ce6905e7acaff8f3c6e948580f20f8101f6eb7a0`；仍在 `fix/growth-selection-semantics-20261015`。只改变首层候选文案，不改变精确label/body、实际系数或计分条件。

## 实际缺陷与补正

[修改前报告](before/report.json)与原图保留：手机选牌后1587/800、36501/16000及1000000均退为“状态 ›”；封顶在空选牌时也回退；PC三次成长同样回退。该报告记录e5279f4及未提交的新观察器，产品仍是e5279f4。

新增共享首层候选，复用现有BigInt舍入：不能精确表达时保留“≈”，使用两位小数优先、一位小数作为窄框候选；较大数按千/万表示。1000000可精确表示为100万，因此不加近似号。JokerExperience的选牌候选与JokerMemory的空选牌候选都使用该函数；完整详情和已存精确值继续使用原fractionText。没有缩字号或压扁文字。

| 存量 | 手机空选牌 | 手机选葫芦 | 实际文字宽/可用宽 | PC选葫芦 |
|---|---|---|---|---|
| 1587/800 | ×≈1.98 | 读×≈1.98 | 58/58px | 本手×≈1.98 |
| 36501/16000 | ×≈2.28 | 读×≈2.28 | 58/58px | 本手×≈2.28 |
| 1000000 | ×100万 | ×100万 | 46/58px | 本手×100万 |

## 实际验证

- [46项、6文件针对测试](tests.txt)、[类型检查](typecheck.txt)、[构建](build.txt)、[32包计划检查](plan.txt)通过。测试/类型/构建启动于产品未提交阶段，源文件字节与ce6905e7一致；不是完整回归CI。构建保留原大bundle提示。
- [浏览器报告](after/report.json)在洁净ce6905e7启动，src/tests/harness全文件指纹前后相同。Chromium151、实际Phaser软件Canvas：1366×768/DPR1与390×740/DPR3，每端三个存量值、五槽。严格合法checkpoint通过原菜单导入，原生选牌、打开/关闭所选条件、取消选牌、选择对子；无自然试玩，无浏览器出牌。
- 六行完整详情文字与修改前逐字相同；本手精确详情仍分别是倍率×1,587/800、×36,501/16,000、×1,000,000。空选牌/选牌/取消/对子均保持原14px、scale1、bounds不越标签框与屏幕。对子仍unmet/本手不读取；停用候选由单测确认保持计分停用。
- 原生交互前后完整state/journal/export/IndexedDB逐字段相等；针对测试另外提交真实PlayHand，三种系数的read-coefficient trace均等于原分数。该分数夹具是受控存量，不声明自然达成率或平衡验证。
- 六张修复后selected原图和手机三次成长detail原图已实际view，字形/数值可读。全部前后完整PNG留在before/after目录；pageerror为0。不签实体手机、GPU、听感或自然经营。
- [保护树](protected-trees.json)与e5279f4相同：domain/application/content/platform/public/art/样式/锁文件及scoreText；数值、规则、保存、RNG没有改动。

## 兼容字段与交付边界

starterReady/starterLabel仅保留旧观察器接口兼容，表达路线新增成长事实，**不是本手计分资格**。本手读取以selectionReadiness/selectionLabel及scoring分层为准；该补正不修改这些字段或GameScene。

没有合main、部署或重试此前Forbidden的PR创建。远端精确SHA/CI由最终交付回复报告；本地检查不等于远端CI成功。先前16张成长牌的规则核对及出牌/恢复证据仍见[上级报告](../README.md)，本次只补六个系数宽度窗口，不重签完整试玩。
