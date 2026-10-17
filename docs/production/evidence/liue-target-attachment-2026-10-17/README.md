# 刘娥目标附着：单英雄垂直样例

产品/实际编译与浏览器源码：`b0a52c96d575fda876e87f7d676cd5f9009b1b6a`，分支 `dev/liue-target-attachment-20261017`。基于 main `760b9ebd` 正常合入已释放左栏 `1af6e171`；辛弃疾 `2f2eb708` 保留。源码树指纹与精确来源见 [summary.json](summary.json)。本包只完成刘娥软件样例，不代表用户体验已验收；其余五英雄附着、N01及三大体验目标/P08仍开放。

## 先看实际画面

- [PC连续录像](pc/continuous.webm)、[手机连续录像](phone/continuous.webm)：真实导入、选6♣/6♥、点技能确认6♥、停留、出牌、实际转点与清理。
- [手机待转全屏](phone/accepted.png)、[真实impact全屏](phone/impact.png)、[18次采样中4个时点的局部序列](phone/idle-pixel-strip.png)、[PC局部序列](pc/idle-pixel-strip.png)。录像是连续动态主证据，局部拼图不代替录像。
- [取消/重选/重排/读档/立即出牌/快进/回看录像](boundaries/continuous.webm)、[降低动态录像](reduced/continuous.webm)。

实现为技能按钮外缘短包→真实卡牌外缘持续轻动与“待转”→同一已保存 `erxiang.handoff` 的impact短释放→清理。所有锚点按 `instanceId`，不是牌面或槽位；6♣保持“主”，不继承6♥效果。**停留3秒是验证持续存在；玩家在190ms飞行中仍可立即出牌，未加3秒等待或新确认。** 既有扑克选择/计分姿态、规则、存档、源图、音轨与触觉事件保持。

独立模块为 `HeroTargetAttachment` / `HeroTargetAttachmentState`；GameScene只接合法目标、非duplicate保存后的EffectContext、真实impact与取消/快进/回看/shutdown。没有第二个卡牌姿态tween，不写原卡x/y/scale/angle；降低动态/关闭模式用静态缺口边形和短标，释放按实际结果立即清理。草稿无新增声音/触觉，兑现沿原事件。

## 实际检查

同一个干净的e2e生产编译产物，`builtAt=2026-10-17T11:53:09.429Z`，revision精确为上述产品SHA，`modified=false`。Windows、Node22.20.0、Phaser3.90、Edge143.0.3650.80；[完整报告](report.json.gz)、[完整初末state/journal/storage](states.json.gz)。没有改规则目标来留场：正常夹具为对子Lv2、满堂喝彩、炉火纯青成长0，真实结果 `H146 × M17/2 = 1241`；边界夹具明确使用Lv1且不持满堂喝彩，真实328保留在原目标400场内以检查回看。

|实际流程|结果与范围|
|---|---|
|1366×768 / DPR1|PASS，512个观察帧；18张idle原生采样跨3344ms，6♥唯一目标，真实impact释放一次；完整结果与正式canonical命令全等，过场后无残留|
|390×844 / DPR2触屏输入|PASS，500帧；18张idle原生采样跨3359ms，来源飞行、持续外缘、真实释放、牌点花色/主牌标记可读；短标不盖任何可见扑克|
|PC边界短流程|PASS，187帧；改选6♣废旧代、取消不提交、移出目标不自动重挂；详情右移仍跟6♥且不重播source；菜单隐藏无尾效、关闭回idle；读档不恢复草稿；飞行中提交；快进和回看无附着残留/额外写入|
|390×740 / DPR3减少动态|PASS，252帧；无travel、idle flow恒0，静态目标准确；真实倍率/保存结果不变，释放清理|
|单测/类型|[31项窄测试](checks/narrow-tests.log)与[typecheck](checks/typecheck.log) PASS。没有跑长局或六人完整矩阵|
|可见浏览器额外复看|通过Kimi WebBridge在1912×924/DPR1新标签导入同一夹具、鼠标选择6♥并实际出牌；该标签实际走低动态。见[待转画面](native-accepted.png)、[清理画面](native-clean.png)、[实际保存1241/6♥/intermission/无残留节点](native-observed.json)。未借该静态模式代签普通动画|

`node harness/liue-target-attachment.mjs` 可重跑四组（输出目录由 `ATTACHMENT_OUT` 指定）。`node harness/liue-target-pixels.mjs` 对实际PNG做相邻采样比较；默认读取 `shots/liue-target-attachment/final`，同样支持该环境变量。

[像素核对](pixel-review.json)：17对相邻idle采样中，PC/手机牌点与花色索引变化像素均为0；目标外缘每对分别有940–1071 / 1694–2117像素变化。原始18张PNG留本地shots，仓库保留连续录像、原生全屏关键帧、带时间局部序列与采样数据：[PC](pc/frames.json.gz)、[手机](phone/frames.json.gz)。不是只检查常量或getBounds。

新增效果实际只使用1个意图、至多2个Graphics与1个Text（0粒子发射器、0新素材），无逐帧Text/Canvas/纹理创建；短标贴可见牌带左侧，跟随原CardView，场景/菜单退出清理。记录的渲染间隔P95约PC30.2ms/手机40.4ms含PNG读取和录像开销，**不是新增CPU≤2ms或低端30fps门的签收**。真实低端设备性能、听感、实体触感、Safari与用户审美NOT_RUN；DOM菜单隐藏/真实换场已测，真实设备后台/失焦切换不冒签。

## 保留失败与修正

- [首轮观察器失败](initial-check/observer-getBounds.json.gz)：真实选择已出现效果，但取证器对Phaser Graphics调用不存在的getBounds；修正观察器，没有改领域迎合断言。
- [第二轮报告](initial-check/compiled-boundary-wait.json.gz)：PC/手机完整链路已过，弱手边界等待强底分专属base-impact超时；改为观察真实committed状态后测试快进，不改原计分节奏。
- [手机旧短标位置](initial-check/phone-centered-tag.png)：居中短标受邻牌遮挡；最终改到本牌暴露带左侧，增加逐帧短标不盖扑克断言。来源环移到按钮外，保护按钮文字。最终四组在同一干净新构建重跑PASS。

## 场景窗口与后续边界

GameScene已释放。虹光组件可查询原CardView的 `container.getByName('hero/target-edge')`（data含targetId/phase/generation）；本技能流占外边3px、线宽≤3px。虹光应避开这条技能带并保留其语义，不能把它画掉。未接入/代签独立虹光组件。

父级后补AI准确性已单独交付 `dev/ai-hero-context-integration-20261017` / `8cf3b9221f82980062af12eccaddd127a041b34c`，保留来源模块 `24285a60`/`e32149e8`：aiInput传显式目标/金额/释放/助攻；AI采用候选保留仍合法的已有选择，不合法由现有资格函数清除；换组撤销恢复当时草稿并重验，不自动选目标/花钱/发动。该独立接线51项窄测/typecheck通过；**AI场景浏览器验证未做，本包四组录像只签b0a52c96，不冒签8cf同版。**

用户12:06再次否定N01：顶部唐宋牌没有自身动作。下一段优先处理这个核心缺陷，先不扩其余五英雄附着。已定位 `GameScene.focusSource` 对jokerViews设置 `slotLocked` 后将lift=0、factor=1且倾角增量=0，来源牌因此只剩高亮；下一段应让真实joker score/edition/retrigger/growth对应牌可见起伏倾斜回弹、数值自牌到H/M、声音同拍，多来源递进/关键乘倍率重拍，不参与牌不假晃，并查重绘复位与过短队列。本段没有实现该整改，N01及三大体验仍未达标。
