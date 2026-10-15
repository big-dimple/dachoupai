# 唐宋牌第三批开发集成：动态触控、S04、B05

从 `388853308ea0a67ed33ecc4488ae8d6f624d11bf` 继续 `dev/astra-integration-20261015`。原环境恢复成功，工作区起点干净；三条远端分支实读SHA与父指定完全一致。本批不合main、不部署、不强推、不重试Forbidden PR；不加入仍有缺口的推荐价值分支，不等待或提前合入题材美术合同，不按新名重写机制。

## 完整来源与公共文件

| 完整分支 | 远端/输入精确HEAD | 正常merge |
|---|---|---|
| fix/dynamic-viewport-touch-20261015 | 9422a579c9e14a15f05d89172d1e1e0b049b5028 | a4db46fb249f5accec900a94f054b90d799bc19c |
| feat/s04-finish-20261015 | f7e7f61338e92964a230c9b3c27e527a9207f913 | fb5fb19a16c483f73ab0764280ec24861e73a6e7 |
| dev/b05-opponent-sample | 886bf87c03f855d7e9793250fb37753e0cb7cf0d | 87b2b8bd833daec3adf97a039e678debc189fd8e |

全部正常合并，包含S04实现/分析历史、B05事件层及be2cbd1a高DPR修复，没有只取证据末提交。没有文本冲突。动态分支复用的HandSelectionInput/Viewport与B05修复逐字节相同，Git正常去重；OwnedJokerInput的ResizeObserver与上一批共享12ms pickup调用同时保留。

[provenance.json](provenance.json)逐文件用精确current/base/source独立三方组合，再和实际merge树逐字节比较。GameScene保留成长分层、技能提醒、老幻真实技能名及持续字幕接线，B05改动限定OpponentCue事件时序；HeroClimax/HeroClimaxCaption/Haptics模块本身逐Git对象同上一集成版。ShopScene保留上一批pending view/action匹配、失败固定候选重试、刷新上下文及升级精确效果，同时加入S04同源资格说明。

最终产品src树 `76f82c2a4826ebfb29abfbea5e1537269d57ce0f`，产品/测试均与merge 87b2b8bd逐字节相同。后续3笔只改独立观察器：6d950e79增加DPR参数/像素记录；19680e5d按真实相机投影比较CSS轨道；6ada1c3426d4db8f2f12aa8017156897bdaa65dc将观察到的backing pointer换算CSS并保留原值。没有改产品坐标算法、DPR、9MP预算、阈值或计分规则来迁就断言；手势/完整命令/保存断言和0.1px容差保持。新证据提交只加本目录/上级链接。

S04沿已批准方案：新身份quality-r2-s04-finish-v1，章3起、存活持久牌目标色至少50%、原6金基准、整副收尾/永久容量−1；旧core身份保持。此次包含S04已获准领域增量，不能声称整个domain未变。application/checkpoint、content、audio、public/art、renderer、main、全局style、CI配置与上一集成保持，详见保护对象。B05仍是文本事件样板，人物/眼神素材未接入。

## 最终源树实际验证

[源码绑定](binding.json)区分每轮执行HEAD：全量在产品merge87b2b8bd启动，S04原生在6d950e79，其余最终原生/烟测在洁净6ada1c34；三者src和tests逐Git对象相同，没有把不同产品版本拼成通过。

- [全量测试](tests.txt)：261文件、3575项通过；[typecheck](typecheck.txt)、[build](build.txt)、[content](content.txt)、[计划32包](plan.txt)和diff-check通过。构建保留原大bundle提示。
- [S04三宽度报告](s04/report.json)及完整state/journal/IDB gzip：1366鼠标、390/320触摸，严格合法工程夹具。购买/使用取消、门槛拒绝、延迟重复点击、真实quota失败固定候选重试、冷恢复、下一场及染色跨线/真实刷新均与原applyCommand全量相等；当前新身份及旧身份相关测试通过。不声称自然供给/自然经营或平衡通过。
- [DPR3动态输入](resize-dpr3-accepted/summary.json)与[完整保存](resize-dpr3-accepted/report.json.gz)：同一页面触摸390→320→740横屏→390→1366→320，鼠标1366→390→740横屏→1366；8次调序、2次真实出牌全量保存对账。手牌横扫、原技能/工具DOM控件、手势/持牌拾起中旋转取消、modal开着旋转、再次输入均通过；每种输入仅1次主页面导航，未reload或重新导入。DPR始终3，backing和实际指针记录；1366处9MP约束下为4001×2249。最终CSS(220,507)对应raw backing(660,1521)，换算后精确CSS(220,507)，不再误点K。原DPR1报告仍按原SHA保留，本批是新增高DPR受控证明。
- [B05事件时序三例](b05-phases/summary.json)：PC1366、390普通/低动态快进，换型反应等真实结果/累计热度落地后再开始；普通后续、缩窗回看、离场及原生选择/保存保持。完整时序与状态见gzip，源码hash前后一致。
- [B05高DPR live](b05-density-live/summary.json)：390/DPR3、320/DPR3、1366/DPR2三例无暂停时钟通过，面板实测分别366×226.796875、304×72.390625、954×311.8125 CSS px；文本/Range行框按原严格padding检查，390→320、1366→1024真实缩窗中止并按新位置回看，完整保存等于实际已提交结果。
- [B05静态几何截图](b05-density-capture/summary.json)：相同三例真实PlayHand后，只读冻结虚拟时钟截CSS尺寸整屏；与live分开，不用静态截图证明850ms阅读速度、普通动画或高DPR快进操作。三张已实际view，面板恢复正确区域。
- [持续字幕DPR3](hero-caption/summary.json)：390燃金4×原生技能/出牌，实际来源文字跨镜头保持、独立文本scale1、保存及冷恢复对账通过。[商店拾起](shop-haptics/report.json)：320/390两次原生首槽→第五槽保存对账，触摸各一次12ms请求，移动/释放不重复；这是mock API计数，不签物理振动。鼠标零脉冲与不可用回退由原专属单测覆盖。
- [原烟测](smoke-result.json)与[日志](smoke.txt)：系统Chromium151，PC1280×720/DPR1、390×740/DPR3，正常动画、原新局/买取消/选牌/弃牌/出牌/恢复及横竖缩窗状态断言通过，手机backing1170×2220。S04来源对原烟测只更新了正常新局identity/hash两项期待，未减步骤/断言/等待/帧数。未以本地Chromium冒称原CI三引擎或硬件性能。

实际打开查看：S04 PC购买/390已选目标色/320章2拒绝；DPR3动态740横屏调序后及1366鼠标调序后；B05三张高DPR整屏；最终手机烟测整屏。其余代表原图和完整截图索引见[screenshot-index.json](screenshot-index.json)，索引不等于逐张人工图审，未入库原图保在/tmp/astra-wave3。

## 保留的检查失败与边界

- [首轮DPR3观察器](resize-dpr3/summary.json)：到1366触发9MP fractional density时，DOM轨道宽854.53125与原逻辑宽854.72差0.18875，原DPR1观察器误直接比较。改为实际camera矩阵投影后的CSS宽，容差仍0.1px，没有改产品或放宽容差。
- [次轮观察器](resize-dpr3-final/summary.json)：五次触摸调序和真实PlayHand均已完成并对账，但最后将raw backing pointer(660,1521)直接同CSS(220,507)比较而失败。保留原值，按实际canvas/baseSize换算CSS后完整触摸+鼠标重跑通过，不删原FAIL。
- [来源组合助手首轮](provenance-attempt-FAIL.txt)：严格二方patch因上一批cf430c84计划上下文而拒绝应用，不涉及产品修改；改用独立三方字节组合，与正常Git合并逐字节相等。

限定证明上述软件浏览器的动态CSS缩窗/高DPR与真实命令保存，不签物理方向传感器/手机、硬件GPU、真人阅读/理解、听感、自然经营或整体美术/平衡。原第二批“动态缩窗未修”结论按原SHA保留，本批已有独立修复及最终DPR3复核；不据此宣称所有平台输入缺陷已消除。B05人物/眼神素材和《唐宋牌》题材美术合同仍另行推进；推荐价值缺口分支未合。

## CI与交付

[CI访问实录](ci-access.txt)：本环境gh读取原ci.yml API被`Forbidden`拒绝；未借其它分支或PR绕过，未改workflow/权限/timeout。默认ci.yml push过滤不含dev/**。因此新集成HEAD远端Actions尚未确认，不引用来源绿CI代签；最终push精确SHA及可获得的commit状态由交付回复另列。本地全量/浏览器通过与远端CI成功严格分开。
