# 新加坡两首指定BGM：首批实际接入

分支dev/singapore-audio-adoption-20261017，基线6609f4f609199ee1d5c9271c9389daaebb943bd7；素材固定ca843a64b02cb630e52a691abb055b6f40aeae76。用户明确采用并要求不以商用授权核查阻塞；出处事实保存在art/sources/audio-gamefeel-rfc-20261017/upstream.json。未合入RFC原型或新建AudioContext。

Boss实际指向boss-stranger-things-theme.mp3，table实际指向table-tangsong-cyber-groove.mp3。manifest同步标题、作者/合成来源、用户指定个人使用事实、时长、字节和SHA256。菜单、商店与成功场景沿用原曲目；table不再轮到旧探戈。替换掉的两个旧BGM原字节移至离线archive，避免继续发布无消费者的旧录音；新素材原始两MP3同样逐字节留在archive。

两首均保留完整16小节、原速率和内容，仅固定增益匹配及8ms首尾环接淡化后重新编码192kbps MP3：

|曲目|实际时长|处理后LUFS / dBTP|首尾跳变：源→派生|
|---|---:|---:|---:|
|Boss|45.714286s|−18.28 / −6.91|0.01772→0.00001284|
|桌案|41.739116s|−18.43 / −2.28|0.01921→0.0016874|

原字节hash及可重做的[处理脚本](prepare-audio.py)保留，不自行更换曲子。单文件技术检查和Chromium原生HTMLAudio循环越界→0、音量0停止、恢复、后台信号暂停/恢复与同一context/两个媒体槽复用通过。实际混音捕获见[actual-mix.webm](actual-mix.webm)，[浏览器记录](browser.json)也包含随后计分素材候选的混音检查，不能把它冒称首批仅BGM的完整新局验收。

曲目/播放器生命周期测试通过；完整候选330模块构建通过，首次BGM提交不包含正在准备的计分采样源码。没有改GameScene、规则或存档，不push main、不查CI/域名、不部署。**全部录音未实际试听**；听感、实机与最终同版新局音画待验，P08仍in_progress。
