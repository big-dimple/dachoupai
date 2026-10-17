# 同一来源事件：主击与回弹两声

基线 `8a9b3d995a980bc9147babc0f683b01f114e39bb`，分支 `dev/score-audio-density-20261017`。本增量仅改AudioEngine、foley和一份回归；不改GameScene、动作模块、BGM、规则、存档或原音频文件。P08仍in_progress。

## 已确认与最小修复

8a9b乘法配方是0ms碎晶+0ms低体+35ms轻碎晶；普通层偏移14–35ms。它们构成一记复合音，不能当作“主撞击、回弹落点”两个独立触发。此结论来自起音参数，实际用户反馈仍以用户听到的一声为准。

新增显式`paired:true`。主击剪到约35–49ms，乘法主击只保留一层碎晶与低落点；同一事件随后只能由动作的真实rebound回调再触发一次较轻、较低的60ms木质落点，第二击不加碎晶。不传paired的原调用维持8a9b原样。

```ts
// 捕获同一presentation与eventId。第一声仍在唯一数字arrival/动作主撞击点。
audio.scoreImpact(presentation, eventId, kind, tier, chain, {
  paired: true, durationMs: remainingActualMs, signal: context.signal,
});
// 由同一Tween实际进度的onPhase('rebound')调用，无声音侧独立timer。
audio.scoreRebound(presentation, eventId, {
  durationMs: remainingActualMs, signal: context.signal,
});
```

第二声读取首次已实际发声的事件缓存，不能独立指定kind/音高或自行开新事件；先有成对首击才有效，重复回弹不再响。取消、场景切换、静音、后台会清待回弹，已中止signal不会迟响。原6声部、增益和0.12、低音区三步与全局混音预算继续约束两击。

这条显式双拍契约取代旧批README中“不要另加回弹调用”的**成对来源音**约定，旧说明仅保留为8a9b历史。不成对的其它音效及BGM保持原行为。

已把精确接口交`01a147ec-1cdc-7048-a9f6-cb648f263023`。动作owner确认第一声取arrival，第二声取左右摆动首次反向回弹落点，以Tween进度触发，快进也保留至少约50ms实际间隔；声音不以固定双setTimeout漂移。正式GameScene接线与同版音画由该owner继续验证，本批不签已联调完成。

## 短录音与检查

[8a9b基线WAV](before.wav) · [候选双拍WAV](after.wav) · [前事件层时间线](before.json) · [后事件层时间线](after.json)。各1.9秒，三组为普通计分、真实f09乘法、真实英雄乘法，均取已有受控合法出牌的保存trace；使用实际AudioEngine/OfflineAudioContext、生产混音与既有CC0样本，音乐关闭/SFX80%。

|组|主击秒|实际回弹秒|候选主击/回弹声源数|
|---|---:|---:|---:|
|普通|0.2027|0.2773|2 / 1|
|f09乘法|0.7520|0.8480|2 / 1|
|快拍乘法|1.3013|1.3547|2 / 1|

基线三组回弹均0声源；候选回弹均1个低木声源，与首击分开起音。整段峰值0.309→0.318，≥0.98削波样本均0，trace未变。此为规定75/95/50ms阶段回调的音频控制，不是GameScene实际Tween录音，不能据此签音画同步。JSON保留LF归一化源码hash。

**实际听过：无；前后全部片段未听。** `heard=false`。参数与录音文件证明分开触发，不代签可辨度、好听、物理设备或用户听感。

5文件88项定向通过：score-melody-audio、score-recorded-audio、audio-mix-policy、fire-audio、audio-sample-loading；类型检查通过，[生产构建通过](build-checks.txt)，diff检查通过。新增保护：两阶段只响一次、缓存真实音高、非paired不生回弹、取消/静音/后台/abort/首击静音不生孤立第二声、60次密集成对事件仍守原预算。未扩大长矩阵。

复核：`node docs/production/evidence/score-source-double-beat-2026-10-17/render-pairs.mjs`，默认输出ignored shots；AUDIO_PROBE_OUTPUT可指定输出。增量普通push开发分支交父级合批，不push main、不查CI/域名、不部署。
