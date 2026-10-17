# 计分短节奏与乘倍率碎晶候选

基线 main `7f40cd1b07d2fac8c0cddfb0860ba79fb27ba5b6`，分支 `dev/score-audio-density-20261017`。本批只改 AudioEngine、foley、mixPolicy 与3份相关测试；GameScene、ShopScene、BlindSelect、规则、经济、存档、原录音文件与BGM均未修改。P08仍in_progress。

## 根因与候选行为

原实现把所有正向数值事件排成八级大调，第八次后固定高八度2×；普通到达也以200–300ms铃音为主，关键配方同类可容纳8–9声部。跨类别到达的eventId还可能因add/key/multiply不同而再响一次。这解释代码中的后期持续高音与尾音积累风险；没有把静态分析写成已确认的主观听觉结论。

普通到达改为木质薄拍、软体中拍、厚木落点三种短节奏，按真实保存事件顺序循环，速率0.900/1.010/1.134；轻铃只留55–65ms，普通总尾长≤115ms。真实乘倍率改用已有CC0玻璃样本的75ms瞬态和140ms低落点，35ms后一次轻碎屑；不为每个加分事件加碎裂声，不合成新旋律。真实事件的before/after和既有actualMultiplier决定乘法音色，视觉调用误标为key仍不会丢乘法，误标multiply的普通加法也不会加碎晶。

数值到达跨音色共用6声部、名义层增益和0.12预算，最旧尾音让位于新到达；全效果16重叠声部/32节点后备、原压缩器与0.9软上限保持。数值声不再因tier持续加响。原音量默认30/80、已存音量、0音量/静音/后台不补播和取消清理保持；没有新增设置。减少动态仍由场景已有门槛控制flight与静态表现，音频不会另起动态循环。

## 动作接线契约

已按父级授权把契约发给 `01a147ec-1cdc-7048-a9f6-cb648f263023` 的OwnedJokerScoreMotion负责人。保持同一ScoreEvent、eventId、presentation和arrival Promise：蓄势不加新声，动作峰值/倍率数字到达时仅调用一次：

```ts
audio.scoreImpact(presentation, event.eventId, number.kind, number.tier, number.chain, {
  durationMs: remainingReboundMs, // 已按演出speed折算的实际时间
  signal: context.signal,
});
```

这是向后兼容的第6参。普通/乘法所有层的尾长、内部AudioContext延迟随durationMs一起压缩（至少0.25倍，每个短源至少35ms）；0时长/已中止不播。主碎晶和低落点在调用时刻立即起音，碎屑随回弹衰减；不用setTimeout、不逐帧响、不另加回弹调用。signal中止即清理本次全部声音，生命周期结束或被预算回收会移除listener。add/key/multiply共享同事件arrival去重，flight与最终award各保留独立一次；缺失、静音或取消后不补播。正式GameScene追加timing参数和同版动作峰值联调由唯一owner完成，本批未冒称已完成接线。

## 同批可听录音与时间线

[修前WAV](before.wav) · [修后WAV](after.wav) · [修前事件时间线](before.json) · [修后事件时间线](after.json)，均10.863秒。三段使用已有受控fixture，经合法PlayHand/PlayAssistedHand获得真实保存trace，再由numberImpact→实际AudioEngine→真实OfflineAudioContext/生产总线/压缩器/软上限渲染；BGM关闭、SFX80%。采用scoreBeat/impactBeat的规定到达时刻，不是自然获得构筑、真实GameScene录像或动作逐帧同步验收。

|片段|时间秒|实际正向事件|速度|实际最终分|
|---|---:|---:|---:|---:|
|简单单牌|0.25–0.695|1|1×|27|
|扑克→唐宋牌→英雄|1.395–6.175|8|1×|2095|
|末章重触/多彩版次|6.875–9.863|20|4×|5480485|

两版trace在声音处理后均保持原值。录音峰值0.412→0.341，≥0.98削波样本均0，最大录音层重叠4→3。整段RMS **0.0283→0.0328**，不能据峰值降低声称整体听起来更安静或更不疲劳。JSON逐事件给出真实source/operation/retriggerDepth、到达时刻、样本、音高速率、尾长与源码LF归一化SHA256；`headAtRender`是录制当时基线，实际候选代码以文件hash绑定。

**实际听过：无。未听：两版全部片段。** `heard=false`；录音已生成供父级/用户试听。波形、参数和测试不代签清脆度、力度、长局疲劳、物理设备或用户听感通过。GameScene动作峰值、快进/减少动态的最终同版音画仍待owner联调。

## 集中检查与交付边界

[8文件105项定向测试通过](focused-checks.txt)，类型检查通过，[329模块生产构建通过](build-checks.txt)，保留原大chunk提示；diff检查通过。测试保留真实事件不改分、普通不碎裂、乘法纠正、25ms密集60事件跨音色预算、去重、共享duration/signal、静音/后台/迟到不补播、音乐生命周期及偏好回归。旧八级升调/铃音主导断言已按本轮明确目标更新，不将旧音阶断言冒称原样通过。

取证准备时简单夹具误用助攻命令报assist-unqualified-main，尚未生成录音；修为普通PlayHand后两版成功。最初旧参数断言26项失败，更新后集中检查仅剩一条旧chainRate八档断言，修正后最终105项通过；未放宽领域规则或静音/取消契约。没有为复现扩大长矩阵。

复核可运行 `node docs/production/evidence/score-audio-density-2026-10-17/render-comparison.mjs`，默认输出ignored shots，指定AUDIO_PROBE_OUTPUT才写指定目录。基线音频从Git精确读取，不需复制旧场景。普通push开发分支，父级负责合批；不push main、不查CI/域名、不部署。
