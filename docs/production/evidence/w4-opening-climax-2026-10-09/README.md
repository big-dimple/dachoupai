# 完整首120秒音画候选：有限同路径证据

2026-10-09。输入 main `4d2d78e6be692aa48cb9ee62fb99918aa6e10453`。合同cf0e640；产品391cb59，低动态数值归位2c466ee8c37decc42bf20f457f20a7ba5ce3db37；测试补充7c86413。证据提交/最终精确CI另随PR记录，不能把这份证据头当作已发布main。游戏6.1默认Medium串行；没有并发工作者、种子扫描、八章或软件GPU帧率验收。

[PC1366前后实际音轨短片](comparison-1366.mp4)约27.2秒、[手机390前后实际音轨短片](comparison-390.mp4)约25.8秒；均先旧版再候选，标注BGM7%/SFX100%。同一个正常新局输入：固定公开seed group-natural-17→标题→二响→群子→成功保存首店→可选节目不接→实际购买现货满堂彩→进入首场→手牌2♥/2♠/A♣/A♦→真实出牌。未导入造牌、未找种子或读取未来牌。两版同端初始／最终完整state及actions逐字段相等，领域canonical每次命令一致，真实首手362，满堂彩热度91→181；一次保存事件、一座共享路线／英雄舞台，既有额外500ms调用点原文未动。[完整状态与受保护源码树证明](source-and-state-proof.json)、before/after两端json可复核。最后候选两端native头均2c466ee；PC曾以391+待提交低动态归位捕获，未作为最终精确来源，已用2c单次补正捕获替换，其他路径未重跑。

[PC运动分帧](motion-pc-contact.png)和[手机运动分帧](motion-phone-contact.png)已实际查看，另查看前后两端hero完整图、候选手机标题入场及PC墨覆盖。标题展开、约1秒完整湿边覆盖／揭开、画像从画外入场、墨刷／运动滴与扩环、数值91→181落稳到退场有可见不同；数值／来源保最上层，手机纸底遮住穿过的画像。分帧是软件渲染观察，帧数和渲染时间不是设备FPS或真人观感验收。初期入場允许装饰牌背暂越出视口，按钮原位置／触点即时可用；确认200ms、遮幕指针透明，输入可清除遮幕不吞原动作。

[native-driver.mjs](native-driver.mjs)从真实页面CDP截图帧的epoch时间戳组成有界视频，并在最终WaveShaper输出到AudioContext.destination时分接MediaStreamAudioDestinationNode；录音包含原同一Schubert小夜曲与真实录音音效。媒体录音开始epoch与首帧epoch之差用于音轨延迟，未用合成音／旁配音／预制特效轨。[movies.py](movies.py)以15fps编码供审阅，绝不把捕获率当作验收；四份`*-actual-output.webm`保留原捕获音轨。[实际音频数据](actual-audio-metrics.json)是整段最终输出RMS／peak，非独立事件响度或好听结论：PC原peak.885→候选.479、手机.877→.496，无≥.99样本。**云端没有真人试听；尚未签听感。** 父／用户应直接播放短片评估选择、购买和关键落点与BGM的相对感觉，不能以峰值或测试数量代签。

真实增益修复：原card-slide-1动作约150–200ms，旧select只取前120ms；缓存解码主动作起点及有限峰值校准，选择取主体并保短包络；录音文件不变。用户getVolume／存储仍.07/1，音乐内部余量×.5，短duck恢复至内部值且严格0静音。关键录音为低频身体、滤波布纹、木落点、铃尾，不加纯振荡器或新素材。现有30/80默认与小夜曲未改。所有runtime图片／音频／视频增量0；墨爆至多24滴、单Graphics+单Tween，遮幕DPR≤1.5、最长1000ms并有1360msstarvation清理。未测物理GPU／听觉响度或用户满意。

[lifecycle.json](lifecycle.json)：同一真实保存的合法multiply样板，仅390演出中减少动态／快进／保存退出三条native输入通过，state等canonical、无第二舞台、清理无残留／振荡器；这是控制样板，非自然获取或跨局矩阵。55定向／7files见[targeted.log](targeted.log)，类型检查[typecheck.log](typecheck.log)通过，计划结构核通过（不签玩法）。领域／application／content／platform保存／public-assets／原画树逐对象同main4d；GameScene原文同main，包括额外500ms和业务／保存调度。

原失败不删：[first-target-FAIL.log](first-target-FAIL.log)是旧短尾上限／选择节流假声部时间／rAF mock未模拟已消费回调：同步授权的520ms短铃尾、真正重叠声部≤2及已消费rAF模型；未削业务guard。[first-native-FAIL/report.json](first-native-FAIL/report.json)首轮脚本错误购买普通b10，等待首发高潮超时，页面零错误；购买实际路线首发满堂彩后通过。保存失败不演出，测试及真实事件条件未放宽。一次离线编码跨挂载rename失败改为文件复制移动，不涉及产品或试听，最终短片完整产生。

精确新参考679d2dba48457c239f2c60ba1ffc17d1fe789f07的代码/行/hash及MIT见[采用记录](../../../../third-party/inkwave/README.md)，与原98ea许可证逐字节相同，完整许可已随runtime保留；未整仓移植、未声称Inkwave demo已完整试玩／听过。此前云浏览器demo5%/WebGL停止是已知边界，当前属精确代码参考的本游戏适配。

剩余：父独立有界图／短片审阅、最终精确head CI、parent协调main；真人观感、音频听感、用户PC／OnePlus实机、整体W2/W4/W6仍未签。新22:36／22:41用户胜败收尾、对子养成／省钱／爆发、推荐／选中／首店标记、道具替换／献紙仪式及供给质疑已落原DELIVERY_PLAN W3/W4入口和TOOL_CHANGE_PREVIEW_SCOPE，待下一完整包；本包未实现这些，旧PR77/PR81不作为解决。完成局历史仍停在已推合同分支c4dbaad，不冒称恢复或验收。
