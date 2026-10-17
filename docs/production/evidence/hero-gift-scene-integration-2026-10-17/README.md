# 英雄立绘与c12实际GameScene接线：独立开发交付

分支 `dev/hero-gift-scene-integration-20261017`。当前产品 `fb7290fd04dc5d957517d51d0dc5dd07178b0fe4`，已正常合入主线紧急发布 `a061a7c2a0d10dad1da8647fa747011dd1df493b`，保留辛弃疾候选阻断修复、整手节奏和用户指定音乐。**本英雄/c12分支尚未发布main，功能接线不代表美术或P08通过。**

采用指定模块：英雄 `3a0984cfbf2c69262d66256d9738ed3b8df60448`、c12 `9c3db534da1108406ab2642877949270c5463b61`。主线节奏来源3c中的音频是833b/c222等价移植，三个音频源码与原cbf精确相同；当前分支同时保留主线原4a/cbf祖先。没有合ca843整分支。

## 实际接线

PC左栏用现有完整portraitKey等比绘制约200px宽立绘，工具包/帮助置于左栏底部；保护实际文字、目标、金币和控件，不改顶部源牌、手牌或主计分布局。手机只在原有安全空位contain显示完整小图，不宣称手机大立绘布局或留白整改完成。旧100×140装饰入口由GameScene关闭，完整立绘可点详情；资源迟到只局部补图，不等图阻塞命令。

| 英雄/技术ID | 响应的已保存事实 |
| --- | --- |
| 苏轼 amo | 实际助攻H/M收益 |
| 秦琼 touye | 已押实际判定产生的H/M变化 |
| 辛弃疾 laohuan | ChooseRefill真实留牌保存成功，非候选准备，不伪造计分事件 |
| 刘娥 erxiang | 显式交棒目标实际H/M收益 |
| 文成公主 azao | 显式释放后实际H/M收益，不把蓄层准备当成功 |
| 花蕊夫人 xiemu | 显式支付后实际H/M收益 |

计分分支共用既有arrival和impact时长并行响应；留牌响应挂现有保存后反馈槽。模块拒绝错英雄、伪事件、零变化及回看，准备不染成功光；减少动态静态强调，取消/隐藏/销毁归位。新旧局身份分派、数值、存档、规则和图字节不改。

c12只由await SavedRun成功且非duplicate生成fact，在对应onStageClear事件槽await有限组件：真实实例源牌→实际道具箱；满包→实际金币，落点只投影既有标签，无二次发奖/抽奖/自动使用。取消只停止剩余动画，已保存奖励不撤回；保存失败无fact、无飞行，回看无gifts。IntermissionScene删除赠品去向专属入口，保原本场详情。该删除仅在本独立分支。

为实际GameScene坐标补viewport/captionBox与侧边航线，避免穿过H/M数值和文案出右屏；手机赠品期间暂让出那一小块英雄装饰空位，其他布局不重排。金币落入HUD后收起图标，保留真实金额和回执，不长期盖头像。c12只替换自己的关末奖励呈现；[绑定](checks/phrase-protected-binding.json)确认导演五模块、主循环、animateJoker/award/转移/数字脉冲等方法精确3c，不改其通用计分/源牌时长。

## 分版本证据，不能混写为一次构建

- [首12组报告](pre-phrase/report.json)运行产品a882：程序PASS；root目视发现手机赠品线过倍率、文案右裁切，明确[目视FAIL](pre-phrase/VISUAL_REVIEW.md)。全部原图/录像/逐帧/保存原件保留，不将此版签视觉通过。
- [整手并版12组](combined/report.json)运行d0aa：六英雄实际GameScene保存链、PC/手机c12入包、满包转2金、实际快进取消、实际保存失败、手机减少动态全部程序PASS。每例完整state/journal/checkpoint与正式命令相等；失败时公开元组不变、无gift；取消无到达回调。所有礼物文案在真实视口内，flight载荷不与计分读数相交。
- [最后金币1组](gold-closeout/report.json)运行020e：仅复验目视发现的满包金币图标盖头像，到账后隐藏图标，30→32与库存仍2/2保持，图标不再覆盖头像。其他11例沿未改条件分支复用，不重复扩矩阵。
- 六英雄使用受控Scene选牌/草稿与既有真实保存方法，证明实际GameScene触发链；**不是全部英雄原生点击流程**。c12的卡牌/出牌和导入使用实际浏览器输入。所有库存/牌序受控，不是自然获取/长期试玩。Playwright视频为画面记录，不能代签实际音轨或真人听感。
- 核查过[苏轼真实impact](combined/hero-amo/hero-impact.png)、[辛弃疾保存后留牌](combined/hero-laohuan/hero-impact.png)、[手机正常到账](combined/gift-phone/gift-arrival.png)、[金币收尾](gold-closeout/gift-full/gift-arrival.png)。截图不是移动端美术验收，旧眼神/多层反馈及手机整体空间仍待人审。

已有第一轮4文件25窄检查通过。整手组合交叉的其他4文件21项通过；触觉旧夹具缺新增phrase Map导致1FAIL/1未处理错误，[失败摘要](checks/cross-initial-failure.json)明确非伪造原始日志。只补真实scorePhrase夹具，保留全部原到达断言，随后仅[触觉5项](checks/haptics-fixed.log)通过，未改生产逻辑或机械重跑全套。来源英雄6项/c12原47项/节奏78项按各自范围读取，不合算。

最后在fb7290fd保留已发布辛弃疾修复后，只做[类型/345模块生产构建](checks/post-refill-build.log)，未扩大测试集合、未另做旧局恢复或重跑12组。本次runtime样本早于f320 getter，不能冒称已跑最终全部原生矩阵；该getter与主线a061精确相同，源19及其三组有限原生证据仍按原范围复用。构建身份和实际体积见[交付构建](checks/final-build.json)。

P08及三体验目标仍未达标。当前mobile小图/留白、教学行、技能叠框、真正透视反光/惯性、4×后段持续渐密、听感、物理手机/性能及正式门仍开放。不等待CI、不查域名、不部署、不修改预算或工作流。
