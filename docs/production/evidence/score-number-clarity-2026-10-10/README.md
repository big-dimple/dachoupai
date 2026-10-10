# 中高分连乘来源：有限组件修复证据

2026-10-10，6.1 Medium串行。产品基线main `8c61eac1a16a85c88f6568544bf364d56b46db1d`；首产品 `b83c8eff5bb23416fb8396af91772d935c07bd93`；最终产品 `92388474e50e6cc34b3b0e9664e54d444dc93b25`。最终文档HEAD与CI由draft PR收据另核。未合main，部署/真人设备验收交父协调。

## 观察与最小修复

PC1366×768及手机390×740 DPR1，复用仓库既有 `harness/fixtures/finale.ts` 的 `finaleReady`：合法旧身份受控存档、末章关卡、等级30同花五条、已有20张相同增强牌。通过原生导入、选实际五张、真实PlayHand得到 `5,480,485`，H=`2160`、M=`649539/256`、10次真实×1.5事件。不是自然获得/正常可达/玩法平衡证据，不为此创造新领域状态或伪造最终分。

- 基线PC实际来源把99→148.5截成“99→1…”，且长分数挤压连乘前后因果。手机此早段可见。
- 首修b83c8ef虽然领域脚本PASS，但PC末段仍有4个caption截断，视觉FAIL；`after`原报告和图片保留，不能用脚本PASS覆盖。
- 最终9238847只改真实乘法来源摘要：名称/×因子/前→后，PC≥100且过长的小数采用带≈的一位概览，手机非终止分数为两位概览。精确有理数始终保留在保存trace、既有H/M/公式和绑定事件ID的metadata。PC末段“多彩·A♥ ×1.5 ≈1691.5→≈2537.3”完整，手机为≈1691.51→≈2537.26。
- 主分和公式沿现有字体/纸墨/克制金色，观察到PC主分54px、390主分39px；未换字库/配色/美术，不宣称这些是本轮新改进。现有数字字体来源/授权见 `public/assets/fonts/score/README.md`、OFL.txt，三文件hash见existing-font-sha256.json。

## 结果和限制

`proof.json`汇总实际事件文本及原始报告身份；各目录 `report.json.gz` 为完整JSON无字段裁剪。最终PC/390初始和最终**完整state、journal、storage**逐字段与基线相同，所有实际乘法caption文本与fullText相等；全部最终状态与既有energySend真实命令结果相同。320低动态及390菜单“快进当前手”仅必要边界，仍与相同命令最终状态一致，不重复奖励。17个必要测试/3files、typecheck通过，日志保留。

执行者当时观察手机最终 `final/390-award.png` 与 `phone-late/390-late-award.png` 时疑似累计热度缺“2,160”，此前误写成已确认的“两次缺字截图”。2026-10-10父独审及本次原尺寸PNG复核确认：**两张已提交原图均清楚显示“2,160”**，对应报告的text/full/bounds/alpha也正常。该疑似缺字无法复现或证实，不能据当前提交字节断言产品缺陷或软件捕获异常。未找到可证明缺字的另一份原始图片，不能捏造不同来源。保留当时疑似观察及勘误，不改原图/原报告，不为该未证实问题改图层或数值。`phone-debug/390-late-award.png`、heat-canvas.png及layer-diagnostic.json同样正常；这不代替整体动态/设备验收。首诊断因序列化完整Phaser style循环引用失败，随后仅保存字段修正观察器、产品源码没改；原失败JSON未生成、日志被同一路径后次执行覆盖，仅此明确记录，不能冒称原日志完整留存。

这是软件Chromium Canvas（GPU禁用）短截图与事件观察，不测FPS、不听音频、不录长片。不是用户Edge/PC/手机真机通过，不签六英雄爆发、整段动态观感、自然八章、高分可达、整体W4/W0–W9。英雄爆发仍接此前真实来源演出包，本旧被动身份样本不新增该验收。30/80、原演出时槽/快进/低动态、领域/资产/音路均不变。

## 复查

记录器为执行原样，使用该云环境 `/workspace` 路径和系统Chromium；`NUMBER_ROOT`选择产品worktree，默认baseline worktree。脚本有限同组重复：before/after/final双端，boundaries两端必要模式，phone-late和phone-debug各一笔同390；不是长期自然局。原baseline/after脚本的过程版本未单独保存，最终脚本不能替代原报告的字段和原source。不要把后加caption断言倒称基线已有。

用Python gzip/json读取report；比对initial/final完整对象、expected与实际state，读proof事件full/overview/exact。manifest.json覆盖除自身之外所有已暂存Git blob；CI需精确最终HEAD testedCommit和protected-tree before/after另核。首章自然Touye与W5染色待定分析已独立承接，见DELIVERY_PLAN末尾；不实现染色、不改其原失败/历史状态。

## 证据勘误字节身份

本次只复核原文件，没有重跑产品回归或重新截图。原HEAD `af9a71ad3da42a52c042a5dda626f05916339e65` 的两张PNG与当前工作树逐字节相同：

- `final/390-award.png`：SHA256 `49744851834ccd5d10f2b7a14648e242ab2b49004c78b4c30f318806f045ace1`；Git blob `e9c90e63428894b3af8034402c81f1bf99542070`。
- `phone-late/390-late-award.png`：SHA256 `7413e576e7e30d7bcd8bcd9dab0b7ab93413a70d9eae35cac1fb379cf3a4794b`；Git blob `f4aad6b517be8b26ed50edce5ebf2ef9b63d19cd`。

父独审及本地复核：before/final/phone-late/phone-debug四张390-award原图的热度区域RGB裁切（x50..115、y194..222，端点含在内）逐字节相同，SHA256 `203c8cc6dc206c09e240f7ecf6db71a86a231f98f8ec48d07cc74f707688bb70`，均清楚显示2,160。首次本地复算误用不含右/下端点裁切，改为父审范围后hash匹配；这是裁切范围校正，没有改图或重跑产品。仅核对现有像素，不签全段/实机。
