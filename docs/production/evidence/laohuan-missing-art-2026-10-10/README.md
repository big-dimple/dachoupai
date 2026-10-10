# 老幻缺图留牌回执：有限小修

输入main `d1219e0ea49cf61a6837e18da79534b4f4854b65`；产品 `afb2ba0f5889a0a0f90df90598a258682f79921e`。仅老幻独立留牌演出三张人物图均不可用的路径；正常有图主路径保持。复用现有纸面组件与实际成功保存的留牌事实，实墙钟主体一秒、既有中断清理及eventId去重；没有计分收益，不新发命令、不改领域/随机/资产/音频。

原生受控当前身份手牌，通过导入及原UI真实戏法弃一张→ChooseRefill留A♦。PC1366×768、手机390×740低动态均4倍速度；控制textures.exists对三个人物key返回false，其它实际已加载图不删除。这是软件Canvas和受控资源故障，不是自然局/实机/六英雄全缺图验收。

- PC纸面实际可见1014.8ms；手机1014.1ms。两张receipt原尺寸PNG均已实际查看，实际牌名、已保存、不增加计分文字完整。
- DiscardHand与ChooseRefill成功状态逐字段等于原applyCommand；展示/图片查询恢复/保存并退出前后完整state、journal、storage相等。恢复图片查询没有重复演出。原生保存并退出到选角，返回截图保留。
- 3测试文件22测试与typecheck通过，只运行必要定向；没有重跑六英雄/自然整章或宽泛矩阵。本次未另测演出中物理后台或取消，代码复用EffectContext abort清理与原墙钟等待。
- 三个脚本假设失败原始report保留：返回按钮误写“返回标题”、误等title而实际退出到character-select、手机未开启hasTouch；修脚本后最终两行PASS。均没有修改产品以迁就断言。

原始完整保存元组和时长在report.json.gz；check.mjs是本环境有限检查脚本，非新增生产harness。最终候选精确CI另核，由父审查协调main；不宣称已上线或用户观感/设备/听感通过。

## 父审生命周期返修

原产品afb2ba0仅登记abort cleanup，但静态回退没有heroClimax owner，导致原resize/visibility/fastForward gate未调用effects.clear。父审阻塞成立，原定时完成/返回结果不构成提前取消通过。

返修产品 `ab54ddd218fd073dec14bba2fe300e71dd4607df`：用单一refillPresentation EffectContext跟踪独立留牌展示，有图和静态两路径都赋值，finally按同context清除；三个原取消入口沿现有Effects.clear/abort，未新增演出框架。有图stage/strike/hold/release代码保持。

只补三次真实原UI保存后的缺图取消：PC1366 resize至1346×748、手机390低动态受控document.hidden/visibilitychange、PC1366直接调用既有fastForward。取消后111.1/40.0/61.9ms内playing与owner清空、纸面不存在。图片查询恢复并尝试同eventId显示仍只有原一次；完整state/journal/storage与取消前实际成功保存结果一致。三张clean图实际查看PC/手机，均无回执残留。后台是受控浏览器信号，不是物理设备切后台；快进调用原方法，不冒称通过菜单鼠标入口。

22定向及typecheck重新通过；未重跑六英雄或自然局。原1秒有限证据仅绑定afb2ba0，本返修没有改墙钟等待与正常时序。精确最终HEAD CI由新push触发，不复用旧绿。
