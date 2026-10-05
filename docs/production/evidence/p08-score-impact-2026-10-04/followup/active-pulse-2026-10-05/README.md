# 活跃脉冲中断与短横热度避让

父图审确认数字压缩/回弹方向可接受，保留原首次base4050的33.8%峰值证据与source身份。本次只补两个缺口，不重跑原8条矩阵。

实际运行源码 `e8a4086252d7dd4f1291bc85a42bfbeb12ac30a7`，clean build于2026-10-05T00:01:45.631Z。仅ScoreFlame局部角笔划改走物理裁线；笔划中心在原10px边带内再内缩1.8px，留下实际线宽净空。GameScene、音频、领域、布局、素材均未变。回归单测直接检查Graphics绘图命令，不把mask数据通过等同于实际像素通过。

原[aab短横峰值图](../844x300-digits-rebound.png)左下横线穿过45下半部，父与本worker均实际查看确认FAIL；原图/报告不覆盖。新[同事件实际回弹图](844x300-digits-rebound.png)为frame192、performance.now3721.2ms，显示67、累计热度45。45实际bounds为y108–132；安全guard为x212.38、y105、width35.92、height31.92。局部横线在guard左右被物理截断，实际查看确认45下半部有纸面留白。所有本次采样帧的物理局部线段均排除实际guards。

390×740的自然5589路径：先在实际postrender回调读到scorePulseScale≠1，再打开原DOM菜单，逐帧操作原演出速度select并走production preferences；不暂停loop、不用sleep猜阶段。首次base4050同一event/0中，frame171/172/173操作前实际scale分别0.74/1.316470914/1.105495712，完成1→2→4→1，tween/time时钟同步，存档不变。此脉冲随后实际回到scale1，具体帧记录在summary。

另一个实际event/1脉冲frame209、显示4140、scale0.74时，通过原DOM减少动态checkbox开启reduced。立即presentation结束、Graphics/mask/音尾归零；数字finally复位在微任务后完成，下一实际渲染frame210的三个数字requested/scale全部为1。完整run/RNG与中断前、原aab自然结果、保存reload结果相同。无需改GameScene取消实现。

43项相关tests、typecheck、e2e build、harness语法及diff检查PASS；只有390活跃中断与844自然202回弹两条原生路线。准确操作前后快照、当前/历史图片hash、完整保存结果hash、全部线段与原始报告定位见[summary.json](summary.json)。原阶段后改速及可能超过260ms的reduced记录仅保留为历史演出期间证据，不用来证明active pulse中断。

软件Canvas、DPR1、safeTop12/bottom34；真机爽感、听感、GPU/FPS、整体P08仍未验。独立review，main未推；新精确CI随证据HEAD查询。
