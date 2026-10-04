# P08核心对局信息批1

选牌共用纯facts与真实判型，不运行预测计分；持续显示牌型／计分牌／附带／Boss效果停用／B02普通点数0。完整持有四牌规则与72短条件入口保留，实际出牌保存成功后才演出数字、完整实际trace与火；准备下一手清空预测侧道。规则／RNG／存档／计分与奖励不变。

[已独立早评的390×740静帧](390-selected-straight.png)为fixture＋旧素材，来自证据commit `4c80631eddca9b7455dcf53cc12de56e841b9600`；PNG SHA256 `bd3a6d2256d4fbc781e9846c0a57056fa00abf88c0e9b112b1d9a10da1609676`。该图未重绘或重拍，工程与父协调均实际view。图片候选全src指纹 `1b6daa98f448150e97a17db46fa8153c1eecc18f0300e2e6b9d5dff855027a7a`，embedded C03 /5fa9704395c4a1481069daec48b5919349731b77/modified=true/2026-10-03T23:49:28.662Z，Chromium151.0.7922.173 Canvas，CSS390×740、DPR1、safeInset0。经合法checkpoint菜单导入c08/c09/f09，原生touch选Q♥J♥10♥9♠8♠；不是自然取得或main现场截图。最终候选仅补短屏／120px文字间距与移除“等待预览”措辞，图源与最终源码分别标识。

最终候选src SHA256：`331df4a8e77697a27e558d63aa5aa8ab51d19702e29d528a721dd1b8e52e1bd2`（排序src路径+NUL+bytes+NUL）。95受影响单测、类型通过；[有限入口](selection-contract.json)为390×740／1280×720／844×300(top12,bottom0/12/34)的Canvas原生touch/mouse/键盘、hover/longpress/菜单／规则／物品返回／排序／resize，0/1与fixture5张均无预测总分／区间／H×M／events ledger／火；14两行说明真实bounds不相交、字体≥14。暂停隔离测试SaveStore证明playing=true且保存未完成不发布数字；真实commit后完整演出／上手trace可读，下一手及两次reload/continue不重入账，不改变RNG／journal／资源。fixture三条含2附带、B02普通点数压制、B03成型但停用、B16封稀有仍fourFlush均通过原存档校验与原生选牌。

[九牌／14两行输入](hand-input.json)：Chromium151.0.7922.173 Canvas 与WebKit26.0，CSS360／390×740、DPR3，真实renderer见各记录；双向滑选／取消／重复释放／最多5／排序／resize／中断／卡角标不遮挡、完整save不变。此运行在最终文字行距修正前，手牌／命中／手势源码未改；最终说明几何由selection-contract中的14fixture另验。未录屏或性能长测。

实现：完成批1；技术：受影响检查PASS，冻结聚合待记录；独立视觉：单图信息方向＋三项可读性早评通过，整体审美未由此接受；目标设备OnePlus／真实GPU／听感NOT_RUN。新27WebP未接入。批2可见手牌实际候选与72/29共享条件记忆、批3有限全流程验收已获授权，须批1精确CI闭环后实施；不窥未来drawPile/RNG、不按收益排序、不自动出牌、不改存档schema，不处理素材审批／PC／域名／部署。
