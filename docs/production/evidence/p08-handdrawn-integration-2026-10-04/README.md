# P08 43新手绘接入与有界信息收尾

素材receipt：合法art commit c618cee93089bb2e556f16567709b0ea23abbcb9；46原路径文件在本消费工程可读，portable verify／43文件逐size+SHA通过，20原画43WebP1262668字节。public/assets/handdrawn-p08保相同WebP，runtime manifest去掉生产端Library/source引用并保用途／尺寸／hash和来源commit。角色6的avatar/selection/portrait按原ID映射；普通J/Q/K独立rank；功能牌11精确ID。34个有图Joker注册（旧24保留23＋新11），其余无新图的ID保既有旧图或机制示意，绝不是72全换。

消费入口：characters.ts／portraits.ts、HanddrawnArt.ts／GameScene、jokerArt.ts／JokerArtLoading.ts、DetailDialog.ts／F09Art.ts。新图BASE_URL子路径验证；新HD只开详情后请求；新f09完整图、无未配准旧叠层。新纹理键避免误拿旧功能图缓存，既有失败/取消/缓存合同与固定图窗保留。

有限产物：review a22a613ec970e0c51a5adc6a5a8eb0534c2bd6a4只两PNG+README，见邻目录p08-handdrawn-live-2026-10-04。root与协调者已经通过GitHub实际view，两图局部新素材视觉早评通过。原图是390×740/DPR1/safe0/Chromium Canvas的未提交候选构建，选角自然路线／牌桌validated fixture；不是本次最终main现场。待出小副本J/Q/K中心脸依既有tiny策略简化，后续考虑，不扩大本轮。

五项修复与证据：

1. f08随机operation前后均“事件时检查”；确定非随机条件保持，模型断实际status，不只是概率正文。
2. 停用附带文案按真实集合区分；三条核心全有效、B03禁用安全陪牌4/5张模型，候选/单牌说明本场计分效果停用，仍参与判型／打出张数／重复条件。
3. d05成功弃牌历史／b12 quadRefundUsed公开余1/0次；返次不回退历史、下一阶段重置；未知结算仍待事件。模型检查状态/短条/详情。
4. 短横可见入口被本次直选/规则两44×44按钮取代；844×300 top12 bottom0/12/34实际score高80/80/58，CSS命中／DOM toolbar／文字零相交，原生直选不打开modal、不改领域，撤销与规则/候选关闭保状态。
5. c11互斥两路逐hook保留真实事实，整卡“部分条件满足”明确满足方向；两个方向／都不满足模型与实际scorer事件一致，不机械整卡全满足或any-false。撤销后提示改为真实已撤销。

主界面“切换牌型”来自ready且key匹配的缓存固定目录，下一实际类型第一确定性代表，原子替换且可撤销，禁自动出弃／收益排序／未来牌／RNG。整理中/过期不应用；原revision/manual/resize/order守卫保留。详情仍ghost＋显式换组。相邻“牌型规则”未选可开；唯一详情正文滚动，读R2_BASE_SCORES和Partial run.handLevels全部12型/当前级单项基础/每级增量/成型算法/实际计分顺序；缺项标未发现·按Lv1基准，不补存档、不拼预测总分。两空选漏配Text resolution与现有构造策略统一。桌面窄计分列快捷钮放旁工作区，保完整标题/规则而不缩字。

验证：93受影响单测／type／plan通过。final-browser-contract.json为最终源码的Chromium Canvas＋WebKit WebGL原生购买取消/购买一次/入场、直选撤销、空选规则、候选3/4/5 ghost/apply/undo、失效/B02/static、顺序/resize/菜单返回、先保存再实际数值/完整trace/reload，以及既定8组文字布局。short-native-input.json为本次3组实际短横快捷bounds；art-entry.json记录先前单张候选构建新图请求/哈希/真实解码与路线，不能当最终源码冻结。聚合冻结/精确代码SHA及新远端CI记录freeze/publication，未出现前不视为已通过。没有新增图集或录屏。

四状态：实现完成；受影响技术通过，最终聚合待收尾；新图局部方向早评通过而整体审美仍待验；OnePlus/真实GPU/听感NOT_RUN。火参考原URL CONNECT代理403未取得像素，BLOCKED并停止下载；未换路线/未假称看图，既有火源码及真实提交/去重/墙钟/回看/reduced安全合同不改，下一小批由root协调。没有规则／RNG／存档／奖励／部署／PC改动。

冻结结果：源码0ce7881的1863 tests/104files、content、type/build和Canvas桌面/手机smoke通过，source/index/HEAD不变。初次聚合最后plan阶段因误把README加入JSON evidence而FAIL，原报告保留freeze-before-plan-fix.json。只修JSON证据引用；运行源码不改，docs-only恢复记录单列，不重跑未变的1863/runtime浏览器。精确新远端CI将验证最终提交。

文档恢复：1015153c5cdd337899f1d7eb5c47592ab8adca06的verify:ci --scope=docs PASS，source/index/HEAD不变；只修改证据引用与归档文档，运行源码相对0ce7881不变。最终新远端CI状态另报。
