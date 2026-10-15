# 同版最终集成候选：有限验证结果

冻结提交 **40b9f31e1d37ec6f7b06fce46f8eb72b65307bd5**；产品src tree **5789ae02a57e28860297b3134bcbbbe8ef6f43bb**。基线main为4a52fd0b；五个输入03d701f3 / 2a3f1bca / aa001b3d / f30948d1 / bba29524全部为祖先，均正常merge保原历史，四轴随培养祖先纳入，无cherry-pick、冲突或强推。源代码/索引/HEAD在最终全量轮前后完全相同；后续仅提交本页证据和说明，不改变已验证产品及观察器。

## 软件门与精确来源

[全量门](final-40b9f31e/all.json) PASS：249文件/3478单元测试、content、typecheck/production build、Chromium桌面与手机compiled smoke、唯一计划32工作包。原chunk>500kB提示保持，没有关闭检查或修改工作流。本机只安装并执行Chromium；三引擎远端CI另核，不借此签Firefox/WebKit或真机。

[冻结与保护树](final-40b9f31e/freeze.json)、[全部窗口汇总](final-40b9f31e/suite-summary.json)。domain/content/application/audio/public/art及工作流对象与main完全相同。游戏数值、规则身份、保存与原画没有集成改造；手动修正仅两个旧unit fixture及新连续观察器的精确阿燥命令。首轮5个旧fixture/合同FAIL和阿燥观察器FAIL完整保留于[failed-563e5a9b](failed-563e5a9b/README.md)，最终所有族在40b9f31e一整轮重新执行，没有拼接首轮PASS。

PR186 bba29524已由父独审确认：产品同3fb，13默认+6真实.dialog-scroll逐行wheel，标题原PNG/新视窗像素与DOM都在header内，撤回预览裁切疑点，没有产品标题修复。[精确CI38664393369](https://github.com/big-dimple/dachoupai/actions/runs/38664393369)与[production-docs38664393347](https://github.com/big-dimple/dachoupai/actions/runs/38664393347)全success，另存[原读取回执](final-40b9f31e/pr186-ci.json)；这只证明该输入，不替代本集成检查。

## 同源连续操作

下列60个有界窗口/链均PASS、无pageerror，各报告记录同一40b9f31e。六英雄与图片故障使用同一冻结E2E编译产物（build时间2026-10-15T01:25:24.648Z）；既有专属harness在同HEAD的E2E Vite服务器运行，SSR仅用于资格/权威比对和存储故障封装，文件全程不改。因此称同一冻结源码，不把不同服务器时间说成同一二进制。

| 族 | 项数 | 真实操作与边界 |
|---|---:|---|
| 六英雄接续 | 6 | 阿默/二响PC成组、骰爷/阿燥390顺子、老幻/谢幕320同花；每位只读三方向后只开一局，正常真实起手购买、quota拒绝/原候选重试、简版→全部培养页/关闭、牌桌技能说明、原生首手出牌与禁HTTP缓存冷继续。非18长局。每手按公开handOrder前5张固定选择，不是合理打法/平衡或六技能收益验收；六局首手均未清场，仍是待继续的正常局。|
| 四轴商店链 | 4 | PC1366、390长/短、320：真实四轴和五持牌比较/第五卡管理互转、出售取消与保存、购入quota失败重试原事务一次、工具买存/使用/取消、基础快用、用工具失败重试/返回原滚动、冷恢复。|
| 培养升级 | 12 | 四视窗×成组/顺子/同花；简版/全部页同路升级报价、取消/ESC原焦点、延迟保存防重复、quota原候选恢复、直接成功/优惠/满库存/等级上限、额度使用和刷新不恢复、返回新状态原培养页、冷恢复。|
| 失败再战 | 13 | PC/390/320三种终态、真实B02、quota重试、跳场后主动结束、换英雄/方向。查看/返回/留影/回看不派事务，重试不继承旧局金币成长，保分区和原候选单次保存。|
| 短屏正文 | 6 | 320/390×hands/Boss/post-skip；真正.dialog-scroll上native wheel逐Range行覆盖第二/第三建议与规则末句，固定返回/标题/父容器实际测量，整段读取后保存相等。|
| B05 | 13 | PC/390/320实际入场/取消、重复牌型/换型出牌、计分来源与基数减半、保存/冷恢复及中断；角色/牌型规则顺序、来源文案与父容器范围正确，不借数值示意冒充新规则。|
| 比较缩窗 | 3 | 普通/长组合/五星真实数据，打开状态844→568→844重排，正确滚动所有者/第五项/返回焦点及保存保持。|
| 图片故障 | 3 | 404/坏图明确失败、显式卡面重试到高清、离店原请求net::ERR_ABORTED和冷重入。没有换假原画或改保存来消红。|

真实事务逐笔比较原applyCommand、journal、checkpoint、IDB revision；失败/取消保持完整run（含RNG）和旧存储，重试不重新派发原动作。完整数据分别在final-40b9f31e各族*.json.gz，精简报告可直接读。原始388张PNG在运行环境`/tmp/shop-integration-final/`，索引和SHA256见[raw-screenshot-index](final-40b9f31e/raw-screenshot-index.json)；仅精选11张已实际查看的完整图片入库，见[viewed-screenshots](final-40b9f31e/viewed-screenshots.json)。索引存在不等于逐张图审。

## 实际图审的有限结论

实看PC完整四轴货架/升级保存、390第五持牌比较/培养返回/失败标题、320工具目标/培养存储故障/B05同型来源/失败正文底部/谢幕冷继续，以及PC阿默冷继续。固定操作与所选目标可达；失败标题在header内，B05三个文字块在其真实父面板内；普通滚动区上/下缘在中间位置的裁切是滚动视口，不据此声称该屏展示全文。320保存故障菜单当时在下部，重试按钮清楚可点，警告文本在上方，未签同屏全警告。正文全文只以6个真实逐行阅读窗口签有限通过。

数字/文字模糊、低清头像式眼神、脏痕曲线过渡已交独立视觉任务 **01a13d2b-ddf0-70a5-8aac-7c8b6973302f**。本冻结版未混入该新增量，不因本轮软件/操作PASS签画质问题已解决。素材高光美术、人工理解、实机触感、听感、自然三路线持续经营/整体平衡和全部游戏交付均OPEN。

## 可验入口与下一步

- 开发分支`fix/shop-integration-20261015`，最终证据提交SHA由交付回执给出；可`git checkout`该分支后按FINAL_CHECKLIST复验。
- 本地冻结预览`http://127.0.0.1:5589/?harness=1&seed=integration-review`，build-info.json显示40b9f31e clean；仅本执行环境loopback可见，不是部署/正式站点。构建重建命令在FINAL_CHECKLIST，普通不带harness的入口也可正常玩。
- 六个已保存首手后局已从实际冷恢复IDB原样导出并经readCheckpoint校验，可从[checkpoints/index.json](final-40b9f31e/continuation/checkpoints/index.json)选英雄/路线，在菜单→进度与存档→导入本局后继续；完整state另在continuation/full-state.json.gz。下一步沿这些正常局继续实际选牌/改牌/英雄机会与下一店，不把第一手当三路线经营终态；不重开18条长局刷结论。
- 独幕S04的获取时点、稀缺性、改造范围、真实代价及与逐步染色的关系已列唯一DELIVERY_PLAN整体数值窗口“明确待完成”，仅有PR147分析、无具体获准改造。本批不调S04或定50%/60%，未来须三路线有无/早晚获取和真实后续挑战对照。
- 不创建PR：原POST Forbidden未解除，保持停止。只push开发分支和备说明，不合main、不部署、不强推/删除或改权限，亦不访问403拒绝的图片/站点。
