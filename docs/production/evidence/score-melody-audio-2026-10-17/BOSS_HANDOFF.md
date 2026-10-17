# Boss备战音乐与可见信号：最小交接

本条只读调查并交给章节/备战负责人01a147ee协调；本批计分音频没有修改BGM、ShopScene或章节文件，其他worker无需并发写AudioEngine。

## 当前入口与真实时序

- 基线/本产品 `ShopScene.ts:185`：create中直接 `this.audio.setScene(this.run.stageIndex%3===2?'boss':'shop')`，在创建SceneView前就按第三场切Boss场景；因此备战信号还没显示时已可能换曲。这是此次突变的代码入口，不是已复现的设备音量故障。
- `GameScene.ts:349` 在实际入场按stage索引调用boss/table；`AudioEngine.setScene(scene:AudioScene):void` 同场景立即返回，重复boss不会重启。
- `AudioEngine.startMusic` 保留旧曲直到新曲可播，现有两槽 `MUSIC_CROSSFADE_SECONDS=.25` 做250ms交接。现有Boss轨道是manifest中的boss-dark-things，CC0；不用新增曲目或收费资源。

## 最小协调接口

由父级指定唯一ShopScene接线窗口，避免与商店负责人并发覆盖：普通商店create先用 `audio.setScene('shop')`；章节/备战组件的可见登场信号真正挂载后，调用一次既有 `audio.setScene('boss')`，并可同期调用一次 `audio.sourceCue('boss')` 作短提示。使用组件已有生命周期/runId/stageIndex校验使过期回调无效，onReveal只消费一次，不在重绘中重复提示，不写存档。实际入场继续沿GameScene原接口，无需更改视觉计分窗口。

这是可复用的现有接口建议，不是已交付的备战页或新时序实现。关闭/返回的音乐恢复策略由章节与商店唯一owner按实际界面流程确定；不可用工程弹窗解释“换BGM原因”。目标是专属备战画面/登场信号先出现，再由同一轨道渐变形成强敌将至的关联。待该owner回传可见信号回调后再合批检查，不在本次扩大BGM实现。
