# C04.3 只读图鉴查询：有限软件证据

2026-10-09。输入父已合PR85 main `693275e6130f86665f7607abe53762b78a29806e`；[先行范围](../../C04_READONLY_CATALOG_SCOPE.md)提交270afa2。仅C04.3查询子包及独立短横摘要修复；原C04/plan.json/resumeContract、W6/W8和历史验收状态保持。6.1默认Medium串行，无并发、整局经营重跑或帧率验收。

## 提交与行为

- 查询产品602914e：菜单主动“图鉴查询”，四分类、名字搜索、六个有限用途、当前持有/未消费现货/上手实际来源标签、8项分页、空结果、按需详情和返回查询。
- 独立摘要724f83ffbc7ec3587589a1aa524aa1ce446beed8：Canvas14px原位，测实际宽高和可用下缘；740×390选择态汇总改用“点所选条件”，原详细来源入口保持。手牌、牌桌、按钮布局文件不改。
- 后续标签2b23f08b1e3f2dd080c57434e9df02fb2c979f2a：长期次数资源/过关金币/稀有奖励、救场归入资源用途，清除特殊牌兼标资源。只改用途分类与定向断言；原生下面724的b10成长查询标签和界面代码保持，未重录。
- 分页复核18d53ab：DetailDialog会在回调结束恢复action的disabled值；仅查询内部同步分页action与按钮可用状态，避免规则资料三页以上只能前进一次。附同提交当时已整理的四尺寸证据，后来仅追加下面一个PC连续翻页证明，不重做经营或全矩阵。
- 当前局按保存identity解析；新局资料读取实际newRunIdentity策略，不生成局。实例现存/实付价和一般规则分区；同名持有实例逐个列出。上手须有真实同源事件，不能把trace中所有持有快照都当触发，更不把旧值当现存。没有跨局已见账本，不承诺收藏进度。
- 道具/长期道具沿现商店命名，道具箱只指当前库存容器。无新增素材/音频/API/账号/schema/持久字段；读取SavedRun.state的已提交checkpoint，不消费未保存候选。

## 定向与原生检查

[29项/4文件](directed-PASS.log)：名字NFKC/空结果/分类与用途交集、旧新同ID身份、现存成长20与一般规则分离、工具件数/长期持有/牌型Lv5、现货phase与消费、上手真实事件、隐藏draw/RNG独立及不改输入；既有完整牌型规则和白话文案检查保持。宽度已包裹但高度越界、关键错误优先与零空间摘要另测。[标签补正时typecheck](typecheck-receipt.json)精确2b23f08 source/index/HEAD前后一致；[plan32包有效](plan-PASS.log)，不代表玩法验收。18d53ab后续分页的最终类型/全量检查由最终head标准CI覆盖。

[原生report](native/report.json)精确724f83f，before/after source/index/HEAD完全相同，执行脚本见[原样脚本](executed-harness.mjs)。Chromium系统软件Canvas，DPR1/减少动态；原生菜单、输入框、select、详情/返回、导入文件选择器；只有740例点两张已有手牌，没有任何新增游戏命令。

- 1366×768、390×740：同一已存正常b10下一商店seq7/8金/成长20。名字+分类+成长+持有交集、实际详情、返回筛选保持、空结果、现货标签、牌型8+4分页、关闭。1366另测无局资料没有公开实例筛选，也不创建存档。
- 320×740：同一shop输入，只检查必要查询/详情/空结果与关闭；原长详情可滚动、关闭可达，没有横向溢出。
- 740×390：复用原W3受控c05已存输入，原生选♥2/♥K后摘要“点所选条件”真实框落在屏幕内，仍14px；查询开关后同两张手选不变。该受控输入不冒称自然获取。
- 每个例子查询前后对完整state/journal/IndexedDB全部记录及手选执行strict deepEqual；拦截IndexedDB put/add/delete/clear和Storage setItem/removeItem/clear，查询期间写入均为[]。初始化/导入保存发生在计数开始前，不能当查询写入。
- 结果≤8项；查找过程中无高清请求。1366单一详情故意延迟b10高清，返回查询取消请求且没有旧详情回挂；缩略仍可读。其余详情按原有按需队列获取原图。未增加全图预载或另写图片系统。
- 11张最终PNG已actual view：查询/详情/空结果×PC、390、320，短横摘要/查询；未做长录屏。PC详情图故意停留缩略/加载中以验证延迟取消，不能当高清质量签收。

[PC分页补证](pagination/report.json)精确18d53ab source/index/HEAD前后一致：只有无局规则资料135项/17页，连续下一页1→2→3、上一页3→2仍可点，再输入空结果时前后分页都禁用，关闭不生成run、IndexedDB写入[]。一张第三页PNG已actual view；该补证不重复四尺寸或业务事务，不把另29项/type2b记录改写成18运行。

## 失败保留与边界

[first-FAIL](first-FAIL/)保留初版portrait可选fallback的TS错误、结果身份误携整份run导致隐藏draw/RNG独立断言失败，以及原生观察器把未设延迟的390也判作延迟取消失败。前两项产品已修，第三项仅脚本条件改为PC1366；不删失败、不放宽deepEqual/零写入/图片取消断言。

[scope-proof](scope-proof.json)记录基线与产品domain/application/content/audio/public/art/platform/.github/scripts树相同，plan.json逐字节相同；[product-files](product-files.json)分别锁原生724、标签补正2b23及分页18d的源码哈希；files.json按最终tracked blobs锁证据文件，无自哈希。回放配方见[replay-harness](replay-harness.mjs)，与原样脚本的唯一区别是改用已落库的旧W3输入，输出仍在/tmp。

最终精确head一次仓库标准CI由PR结果单独核实，链接附PR和交接，不通过追加提交移动已测head。候选只供父独审协调main。真人理解/用户满意、PC实机、手机设备、软硬件流畅度与音频听感全部未签；本包不恢复整个C04、不完成长教程/跨局历史/.2故障长流程/.4正式流程，不把软件截图/测试当W6/W8验收。
