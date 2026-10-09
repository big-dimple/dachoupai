# 单一视听候选：有限证据

输入main f065091c488034a9e8d68feda9568dcbd52eb25c，父已FF PR72／73。声音与回弹产品 cc2e972f9a3ed3a3e02bf3b77f757e0576f23f34，harness修正3a633402a20e1b150da552541f0fbc7bebdce930；手机读数纸底最终产品 **76b74979be66ef029666efd24107a7cd8950dc07**。仅draft，最终精确head CI由PR另核，未由本执行合main。6.1 Medium串行，无工作者。

## 可直接审阅

- [完整正常动作链 MP4](natural-actual-action-chain.mp4)：约10秒，1366×768实际浏览器全页合成帧，导出960×540，包含DOM工具页；真实post-ceiling输出按记录时钟对齐（音频开始早于首个画面20.35ms，导出裁去这段）。这是实际CDP连续帧录制，未拼拍静态验收图，非实机／GPU FPS证据。
- [该链原始可播放音频](natural-actual-audio.webm)、[输出分析](natural-output-analysis.json)：10.02秒，混合音乐30／音效80，峰值0.543121、RMS0.033758、满幅样本0。关键音触发至首个观测strike帧8.707ms。不是频谱品味／用户听感通过。
- [最终PC真实相乘高光](hero-final/1366-multiply-normal.png)、[手机中途减动态前strike](hero-final/390-multiply-mid-reduce.png)、[手机跳过前strike](hero-final/390-multiply-skip.png)、[相乘独立输出](hero-final/1366-multiply-normal-audio.webm)。图片捕捉在操作低动态／跳过之前；最终完整状态／清理见report，不冒充已显示低动态后的瞬间。
- [最终受控trace完整报告](hero-final/report.json)、[正常新局完整状态报告](natural-report.json)、[所有生产调用审计](production-audio-calls.txt)。所有waitForFunction为同步Boolean，异步预热另行显式await。

正常链录在3a63340，PC音画产品与最终相同；后续76b7497仅增加手机高光读数纸底，该链不冒称重录于新head。最终三项受控高光记录在76b7497，受控相乘fixture不当自然率／经营证明。62项9文件定向／构建通过，纸底增量7项／type通过；最终CI另核，不反复本地整包或旧档矩阵。

## 真实动作与中断

一条全新自然二响／成组局，seed1791513194283，正常英雄→路线→一起登台。起手满堂彩4金，6→2；基础道具2金，2→0；真实使用塔罗修改所选持久牌，进入牌桌后公开4♥＋4♣对子触发保存首发，实际过关、金币7。每步完整state同canonical命令；无扫种子／注入强牌。记录实际纸牌、购买两层、工具、发8牌、资源、加成、key三层、award三层与成功三层，0 oscillator。终止录制时还有一个有限胜利尾音，未声称所有总声部当时为0。

最终有限3案：PC1366真实保存相乘；手机390相乘时打开菜单切减少动态；同手机相乘快进。各自最终state完全同真实命令结算，hero group0／scoreAccent0、BGM只有原曲、0 oscillator。未测所有手机尺寸／物理后台音频／设备FPS或用户喜欢；单元覆盖缺源消费不追播、静音、挂后台和取消释放、事件防重、每语义上限与连续选牌。

## 资源、许可与实际采用

新22件Kenney CC0不改原文件，总208651字节（203.76KiB），全部SHA256核准；估计解码PCM4,974,320字节（约4.74MiB），不含已有布料／流式BGM。实际首触后23个样本（22＋cloth2）加载，单一AudioContext；首触解码前短声音可能静音，无回补。原Serenade SHA256 e07b53322fd650fb5929215cef3b07b34977a2c486e140f8b71c5a23017daead不变。原曲Pixabay授权不是CC0，沿用独立出处。

样本／许可／hash／时长：[foley manifest](../../../../public/assets/audio/foley-v1/sources.json)、[许可记录](../../../../public/assets/audio/foley-v1/License.txt)。官方Kenney ZIP403，使用固定镜像d79d33a及其明确CC0声音声明，并核官方两个pack的CC0页。未导入镜像技能或其它代码。所有运行时截尾、层增益、延迟、间隔和上限见[src/audio/foley.ts](../../../../src/audio/foley.ts)。

Inkwave固定98ea296：实际Spring积分器→Phaser有限ease、minGap／每语义oldest voice cap、购买双声75ms。精确源码／修改／MIT见[采用清单](../../../../third-party/inkwave/README.md)。未采用InkWipe、V.tone／V.nz、冲击环、.955按压、3D、字体、歌曲或debug freeze；它们不计已实现。父demo停5%未完整试玩／未听仍有效。

## 原失败与限制

保留[失败目录](original-failures/)。首版脚本用了手机工具入口、宽屏无该按钮；另一版尝试共用货架分页，实际PC有专用工具页，修正为真实入口。首次过程中提交harness也导致source/index冻结断言失败；该结果未记PASS、后续固定head串行重录且sourceUnchanged=true。首轮相乘检查用未完成ResourceTiming判断流式MP3请求，误报缺曲；改为实际network request事件独立确认。视觉复核又见手机回弹压到倍率说明，局部纸底已修、有限3案重新检查；旧图保原SHA。

所有heard:false。无人主观听过新素材或本录制，观感／听感／用户PC和手机实机验收待父协调；软件录制、无满幅样本和测试数量不能代签。保持原小夜曲、30/80、已上线首次+500ms、低动态／跳过／取消、英雄→路线及商店规则，无新领域数值／3D／全套美术。
