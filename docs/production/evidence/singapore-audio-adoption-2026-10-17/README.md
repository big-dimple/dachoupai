# 新加坡音频实际采用：BGM首批与随后计分采样

分支dev/singapore-audio-adoption-20261017，基线6609f4f609199ee1d5c9271c9389daaebb943bd7。用户最新明确直接采用，出处说明保留，商用授权核查不作为接入门槛。BGM首批已先普通push：**4a1f9227e137aaf57122ce812fb52d95eda0bf49**，具体处理见[BGM首批](BGM.md)。本页随后一批只改音频模块/采样/必要测试，不修改GameScene、规则、存档或共享计划，不合入独立原型AudioContext。

## 实际接入

七个OGG从ca843a64b02cb630e52a691abb055b6f40aeae76逐字节采用，[sources.json](../../../../public/assets/audio/gamefeel-rfc/sources.json)记录原SHA、出处事实及用户指定用途；不将主题复刻标作原创旋律或伪标CC0。五声样本在原scoreImpact内部按同一事件/拍序选择一个，固定0.75×速率，不叠乘原八度爬升；短包络90–115ms和低通保留短促轮廓。真实乘倍率同一路使用所给战鼓的短前段与必要碎晶，最终award使用所给钟声的短尾；没有把0.8/2.5秒原文件整条叠在每次事件上。

保持6609同事件主击/回弹：paired主击35–49ms，真实回弹回调才发第二个轻木落点；不另起播放器、合成器或timer。缺素材/静音时消费事件不补播，取消/后台清待回弹。6声部、名义增益和0.12、全局压缩/软上限及原音乐/音效偏好保持。

与源牌owner确认采用已有第6参的两个向后兼容字段：

```ts
audio.scoreImpact(presentation,eventId,kind,tier,chain,{
  paired, durationMs, signal:context.signal,
  pulse,        // 乐句内拍序，五声循环，不逐组升八度
  accentWeight, // 0..1，默认1；0消费同一事件而静音
});
audio.scoreRebound(presentation,eventId,{durationMs,signal:context.signal});
```

回弹沿用首次事件缓存的weight。整手起势/连发/选定重拍/收束、哪些gesture成对，继续由唯一源牌owner的实际EffectQueue/Tween时钟决定；本批没有再排一套节奏或暂停。基础调用无需新增字段也能使用这批素材。

## 已运行的检查

8文件110项定向、类型检查、[330模块生产构建](build-checks.txt)、diff检查通过。覆盖曲目文件/metadata、两槽生命周期/失败重试、去重、五声拍序与限高、力度缓存/0权重不补回弹、密集60事件原预算、静音/取消/迟加载。旧音色参数断言按用户指定素材更新；多曲容错测试用显式双曲夹具保留覆盖，生产table为单一指定曲，不再自动轮播旧探戈。

[浏览器实测](browser.json)使用真实AudioEngine与Chromium153：30个现有/新增采样全部解码；两首原生HTMLAudio均loop=true，并从尾端实际越回0继续播放；音量0停止，恢复及后台信号恢复后维持同一context、至多两媒体槽，30/80偏好保持。此为音频层切场/恢复，不能冒称完整游戏新局、刷新存档或物理后台验收。

[实际后混音录音](actual-mix.webm)来自生产压缩器/软上限后的MediaRecorder，含新桌案BGM、五声、双拍与战鼓。规定阶段回调仅用作音频驱动，不冒称最终GameScene动作同步。真实保存trace的默认30/80与最大100/100离线混音峰值分别约0.335、0.416，≥0.98削波样本均0，trace不变。JSON以源码LF归一化hash绑定候选，headAtCapture为录制时提交，采样源码当时仍是随后一批未提交diff。

**实际听过：无。全部片段未试听，heard=false。** 用户可直接体验后再反馈调整；参数通过不代签主观听感、最终同版节奏/音画或实机，P08仍in_progress。

## 交付范围与预算事实

新增两首运行时BGM及七个小采样，原始两BGM和被替换两旧曲均留离线archive；旧曲无运行时引用后从public移走，避免重复发布。本批public非GLB资源相对基线净减约0.37MiB。全public非GLB计量仍约32.53MiB（基线约32.90MiB），不是旧146项17.01MiB白名单结果；全局包预算由整合版本核对，本批不扩大清理其它美术/资源，也未宣称20MiB门通过。

不push main、不查CI/域名、不部署。源码未改GameScene，整合时在已有6609的源牌分支顺序取BGM首批和随后采样提交即可。复核脚本[browser-audio.mjs](browser-audio.mjs)默认输出ignored shots，显式AUDIO_PROBE_OUTPUT可重做指定目录。
