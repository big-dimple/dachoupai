# 当前最小补强候选：16px拖起、固定牌桌持牌

用户最新已认可手机长按调序与轻震，只要稍微补强。本节为当前范围；下方32px／1.12旧候选、原FAIL、未验边界均按其SHA保留，不覆盖旧图，也不把旧CI签新候选。PR138保持draft，父唯一Ready/merge，本代理不合并/发布，不绕过此前合并拒绝。

产品冻结 `65befbb49b947cc8c1c57edecefcfbc4866ae5f2`，src tree `df24118a1df81c4080133fa001289dc79cd69456`；随后c03fad71只增加同harness的旧main边界观察模式，产品src相同。

- 抓起32→16 CSS px，1.12→1.06倍；纸影两层alpha .10／.20。跟手、目标槽号、110ms让位、150ms落位与实际位置采样保持。355ms长按、10px阈值、move插入、局部touch-action:none与保存协议沿原PR138字节；OwnedJokerInput／ShopScene／PointerIntent／JokerReorder未继续改动。
- 移除GameScene已持有大丑牌baseY−1.2、yoyo/repeat:-1的无限上下浮动及其启停代码。悬停单次反馈、source聚焦仍保留；F09／InventoryFeedback／HeroActionShortcut／音路／style／index／领域／存档字节与1fcec442相同。没有新教程，也没有扩大库存或英雄提示。
- 源码没有显式手机震动调用；用户感到的轻震来源没有物理设备证据。本候选未新增振动API，**不声称验证或保证物理震动**。

## 当前准确截图与状态

small-lift/report在65befbb4洁净产品/tests/harness运行：320×740、390×844、412×915、PC1366×900、DPR2低动态390×844五组PASS。保1→5／5→1／中间插入、静止长按／二维跟手／目标／落位、取消／双指／锁定／隐藏信号／尺寸、真实存储延迟首保存帧／quota失败／菜单同候选重试／冷恢复。完整state、journal、IDB仍逐笔等于原applyCommand，每笔只一次命令；全部记录在small-lift gzip，不用截图对象存在代签。

| viewport | 抓起16px | 跟手／目标 | 保存等待 | 落位 | 牌桌静止3秒后 |
|---|---|---|---|---|---|
| 320×740 | [抓起](small-lift/320x740-slow-held.png) | [中途](small-lift/320x740-slow-mid.png) | [等待](small-lift/320x740-saving-delay.png) | [落位](small-lift/320x740-slow-dropped.png) | [静止](small-lift/320x740-table-idle-end.png) |
| 390×844 | [抓起](small-lift/390x844-slow-held.png) | [中途](small-lift/390x844-slow-mid.png) | [等待](small-lift/390x844-saving-delay.png) | [落位](small-lift/390x844-slow-dropped.png) | [静止](small-lift/390x844-table-idle-end.png) |

本代理actual view上述320/390抓起、途中和牌桌整屏：抬起较原候选轻，牌影/目标槽仍可辨。原320满槽货架价格挤占仍可见，属于既有货架范围，本次不扩改。

五profile牌桌已持五张3秒逐poststep采样，全部实例yRange=0，未写状态；随后原生长按1→4仍按原插入语义正确保存、完整state/journal/IDB对原命令。F09样板未加入这条fixture，不借这条签单卡艺术；该模块字节保持，定向测试覆盖保留原条件。

## 轨道外滚动与缩放边界

旧main8f036827的独立archive与当前候选同harness/同mobile设置对照，[结果](outside-policy-comparison.json)：四touch profile轨道外菜单原生滚动均0→145px，前后完整保存不变；menu touch-action:auto，原全局body overflow:hidden/canvas touch-action:none均相同。viewport meta未加user-scalable或maximum-scale限制。局部none仅持牌固定矩形，没有新增全局拦截。

CDP原生pinch旧/新均scale1→1，未证明pinch成功，**不签全页缩放或物理手机缩放**。已有canvas全局none及body无文档滚动范围不归因于本局部修复，也没有扩大本批去修改它们。证据严格限定为轨道外DOM滚动可用和缩放策略未新增限制。

原边界观察器FAIL保在failures/outside-observer-control：首次手势位置触到菜单音量滑块，sfx偏好.8→.38，保存state/journal/IDB不变；改手势落在面板空白边距/顶部，不改产品。另首次diff-check有两处移除旧调用后空白行尾空格，已清理，type/test通过不被该格式检查FAIL替代。

当前typecheck、7files／112定向通过；最终HEAD完整CI按PR回执另核，不借1fcec442成功回执。物理设备／触感／整屏美学／自然试玩仍未签，正常试玩归dot。

---

# 原32px候选与验收历史

**最终已正常吸收父批准的main `8f036827dde4ca5b88ba89fceb0fbdf0f32b2970`，PR137已合；本批合并提交 `8d8260315c780d9cf5f5703ecbdd8257d51430ce`。先前draft依赖和拒绝仅历史，不再作为当前阻塞。本代理未合main或发布，仍由父唯一Ready/merge。**

本批独立修复手机商店满五张的“抓不住／不跟手／目标与保存落位不清楚”。[draft PR138](https://github.com/big-dimple/dachoupai/pull/138)，父唯一 Ready／merge／发布。正常试玩归 dot，本批不是自然经营、美术最终签收或物理手机验收。

基线server取git archive到独立/tmp目录；baseline/report的modified字段描述harness调用方工作树，不是该只读archive。基线：`00fe311e04305b7769f8141520742810bc614134`。独立初版产品：`29d95f43e8c0bfa64ef069215d76ad6946aa8672`，src tree `e2a3058cce25c67c63c89f5a351896a4e54181b4`；随后补实际坐标采集 `b91b19d4` 与更严格首帧harness `6074433e`。最终集成产品：`8bc6527538d8a20297a11b2e768dd4a4fe80ba73`，src tree `8aee0ab47a537c4d02c4d5539fca6d29d9ade5c8`。`candidate/report.json` 的最终原生验收正是在该冻结提交、无 src/tests/harness 修改下运行；其后证据提交不改变产品树。main吸收后的8d826031产品／tests／harness与8bc65275完全相同，src tree仍8aee0ab4；`main-final/report.json`在8d826031无修改下再次5组PASS，完整初态／四笔排序／失败重试／冷恢复与先前集成相等，见comparison-main-final.json。README 所列本地检查与远端最终 HEAD CI 分开，不借历史绿色签本批。

## 已复现与修正

- 同一受控当前身份 checkpoint、五张真实实例，在 baseline 320×740／390×844／412×915 原生 CDP touch 中，355ms 静止长按仅 1.04 倍且没有上移。实际抓起 PNG 几乎和静止相同；旧全通过对象断言不当体验验收。
- `pan-y` 使三种手机长按后约20px纵向移动被浏览器接管，实际触发取消，`vertical.drag=false`。PC 同移动仍跟随。这个当前 main 实例是“不跟手”的确定原因之一，不归咎旧版本，也不宣称解释用户所有手势。
- 新模块抬高32 CSS px、1.12倍、明显纸影；二维位移保留抓点偏移。目标槽纸底／边框＋“第N位”；其他牌按原 move 插入顺序短促让位（110ms），不是swap。成功保存后先采集旧实例实际位置，再用新绘实例短落位（150ms）；低动态保直接跟手和明确状态，省去装饰过渡。
- 仅持牌输入面改 `touch-action:none`，保持355ms／10px及原落点函数。当前商店 body overflow hidden、文档无滚动范围；提前移动仍取消，不冒称页面滚动已验。其他触摸面未改。
- 保存等待保目标预览并写“保存中”，锁画布输入；resize重绘只重绑视觉。唯一持久动作仍为现有 `send(ReorderJokers,expectedSeq)`，没有视觉模块写run/save。保存失败即时恢复真实已保存序，显示未保存，沿用菜单“重试保存”提交同一候选，无视觉假成功。
- 默认“通常从左到右结算 · 长按拖动排序”；即将入场的压轴B13整手按右到左提示（读stageIndex与本章boss，不误读保留的上一场stage）。本槽版次及原评分/骰爷待结算锁定完全不改，不声称任何换位都会增分。

## 真实整屏像素

已用 view_image 看原尺寸修前/修后抓起、途中、保存等待与落位：牌头在指尖上方仍可见，纸影与槽号能区分抓起牌和目标槽。瞬时抬起会经过提示/相邻货架边缘，未把这种短暂重叠当整屏美学已签；其它手机货架/购买品质归独立PR137。

| 输入／viewport | 修前抓起／途中 | 修后抓起／途中／保存／落位 |
|---|---|---|
| 原生touch 320×740 | [抓起](baseline/320x740-slow-held.png) · [途中](baseline/320x740-slow-mid.png) | [抓起](candidate/320x740-slow-held.png) · [途中](candidate/320x740-slow-mid.png) · [等待](candidate/320x740-saving-delay.png) · [落位](candidate/320x740-slow-dropped.png) |
| 原生touch 390×844 | [抓起](baseline/390x844-slow-held.png) · [途中](baseline/390x844-slow-mid.png) | [抓起](candidate/390x844-slow-held.png) · [途中](candidate/390x844-slow-mid.png) · [等待](candidate/390x844-saving-delay.png) · [落位](candidate/390x844-slow-dropped.png) |
| 原生touch 412×915 | [抓起](baseline/412x915-slow-held.png) · [途中](baseline/412x915-slow-mid.png) | [抓起](candidate/412x915-slow-held.png) · [途中](candidate/412x915-slow-mid.png) · [等待](candidate/412x915-saving-delay.png) · [落位](candidate/412x915-slow-dropped.png) |
| mouse 1366×900 | [抓起](baseline/1366x900-slow-held.png) · [途中](baseline/1366x900-slow-mid.png) | [抓起](candidate/1366x900-slow-held.png) · [途中](candidate/1366x900-slow-mid.png) · [等待](candidate/1366x900-saving-delay.png) · [落位](candidate/1366x900-slow-dropped.png) |
| 原生touch DPR2／低动态 390×844 | 原规则同上述基线 | [抓起](candidate/390x844-reduce-dpr2-slow-held.png) · [途中](candidate/390x844-reduce-dpr2-slow-mid.png) · [等待](candidate/390x844-reduce-dpr2-saving-delay.png) · [落位](candidate/390x844-reduce-dpr2-slow-dropped.png) |

同状态修前后对应的初态及每一笔before/after，完整state/journal/IndexedDB/非lease localStorage全部相等，见[逐行比较](comparison.json)。快跨1→5、5→1与中间1基索引2→4的途中另有 fast-mid/middle-mid PNG。这里的截图没有画假手指或做后期修图，坐标来自真正的touch事件。

## 状态与异常验收

最终集成五个profile各额外做快速跨槽、马上释放、250ms实际存储延迟（不resize），记录成功后的每个poststep首批画面位置：所有其它牌保持目标中心、没有先弹回。旧29d95f4在320这个同一受控操作真实FAIL（首保存帧其它牌偏离目标约21.5px），原FAIL见failures/delayed-save-jump，采集实际位置后五组均PASS。此前仅慢拖/最终位置不足以签这个边界。

五个profile各做1→5慢拖（二维含8px纵向）、5→1快跨槽、中间2→4插入。每次只增加一笔command/receipt/journal与一次IDB revision，完整新状态等于实际 `applyCommand`，实例growth/edition随本体移动。预览、延迟保存阶段全保存不变；释放至成功期间不先弹回。延迟保存时尝试点击未购货物不提交；尺寸变化重绘仍保“保存中”。落位后所有实例实际中心按已保存序。

手机四profile各11个取消/安全边界、PC9个：静止长按松手、同槽、滑出、pointercancel、手机提前移动、原生双指（主指先松）、受控hidden信号、resize、Escape、blur信号、拖动中锁定。每项完整状态/存档一致且dispatch0；锁定后新长按不抬起、拖动不提交，普通tap仍可只读查看，左移/右移/出售禁用。隐藏与blur为DOM控制信号，不当物理后台证据。

每个profile注入真实 `IndexedDbSave.commit` quota失败：命令只一次，已发布state/journal/IDB完全保留，全部牌回原保存位置/scale1，菜单明确未保存。解除错误后点原“重试保存”，只保存原候选、序号与journal各+1，无重新应用命令；完整current checkpoint等于实际state/journal，随后刷新冷恢复全部一致。[390失败](candidate/390x844-save-failure.png) · [重试](candidate/390x844-save-retry.png)。

完整记录：baseline/candidate各 `full-state-journal-storage.json.gz`；可读索引各 `report.json`。不得以report摘要代替压缩文件里的完整状态。所有资料有sha256清单；资源/价格/领域/随机/存档身份及RunMenu／MakeCardsDialog／style.css无本批修改。

## 原失败与检查

- `failures/visual-only-pan-y-fail`：产品视觉第一版在320原生长按后20px纵移仍被pan-y取消；真实FAIL与图保留，随后修输入仲裁。
- `failures/observer-menu-fail`：安全边界已通过，但脚本误将已自动打开的只读菜单关闭后寻找接管按钮，超时；修观察器，不修产品。
- `failures/observer-controller-fail`：接管会替换SavedRun，脚本没有重装命令计数观察器，3≠4；修观察器，不增加产品命令。
- `failures/unit-float.txt`：浮点CSS y坐标Object.is期待518.6，实际518.5999999999999；改近似断言，产品不改。
- `failures/local-browser-missing`：标准本地build成功，smoke启动失败因Playwright下载的headless-shell不存在；使用已安装`/usr/bin/chromium`复核。该环境缺失不当产品通过或失败。
- `failures/local-guard-overlap`：系统Chromium smoke的PC/手机子检查成功、child exit0，但本线程同时写证据，check-runner检测源码指纹改变而判总gate FAIL。明确承认工作调度错误，保存原FAIL；[实际smoke报告](checks/system-chromium-smoke.json)可读，不能称本地总gate通过。最终HEAD在不可变Actions checkout独立核。
- 定向4files／97tests通过，typecheck通过；本地domain全222files／3264tests与content通过（产品冻结前，后仅B13提示判断/销毁接线与测试更新）。本地冻结产品build与docs通过。系统Chromium smoke原回执与总gate FAIL见上；最终HEAD CI另核，不能借137或29的CI签集成。
- 集成typecheck及6files／118定向通过（含ShopLayout/MakeCards合同）；第一次合并唯一冲突在send的save-failed处，同时保留purchaseIntent与排序notice。冲突解决前误执行typecheck遇3条TS1185，是检查时机失误，不是运行时问题，原记录见merge-check.txt。

## 待签边界与集成

当前受控source仅上述SHA与fixture；报告全截图由harness输出，仓库按README选择关键完整PNG及全部状态记录，不把缺少录像的路径当录像通过；物理手机、硬件GPU/FPS、真人抓持观感、音频、自然五张获取/整局与其它viewport仍OPEN。B13提示判断定向测试通过，未冒称该Boss完整原生旅程；骰爷待兑现锁定沿原领域及既有全套测试，未改GameScene。没有mask证据，未做新增mask或改变shared layout。

此前并行PR137未合main，父通知其合并工具因范围识别拒绝两次；本代理没有请求/绕过该合并。父随后明确授权吸收137候选到本draft做集成；随后父获具体批准，正常合137至main8f036827。已经正常merge为8bc65275，保双方历史与原失败，未挑拣、未推main、未发布。RunMenu／MakeCardsDialog／ShopLayout／style.css与137候选字节相同，domain/content/application/platform/public与00fe311相同。

最终`integrated/report.json`在8bc65275、无src/tests/harness修改下运行，三种手机及PC、DPR2低动态、四笔插入/持久保存、原安全边界、延迟/失败/菜单重试/冷恢复均PASS。实际新三列货架的牌位重新用原生坐标验，不借旧列位断言；[320抓起](integrated/320x740-slow-held.png)／[途中](integrated/320x740-slow-mid.png)／[落位](integrated/320x740-slow-dropped.png)，[390保存](integrated/390x844-saving-delay.png)，[412途中](integrated/412x915-slow-mid.png)。本代理已actual view上述像素。

[集成完整状态对照](comparison-integrated.json)：初态与三笔主路径的完整state/journal/IDB与baseline相等；PR137首次开菜单多一个fullscreen-hint已看UI偏好，明确登记，不改run。每次手势内所有非lease localStorage保持原样。完整状态和逐帧采样在integrated gzip，原初版candidate与FAIL保留不覆盖。

**整屏未通过新观察：** 320满五张时，货架“4 金 · 比较替换”越过列宽，价格行互相挤占。见上面integrated整屏，属于137货架范围，已报告父，未在拖拽批擅改其代码。瞬时抬起也会经过价格/提示边缘。这里仅签受控拖拽反馈与状态门，不签整个满五商店。父对这个新满五边界的处置仍待；137已由父合main，8d826031正常吸收并重跑三种手机/PC/低动态全部PASS，不改变它的价格或购买实现。拖拽尚待父Ready/merge，不能称已发布。

重跑：`DRAG_OUTPUT=/tmp/owned-feedback-check node harness/owned-joker-drag-feedback.mjs`；受控存档通过正常菜单导入，输入用真实CDP／mouse／DOM。正常试玩由dot负责。


## main吸收后的冻结回执

`8d8260315c780d9cf5f5703ecbdd8257d51430ce`正合main8f036827，无src/tests/harness新差异。`main-final`的5组真实触摸/鼠标、完整状态、取消与一次命令、快速释放/延迟首帧、失败/重试/冷恢复再次PASS。[320抓起](main-final/320x740-slow-held.png)／[中途](main-final/320x740-slow-mid.png)／[落位](main-final/320x740-slow-dropped.png)，[390等待](main-final/390x844-saving-delay.png)，[412途中](main-final/412x915-slow-mid.png)。

吸收前冻结证据提交ada261554f680336b63578bcab29ae3aab72c66a的[完整CI38265270167](https://github.com/big-dimple/dachoupai/actions/runs/38265270167) browser/domain/docs均success，[production-docs38265270163](https://github.com/big-dimple/dachoupai/actions/runs/38265270163) success；该HEAD本地browser总gate亦PASS（build＋系统Chromium PC/手机smoke，源码指纹不变）。最终head将仅增加本回执，CI依然按最终PR HEAD单独核并在PR描述和交付回执链接，不借ada代签新HEAD。
