# W2/W4：实际来源与英雄同台纸墨特写

输入main `68145eaab50636e91bc62bea5415000f036034e4`（父22:51UTC正常FF PR95、精确preCI37999979308/docs37999979357成功；mainCI/正常菜单父核）。范围先独立2c58bd0；首产品e496bf675ca83b8b253494aa46c4ad3af353bf83，竖屏姓名避让/无来源得分b3ba3471fc4d46bf6a3b01090b6d3d5f7f1ce227，最终产品a2f8ad40b50484cb73a986571b070f210072fba1。最终HEAD精确CI在draft回执另核，不借历史绿。

## 可见改动与选择依据
既有第一波高潮已经有英雄大图/墨迹/真实数字/一次openingShow与routeStarter，故不重做标题/首店/成长或添加一轮特效。main同态actual view：真正发动牌仅60px，身份藏在小来源条；本包将同ID完整卡面放到英雄旁的独立纸边前景，宽屏英雄/卡面/读数三域、竖屏上部双图/下部实数，复用牌桌纸纹和原套色；源名及实际落点仍在独立纸页。英雄原放大/墨冲击环保留，来源卡只在同一实际落点短抬（340ms与原动画并行）。PC f09来源图约355px、390 c06约182px，数字和来源文字实际可读。不是新增牌收益、素材/风格生产或逐卡文案。

第五手只有真实得分时仍是英雄＋已保存27分，无虚构来源卡；失败/回放/无保存事件不增加高潮。默认30/80、小夜曲、原录音/音路、600ms落点/既有额外500ms/退场时槽不改，新增卡片tween不进入等待。快进/低动态仍原入口。本包没有录音、真人试听、FPS或长录屏。

## 已准备素材与来源边界
只复用当前已采用handdrawn-p08的amo/erxiang画像、f09/c06完整卡面，以及内部p00-paper.svg。assets.json实核这四ID现有thumbnail/detail/portrait输出尺寸/字节/hash（只核列出的6个，不全库冒称加载）；a的明确sourceCommit与总manifestSourceCommit分开，缺少逐asset声明填null，不把总manifest SHA当该张创作SHA。c06的1da5586来源与f09/角色未给逐asset源分别记录；这不是新增商业许可结论。图像来源不借Inkwave MIT或Kenney CC0音频许可，既有third-party目录逐树保留。未采用旧p03背景、GLB、清单外聊天母版或新增生成图。267导出/81声明不等于全部艺术签收。

既有缩略128×160不硬撑大图：仅首次真实保存来源按需低优先请求一张已存在detail，metadata≤96KiB、宽高≤768；实际流读取≤96KiB、精确声明字节与解码尺寸校验，1800ms上限且结算完全不await。当前两个实际请求f09 45274B、c06 37190B，均615×768；单张RGBA理论约1.89MB，不是GPU实测。每场景至多一张、完成/快进abort、离场清缓存；晚解码/current代次不符不发布。未就绪用同ID缩略原清晰尺寸、无额外卡片缩放，不空白色块、不等高清。sourceCard仍会随既有整个舞台运动，不新增自身缩略动画。新增运行时图片/音频/视频文件0，网络并非0，详情请求有显式上限。

## 有界证据按实际版本区分
- 25项定向（三files）、typecheck与计划32通过：真实倍率/成长/第五手/失败/回放排除、一次strike、reduce/销毁释放等待、三大PC与390/320/740事实区域、同ID/尺寸/字节限额、404/超限/晚decode/abort及静态缩略退化。
- before：main68145ea，两条同态实际PlayAssistedHand/PlayHand，PC受控阿默乘法、390固定合法二响同花成长。首前source确为60px。不是自然获得率、首章留存或六英雄验证。
- initial：e496bf6，PC乘法/390成长、320低动态、740短横、390快进、PC延迟图快进6条，全state按原命令相等且冷恢复state-journal-storage相等；每条一次高潮/最多一张detail、文字在视口。390正常图有姓名压头部问题，明确视觉FAIL，不能拿该轮native PASS签其美术。PC/740/320低动态等没有被后来的竖屏正常位置补正改变相应构图；这些图与版本绑定保留，不重拍全矩阵。
- portrait-final：b3ba347，390正常/快进＋320正常以及1366第五手4条。实际查看正常双端strike/settling，姓名避让、完整来源、读数分开；第五手不伪造卡。原state/冷恢复精确；三个会离场案例最终无climax-source纹理。不是四英雄，是两角色的尺寸/模式加受控第五手。
- fallback-final：a2f8ad4，同一PC延迟详情图/快进。actual view缩略约166px bounds（含旋转），p08-joker-f09仍同名可辨；原状态/冷恢复精确，abort=true、场景已离开、detail缓存0；一条请求，不增加等待。新补正只影响没有高清的来源卡，不重跑既已查的高清事务。其余正常图片/真实命令沿用各自版本，不冒称都由最后SHA重新拍。
- proof.json：before与最终选用after两条PC乘法/390成长的完整initial/final state-journal-storage完全相等。八保护树domain/application/platform/content/audio/public/art/sources/third-party与输入main相同，非只比较少量分数。states.json.gz是原完整快照压缩；report.json记录实际sourceKey/请求数/关键帧及版本。
- 实际像素查看：before PC/390、initial PC strike/settling/320低动态/740正常、portrait-final390/320正常strike/settling/第五手及fallback-final缩略。未记录未查图片为全端艺术验收；运动只截有限关键帧、无帧率数字或长视频。

## 保留FAIL与未签
first-type-FAIL：vi.fn无参桩却检查第二调用参数的Tuple错误，补桩参数类型；不改产品。first-visual-FAIL：390姓名与前冲头部相压，两张原图actual view拒收；只调整竖屏前冲Y，保持scale/时长与PC。整理证据时辅助输出假定第五手也有sourceKey报KeyError；此前两条main完整比对已通过，改可选get后原比对不放宽，无native/状态失败。不把这类观察器错误说成产品保存错误。

原图/字体/音路/领域/身份/经济/操作时点保持。有限软件结果不签整体美术、玩家能否独立指出来源、六英雄、设备流畅度或听感；W2/W4/W6人类门槛、第3包整体、W3/W5/W7自然/角色差异及G1/P08/C04历史暂停仍OPEN/原状态。6.1 Medium单线；draft父审main，未部署本候选。

原report中的最多180个有限运动采样保存在各目录frames.json.gz，report只留计数/事件/阶段和少量代表帧；未删除原采样，也不把其计数换算FPS。压缩是证据便于review，不是新增运行时资源或新的浏览器采样。
