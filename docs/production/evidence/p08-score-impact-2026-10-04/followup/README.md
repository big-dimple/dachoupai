# 得分反馈第二检查点

第一候选51d未获发布认可：5倍图仅base4050外框、数字scale1；竖屏实际最大1.04878。原检查点所有图片/JSON/source身份保持。对原候选补验target/2x、实际1→2→4→1倍速及中途reduced均PASS；原短横0.82→1.177受控图片另存originalCompletion，不冒称爽感解决。

当前基线main `1eb6689000142781daa96d9033319b333bd4a362` 已正常合入，B牌组查看入口/查看器/商店/样式保留。当前实际运行源码 `aab096e3bf95c851eae22408269aa595009a7394`：主数字在原计分板内使用65px竖屏空间、居中加粗，标签上移但不移牌/按钮/手牌；四道固定冲击线不增Graphics/纹理/粒子。正向base首次大档有一次重音和短鼓，260ms复用原460ms落牌阅读时段；逐项来源/分值保持，回看不补爆发，reduced静态。

同一个首次base事件 `run/d43-fire-267/laohuan/hand/run/d43-fire-267/laohuan/command/4/event/0`，数字始终4050：

- [压缩原图](390x740-digits-compressed.png)：frame 170，performance.now 3315.000ms，实际scale 0.740000。
- [实际所见最大回弹](390x740-digits-rebound.png)：frame 176，performance.now 3413.600ms，实际scale 1.338077，即放大33.8%；这是首次base入档，不是后续小项补拍。
- [普通正向首项](390x740-tier0.png)实际约1.27254；[target](390x740-tier1.png)、[2x](390x740-tier2.png)、[短横压缩](844x300-digits-compressed.png)/[回弹](844x300-digits-rebound.png)另存。

9b空间修正版实际压缩图出现墨线贴入数字，建模几何/原生状态PASS而视觉明确FAIL；原图与检查保留在[roomRejected](roomRejected/visual-inspection.json)。当前按safe pieces直接裁物理线段，mask之外也留净空。当前压缩、峰值、普通图已实际查看确认数字清楚；安全裁切后5倍线条只剩外侧短端点，不夸称强冲击。真实手机爽感和扬声器听感待父评审。

60项相关tests/typecheck/e2e build PASS。当前8条有界路线自然202/600/1200/5589、5589演出中1→2→4→1、844中途reduced1200、844数字相位、202快进/回看/刷新PASS；所有演出帧完整run保持已保存状态，对应原候选完整结果相同，eventId不重复，结束/中断后Graphics/mask/音尾归零。另一次组合实际牌组查看开/筛/关、13点数单元、选牌/完整run保持PASS。测试启动探针和证据提取的两次方法失败如实记录，未通过改产品状态或放宽保护消除。

[summary.json](summary.json)记录source、实际帧/事件/scale/guard数据、原图hash、各路线与原始报告定位。第一候选与9b原资料不覆盖。独立review，不推main，不等CI交检查点；整体P08、真机爆发感、GPU/FPS、听感未通过。
