# 顶部源牌演出：当前基线交付

产品 `c2dcab7f50ff9df2135784d39098da99c9e8657a`，开发分支 `feat/owned-joker-score-motion-20261017`。本批完成顶部纯卡图、间距、内层左右摆动与回弹、来源数值、同一 arrival 主击和同一 Tween 回弹第二声、同层虹彩、左侧帮助入口及中央说明板去框。P08 仍为 **in_progress，未达到整手体验标准**。

## 可直接审阅

| 证据 | PC 1366×768 | 手机 390×740 | 4×快进 390×740 |
| --- | --- | --- | --- |
| 真实画面＋主 WebAudio 输出 | [连续音画](final/pc/av-continuous.webm) | [连续音画](final/phone/av-continuous.webm) | [连续音画](final/fast/av-continuous.webm) |
| 出牌前构图 | [截图](final/pc/selected.png) | [截图](final/phone/selected.png) | [截图](final/fast/selected.png) |
| 乘倍率反向回弹 | [截图](final/pc/multiply-rebound.png) | [截图](final/phone/multiply-rebound.png) | [截图](final/fast/multiply-rebound.png) |

三个 WebM 均包含 VP8 画面与 Opus 音频轨，音轨来自实际 master graph；已核验容器和非空字节。**未进行真人试听，heard=false；未使用物理手机。**

## 验证范围与结果

[汇总](summary.json)、[最终原始报告](final/report.json.gz)、各用例目录中的 `frames.json.gz`、[可重跑入口](../../../../harness/owned-joker-score-motion.mjs)。实际编译应用通过公开“导入本局”载入受控库存，再原生选牌、出牌；未增加产品测试分支，未修改领域、存档、数值、资源或商店。每次最终完整状态与保存命令均和领域 oracle 精确一致。

- PC／390／4×：分别 1340／1335／604 渲染帧，各 13 个真实收益事件；普通、加倍率、乘倍率均覆盖。每个事件唯一主击、唯一回弹、实际两侧摆动、外层命中槽稳定、局部光效无重复，计分音声部不超过 6。主击到回弹实际间隔分别 76.9–115.3／80.8–120.0／63.9–81.6ms；这验证局部双拍，并不证明整手乐句成立。
- PC：hover 稳住、就近详情、键盘方向键／Enter／Escape、鼠标长按双向调序；390：点按详情、真实 touch 长按双向调序。两端帮助入口／Escape 保持状态；调序后按新 commandSeq 重算 oracle。
- 蓄势取消／回弹取消：原生“快进当前手”；随后“回看上一手”不发任何 cue、主击或回弹，不改保存状态。边界库存仅保留真实 f09、单张出牌，以正常 await-input 阶段验证回看；没有调低目标或改规则。
- 后台清理：headless 切新标签仍报告 visible，故明确使用**合成 visibilitychange**触发现有清理；当时声部为 0、姿态归位，随后回看静音。真实设备后台仍待验。
- 真实 Scene 在主击中销毁：声部为 0、Scene inactive、jokerViews 清空，保存状态不变。
- 虹彩每次都挂在 `owned-joker/score-pose`，与同一内层牌运动；PC／390／4×均观察到连续相位更新。

较早 `b040d104` 同一动作／音频版本已通过 [320×568](previous-display/small/selected.png)、[844×390 短横屏](previous-display/short/selected.png)、[减少动态](previous-display/reduced/selected.png)，分别 1331／1329／259 帧、各 13 个事件、状态精确一致。其[原报告](previous-display/report.json.gz)整体仍保留后续旧菜单文案导致的 FAIL，不能将整份改签 PASS。其后 `c2dcab7f` 只修复静止边框清除及移除未用 import，没有改布局／时钟／音频；这三项未在该收尾提交重跑。

最终报告头记录构建时 HEAD 为 `b040d104`，当时上述边框修复尚未提交。构建时记录的五个产品源码 SHA-256 与 `git show c2dcab7f:<path>` 经 LF 归一化逐一相符，见汇总 `compiledSourcesMatchProduct=true`；没有重写原报告的 HEAD。终版重新完整构建，未复用有缺陷的录像提取器。

定向验证：核心相关 96 测试通过；音频／虹彩整合 48 测试通过（`owned-joker-score-motion`、`polychrome-iridescence`、`score-melody-audio`、`score-recorded-audio`）；typecheck 多次通过。最终实际应用用 Vite e2e 模式完整构建成功。没有等待 CI、部署、长局或自然获取验收。

重跑：在仓库目录设置 `PLAYWRIGHT_BROWSERS_PATH` 指向已安装浏览器，运行 `node harness/owned-joker-score-motion.mjs`；默认覆盖十项。`OWNED_MOTION_CASES=pc,phone,fast,cancel-windup,cancel-rebound,background,destroy` 对应本批最终七项，`OWNED_MOTION_OUT` 可指定新证据目录。Windows Vitest 本批用仓库 `.vite/test-temp` 作为 TEMP／TMP，绕过沙箱默认临时目录的 EPERM。

## 版本与诚实边界

保留刘娥 `387c2ea8`、AI `8cf3b922` 及 `24285a60` 依赖。声音完整纳入 `8a9b3d99`＋`6609f4f6`；虹彩仅取 `176dfb8e` 最终组件／测试，不复制 ShopScene。`20004d8e` 首段与 [early](early/report.json) 证据用于保留构图演进，非最终音画签收。开发分支包含这些依赖，整合时不能只取最初动作提交。

[早期失败记录](initial-failures.json)保留 localhost 沙箱、资源路径、旧菜单标签、探针判定、录像 data URI 分割与原生标签可见性不支持等事实。无效 7 字节录像不作为交付；本页链接均为最终有效文件。

当前没有整手导演编排：还是串行事件与局部关键帧双拍；`scoreStrikeStep` 的 ordinal%3、普通／乘法时长覆盖与动作最短时长不能表达整手起势、连发弱拍、关键重拍、收束。下一迭代需在不改算术／事件顺序下共享动作、声音、材质、光影的起势／连发／关键重拍／收束时钟，不能由音频另开 timer。程序透视、弹簧惯性、反光／光照与触碰重量也尚未完成；现有轻旋转／非均匀缩放／影子／虹彩不等价于这些能力。

后继 pending：大立绘 `3a0984cf`、c12 `9c3db534` 的 GameScene 接线；非 H/M 系数成长临时弹字目前沿用 `event.value`，尚未按 saved before/after 转换为真实差值，本数字来源用例没有覆盖；真实手机后台、真人听感与整轮体验。新加坡分支按用户要求等待通知，本批不吸收。长期原则见[战斗空间与演出合同](../../OWNED_SCORE_EXPERIENCE_20261017.md)。
