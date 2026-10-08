# W4 英雄前景：有限软件证据

输入 main `56aee224be55f47d92263492872ef61ca2ca93bd`，父16:20UTC已合PR63。产品 `7fbfc344bfe6600be6bcd5989639baa5b99bb193`；仅原生设置步骤修正 `3280bbe271117d08f1b4cc30a224de0fae8f5062`；销毁补正最终产品 `f7af32712f5c81ccb833914b9e57ea67de468b66`。文档独立提交，最终精确head标准CI/父独审见本PR，不预记main或真人验收。

## 原生画面与动态落点

系统Chromium、DPR1；GPU和软件光栅加速关闭。使用真实当前版存档导入、选牌/助攻、出牌、菜单动作；每次整份当前状态与标准领域命令所得状态相同，不注入计分结果。乘法/第五手使用明确受控的合法持牌与公开手牌；成长是固定正常种子首次买c06后真实同花，失败快照由三次合法单张命令产生。不是自然获取概率、玩家理解、真实GPU或留存证据。

初产品同SHA `7fbfc34` 的八项PASS：PC1366×768、390×740、320×740、740×390实际乘法；390真实成长、第五手实际得分、真实失败、低动态。完整原日志[首轮原始FAIL](native-first-run-original-FAIL.json)仍保存：八项通过后，中途减动态测试未打开“画面与声音”折叠区，控件不可见而超时；原超时不删、不冒称整轮PASS。

设置步骤补正 `3280bbe` 后，中途减动态、4×速度、快进三项PASS；[追加原始FAIL](native-followup-original-FAIL.json)保留随后保存退出失败。软件未通过项不能用前八项代签。最终销毁补正只重验保存退出与窗口变化，见[最终两项](native-shutdown-final-PASS.json)，不重跑已通过的旧矩阵或把旧图记成新head画面。

- [PC前景实际倍率](1366-multiply-normal.png)、[手机前景实际倍率](390-multiply-normal.png)、[320窄屏](320-multiply-normal.png)、[短横屏](740-multiply-normal.png)。阿默大幅前冲，实际来源“不换词”，累计倍率2→3；本手后续真实倍率至21.6、最终2095，无假救场或预测分。
- [成长真实0→0.25](390-growth-normal.png)明确下手生效、本手不加分；[第五手实际得分](390-fifth-normal.png)只展示保存值；[失败克制收束](390-failure-normal.png)没有英雄前景、没有通关庆祝。
- [低动态](390-multiply-reduce.png)、[中途减少动态](390-multiply-mid-reduce.png)、[4×速度](390-multiply-fast.png)、[快进前帧](390-multiply-skip.png)、[退出前帧](390-multiply-exit.png)、[窗口变化前帧](390-multiply-resize.png)。前景期间ready=false/playing=true，实际文字边界在视口内；完成、快进、退出、窗口变化后前景字段/容器及录制尾音均清零，整份已保存状态保持。

[PC短序列](1366-multiply-normal-sequence.mp4)与[手机短序列](390-multiply-normal-sequence.mp4)分别约1.1秒，来自**实际render-loop canvas帧**按原采样时间组装，非新绘图、长录屏或帧率测量。PNG收势/重击/退场及JSON里位置、缩放、相位、时刻可核；PC65帧/手机69帧只说明这次软件观测，不能当实机FPS。首次source只产生一个完整舞台；手机再正常进下一店/场并实际出第二手，opening标记保持，完整舞台不再进入。

[PC实际WebAudio混音](1366-multiply-normal-audio.webm)、[手机实际WebAudio混音](390-multiply-normal-audio.webm)来自真实master WaveShaper接MediaStreamDestination/MediaRecorder，不是复制素材文件。首次重击记录声部与strike首帧音频时钟差小于150ms；已有CC0短录音/限幅/尾音互斥。工具未主观试听，音量、角色冲击魅力与真实设备流畅度待用户/父验收。

## 原失败、修复与冻结

保存退出确有产品错误：[带原因原生FAIL](native-exit-cause-original-FAIL.json)记录SceneManager.stop→DisplayList.shutdown→Container.destroy/removeFromDisplayList的sys异常。Phaser DESTROY在active/scene清除之前发出；原前景监听器再次destroy自身，递归销毁中断场景退出。关页时又触发可见性监听resetFX异常是原退出未完成的后续错误，不冒称无异常。

新增回归在原产品上实测[1 FAIL/5 PASS](shutdown-regression-original-FAIL.log)，外部销毁次数为2；最终 `f7af327` 把资源清理和主动销毁分开，外部销毁仅清理、不再destroy容器。待退场Promise也在销毁或中途减少动态时释放，专属tween取消、重复dispose无副作用。[57项/7文件定向PASS](targeted-57-PASS.log)、[最终typecheck](typecheck-shutdown-PASS.log)；保存退出和窗口变化原生最终PASS。初版55项/type保其原检查范围，不改成最终57项。最终标准完整CI一次在文档head运行，精确SHA、测试数量、六浏览器profile/resource pulse、各scope before=after按PR最终回执核，不重复本地整包。

## 音乐与资源

旧BGM已停止播放/请求，设置明确等待新曲；音乐30%/音效80%偏好和独立音效保留。原运行时mp3 **3,487,912 bytes** 和未引用manifest撤下；[原来源manifest备查](withdrawn-recording-original.json)仅是历史记录。新BGM没有选定/上传，《怪奇物语》原曲的可公开使用授权源仍未提供；父协调源/替代选曲，不把撤旧曲冒称新曲完成。

没有新专用大图、视频运行资源、依赖或规则变动；前景复用已有立绘和矢量笔刷，仅直接进入战斗且未缓存时补载当前英雄原图（34,664–94,756 bytes，不一次加载六张）。两短序列和混音是离线证据，不由游戏运行加载。原W2/W3、当前保存/防重奖与失败重试保持。真人/实机/GPU/听感/W6未签，游戏6.1默认Medium串行，无并发。
