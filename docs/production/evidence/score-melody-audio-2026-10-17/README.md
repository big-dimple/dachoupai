# 数字计分真实音阶：音频独立修复

基线 `212e23d547d4fcfdd886f9dfe80699318e77a738`；产品 `a084af1f1e29386f74ba830f460896fdefedeb67`；独立分支 `dev/score-melody-audio-20261017`。只改3个音频模块及4份必要测试；GameScene、视觉计分、规则/数值/存档、素材、BGM与偏好均未变。仅dev普通push，交父级合批。P08仍in_progress。

## 这次根因与修复

已先读[旧八档修复证据](../audio-lifecycle-regression-2026-10-17/README.md)与[原断言边界](../singapore-audio-integration-2026-10-17/README.md)，不把旧速率通过当成本次听感通过。当前八档确实进入AudioBufferSource，未再次被1.4截平；主要问题是**轮换采样本身的基频不同，抵消/逆转升调**，以及乘法重击低频主导、到首个乘法时序号从牌档回落。

修前木敲000约325Hz、001约290Hz：第二次乘1.12后仍约320Hz，第四次反而从400回到385Hz。乘法在本次100–4000Hz分析范围的主峰贴近100Hz下沿，不能把这写成精确的100Hz基音。旧Scene传的是multiplyOrdinal+1，牌档1.35之后首个乘法回1.12。声音接口已经接到正常数字arrival，未发现这条路径没触发；得分声逐层使用独立AudioBufferSource，不是共用播放器覆盖。

数字到达改用同一现有CC0铃音003作明确载音，木/纸只留较轻纹理；加法、关键加法、乘法分档，乘法载音.042与短身体层，相比普通载音.030更强，仍守原混音与声部预算。采用0/2/4/5/7/9/11/12半音的相对大调音程，从已保存的正向H/M事件顺序读取整手档位，牌→Joker→英雄不重置；第八档后保持一倍八度上限，新手第一条重新起音。不添加振荡器、合成BGM、外部音源或版权采样，使用[既有CC0清单](../../../../public/assets/audio/foley-v1/sources.json)，没有新增运行时音频文件。

数字事件gap为0，避免有效4×节奏被旧.20s关键音节流吞掉；同事件去重、静音/后台/缺音频不补播、取消、16个重叠声部/32保留节点和原通用输入节流保持。旧rounded chainRate仍用于材料/UI接口；**数字音程/音色/声部断言本轮明确更新**，不称旧断言原样通过。

## 短实际事件音频与参数

[修前WAV](before.wav) · [修后WAV](after.wav)，各3.56秒。使用已有受控合法PlayAssistedHand生成的真实保存trace→numberImpact→实际AudioEngine→真实OfflineAudioContext及生产总线/压缩器/软上限；只给8次实际正向事件固定320ms到达间隔，BGM关闭，**不是新自然长局或GameScene音视频录制**。我没有实际听辨，`heard=false`；这些文件交父级/dot/用户试听。

|事件来源|修前输出主峰Hz|修后输出主峰Hz|修后铃音实际playbackRate|
|---|---|---|---|
|1 rank-7|320|325|1.000000|
|2 rank-7|320|365|1.122462|
|3 rank-9|400|410|1.259921|
|4 rank-9|385|435|1.334840|
|5 f09|100|485|1.498307|
|6 f06|100|545|1.681793|
|7 e08|105|615|1.887749|
|8 amo|120|650|2.000000|

[参数/源码/文件hash](metrics-and-binding.json)和[完整前](before.json)/[后](after.json)保留：修后固定载音8/8到达，首层start与传入arrival同一AudioContext时刻，峰值约0.376，小于既有软上限；参数证明频率关系，不代签“已听起来好听”、设备响度、听感力度、长局疲劳或逐帧同步。正常GameScene既有调用位于await transferToAccumulator、arrive之后，源文件本轮逐字节未变，现场与视觉worker版本同步仍待整合复看。

可运行 `node docs/production/evidence/score-melody-audio-2026-10-17/render-short-trace.mjs` 复核当前源码的一段短渲染，输出至ignored shots/score-melody-audio/recheck，不覆写已归档前后证据；无需新矩阵。取证工具早期Vite模块加载/静态fs引入故障已在[准备记录](checks/probe-setup-note.txt)注明，不当作产品故障。

## 集中检查与交接

8文件113项最初112通过、1失败，[原FAIL](checks/concentrated-original-FAIL.txt)保留。唯一失败是旧加载测试期待1层，本轮普通数字为固定铃音+轻木2层；保留原静音/后台/迟到不补播断言后，只复跑[该文件18项](checks/necessary-repair-PASS.txt)通过。最终去重**8文件113项通过**，不累加回归成131项。四项新回归覆盖真实整手不降档、4×间隔逐事件/去重/取消、根音晚到不替换/补播、档位与未来总分/调用顺序无关且有限。

[类型](checks/typecheck-PASS.txt)与[315模块构建](checks/build-PASS.txt)通过，[构建源](checks/built-source-info.json)为产品提交，保留既有大chunk提醒。不查CI/域名、不部署、不push main。下一步由父级合批并用dot/真人听辨短WAV及实际游戏，不把本页软件证据代签主观目标。

Boss商店换曲入口及最小可见信号接口已单列[交接](BOSS_HANDOFF.md)：当前ShopScene.create在可见信号前按stageIndex切boss；由备战owner在真正显示后调用既有setScene('boss')，沿用250ms渐变，可配一次sourceCue('boss')。本批只读交接，不修改该曲或抢写章节/商店窗口。
