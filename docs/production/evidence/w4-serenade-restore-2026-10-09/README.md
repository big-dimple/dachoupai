# 用户要求恢复历史原小夜曲

2026-10-09。独立main1f58b994b9e050c4d3afa94ddf74cc23549154f4分支，产品5836412a822abdc99c2f7cf1aad84b54c7aac5ac；待父独审协调main，不混未合PR72商店/工具包。游戏6.1 Medium单线。

用户实际听后明确Dark Things Loop不适合，要求先恢复之前小夜曲，待自己提供新BGM；本包直接实施，不继续另选曲。历史撤曲commit7fbfc344bfe6600be6bcd5989639baa5b99bb193（PR64）父提交56aee224be55f47d92263492872ef61ca2ca93bd的两个文件逐字节恢复：

- public/assets/audio/p06/serenade-schubert-216755.mp3：3,487,912B，SHA256 e07b53322fd650fb5929215cef3b07b34977a2c486e140f8b71c5a23017daead。
- public/assets/audio/p06/recording.json：2,239B，SHA256 dfb139a918cbdd3a2c2947fefd391e21979908e60a2330575661f6358b16958b。

曲名Serenade - Schubert，作曲Franz Schubert、Ständchen D.957 No.4，公开贡献者Jérôme Chauvel / Abydos Music。历史记录出处[作者曲页](https://pixabay.com/music/solo-piano-serenade-schubert-216755/)及[Pixabay Content License](https://pixabay.com/service/license-summary/)保留，并核当前作者页可读；不是CC0。继续仅用作集成游戏背景，不提供单独音乐下载/素材库。原录制方式/编曲版本未明确，不能声称话筒实录、李斯特版或某商用原唱；历史元数据的旧听感状态不倒写。本次没有重新编码或调音，MP3格式duration217.965714s含容器边界，实际HTMLAudio解码217.939592s同原metadata。

只恢复音乐绑定与曲名，删除当前Dark runtime目录。AudioEngine现有首次手势、单个streaming HTMLAudio、音量30/80、独立静音/恢复、上限/压缩与已改录音SFX原文保持；GameScene/HeroClimax/scoreR2逐字节同main，英雄核心+500ms不动。工具供给/价格/UI不在此分支。

11项/2files定向、typecheck、生产build通过。一个390×740编译版生产页面、真实首次touch：之前0请求/0播放器，之后唯一原曲请求、running context、loop=true、时间推进；原生键盘范围控件music0暂停而SFX80保持，再30恢复同一播放器。没有把键盘滑块测试冒称实物触控拖动，也没有测试物理切后台或重跑旧音频/英雄矩阵。实际post-ceiling2.4秒输出峰 .143359、RMS .033371、近满幅0；真实信号不等于主观悦耳，subjectivelyHeard=false。设置截图实际查看，来源/索引/HEAD检查前后相同；新waitForFunction全为同步Boolean，显式await异步操作后再独立同步断言。

完整原报告、短输出和日志同目录留证，SHA清单逐项读回校验。最终精确head CI另核；用户实机/听感/GPU/FPS/W6未代签。短暂云shell断连已恢复，不是任务失败或审批拒绝。
