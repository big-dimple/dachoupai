# 骰爷玩家说明与菜单旧角色正文勘误

输入 main `dc985f6a4f418e5751648f1d57f466163fbc2673`，PR130已合。此包只显示勘误：原菜单直接写“真实弃牌同事务提交”“本次实际新补ID至少一张进入有效计分核心”，玩家不需要开发术语。新说明按三个操作写：1选要弃的牌；2押下一手牌型并换牌；3至少用一张刚摸回的牌凑成所押牌型，成功×2，否则×0.85。短层说明作用与操作，详情保留新牌只当配牌、没打出或被封住不算，已成型也可押、每场一次、押后不能再弃/改牌/更换与调整大丑牌、弃牌成本、不押×1.15、恢复保约、静场和禁用能力挑战停用。短结果改为新摸牌成型/没参与成型，不改计算。

只写预留的 CharacterRunCopy、TouyeWagerCopy、HeroSkillGuide 三个文案文件，加已报告必要范围的 RunMenu。菜单先有[两端真实复现](baseline-cache/report.json)：正常谢幕新局→菜单查看局详情→正常重新选择骰爷和路线并确认新局，打开菜单仍是谢幕正文，点局详情才更新。两端查看前后完整state/journal/IndexedDB不变。RunMenu仅给信息面板保留当前“局详情/版本信息”视图选择，局详情跟随当前session状态刷新；存档、恢复、路由、动作与样式不动，不扩大成菜单重构。

[最终菜单检查](menu-final/report.json)PC1366×768和触摸390×844各一条同正常换角路径，未点局详情前已经是骰爷正文；完整1/2/3说明可滚动查看，版本信息关闭重开仍保留，查看全程state/journal/IndexedDB相等。图含完整玩家说明，已实际查看。

[十个受控只读显示范围](views-final/report.json)复用PR130已保存的真实原生状态与命令日志，仅导入、查看、选牌预览和取消，没有新押注/出牌或自然试玩。两端各检查操作步骤、目标确认及展开风险、已换牌待出手及展开细则、赢/输短结果、旧C2成型目标禁押。各范围完整state/journal/IndexedDB查看前后相等。两端输赢短结果实际在屏内；确认、完整细则、菜单整段与PC结果图已实际查看。

显示差分用源码等于输入main的另一工作树直接加载原函数。旧C2同一合法状态的角色/选择/技能步骤全部与旧函数相等；新身份只改可见文案与步骤标签，enabled/pending/used/choices/snapshotToken等非显示资格字段严格相等；其他五英雄角色文案完整相等。原当前身份 `quality-r2-touye-new-core-v1 / json-fnv-v1:413ecc65d3b9a2a1`、旧C2 `quality-r2-route-growth-v1 / json-fnv-v1:7414228d95059959` 不变。[保护清单](manifest.json)包含除四个显示文件之外的源码、公开资源、唯一计划、工作流和包文件，702项全逐字节等于吸收后的main `0c71c5dabbc754516848d1a0acc931464db730a8`；领域、应用保存、内容定义、数值、时序、Intermission、Shop、MakeCardsDialog和样式均不改。

显示实现冻结为 `8e4accce7e312b046cdcc81acd08213324ea6cb3`。父随后合PR131，仅更新统一计划和18局分版本复盘，本包正常合入 `0c71c5dabbc754516848d1a0acc931464db730a8`，合入提交为 `dde237d5e5b78cf812f99f46ea7a9c2fceff1ab0`，相对8e只增加这两份文档，src/tests/harness/public/scripts各树未变。清单基线相应换成新main，原始输入dc与源冻结8e另保留，不借文档合入声称已核新产品或已上线。未扩改音频或美术资源。

[75项定向检查](tests.log)、[类型检查](typecheck.log)、[build](build.log)通过，不把远端全套和定向项叠加为新总数。保留首轮[菜单观察器FAIL](observer-fail/report.json)：漏点旧局更换时真正的确认开始新局，后补真实DOM确认；保留[基线SSR依赖FAIL](baseline-dependency-fail.log)：旧工作树未挂Vite依赖，后让纯SSR跳过配置文件加载。这两次不是产品失败，没有据此改规则或造PASS。原缓存缺陷的两端REPRODUCED记录与最终PASS分列，不覆盖原证据。

## ad69时文件窗口之外的同步项（现已由main解决）

当前时序线程已启动，只预留上述三个文案文件。尚有三处骰爷说明在它的文件窗口内，本包未写：HeroSignature第11行示例的“新牌入有效核心”，HeroStageContinuity第35行下场提示，JokerExperience第46行输约来源说明。交父/时序线程同步清理为“新摸牌参与成型”“新摸的牌没参与成型”等自然中文；不得把这三处记成已修。这是已定位的显示同步项，不是玩法或数值问题，也不扩写Intermission或倍率时序包。本包最终精确SHA/CI另交父，draft不自行合main或部署，不以等待18局阻塞此已验显示包。

上段保留ad69交接时的真实状态。随后父已合PR134至 `f326a9b3a7a9be937c7c3cd4d286721f674a9409`，三处术语已由该包修正。本候选正常合入main，三份文件与main逐字节相同，不再是待处理项；未越过窗口重写。

## 发布批准后的最新main接续

父明确批准PR132/134发布，且PR132已由父转Ready。本候选普通合入 `f326a9b3a7a9be937c7c3cd4d286721f674a9409`，合入提交 `db6f134fcd63049c4f1553d2cb0b627402eeeb7d`，无文本冲突。四个显示产品文件均逐字节等于原PR132 `ad69ea4ed8c3f782e638f2263a4f050bdf627fbb`；相对新main仍只有这四份显示文件差异。领域/应用保存/内容/牌/音频/公开资源各树完全等于main，保新时序身份和三份新文案，不改布局、数值、规则或保存。相对ad69继承的11份产品源差异全部来自已合main，完整列表见[接续检查](post-timing/checks.json)。

原正常新局检查固定资格身份，按最新入口改读真实launch身份，实际新局为 `quality-r2-active-mult-timing-v1 / json-fnv-v1:ca1e8f77913649d3`；并未给旧档改身份。[最新正常菜单两端检查](post-timing/menu/report.json)仍实际走谢幕→骰爷正常路线确认，切换后未点详情就显示骰爷人话说明，版本视图保留，全保存不变。

[三身份两端18个只读范围](post-timing/views/report.json)从固定main直接加载旧函数，与候选同合法保存输入对照。旧C2全文/资格/步骤不变；资格身份与后置身份均显示1/2/3操作和新摸牌成型条件，非显示资格字段严格同main，没有落入旧禁押、50%随机或开发术语说明。最新后置赢/输原生存档已过关，因此按真实phase导入结算页查看，不篡改phase留在牌桌；实际显示的赢/输词与保存结果对应。所有state/journal/IndexedDB查看前后相等，保持原分412/175及后置档2472/1050，未重算或再次押/出牌。最新菜单、待出手细则和结算页实图已实际查看。

[94项受影响测试](post-timing/tests.log)、[typecheck](post-timing/typecheck.log)、[build](post-timing/build.log)通过。首轮补证在结算页按平级找Text，未遍历其容器而报getBounds undefined；[原FAIL报告](post-timing/observer-first/report.json)与[日志](post-timing/observer-first.log)保留，后只修观察器递归查找/等待真实Text，并给不同身份确认截图独立文件名，没有修改Intermission或其他产品。旧历史图/报告保持原SHA，最新保护清单基线更新为f326。最终HEAD CI重新按精确SHA核验；不自行合main或再转PR状态，父负责唯一集成。
