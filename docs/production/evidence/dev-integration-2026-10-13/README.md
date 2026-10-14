# 冻结小批开发集成

最新 main 核实为 `2ef9180c066308e06d7d09850983ea469aa67fd8`。七批产品候选 `83dbed7fcdc386f05dc42a00dd0a0731f77c99e3`，src tree `3fa20188258f2b7f3b0f0a8327b1486bf753dfc2`；随后只有本独立 evidence 提交，最终精确 HEAD 的 CI 回执列于 Draft 集成 PR。

| 原 PR | 冻结 HEAD |
|---|---|
| 157 推荐卡面 | f38b9d145c7ae63076888185eaa02f5396e9225b |
| 158 选角折叠 | 947cd9ac14d008897fef757988748100fe00043d |
| 160 三回看入口 | e156694b6f6abb4b1ea4600ca56279c48cae84d7 |
| 161 工具分类/滚动/焦点 | 2e56f2399289fdb176501478c25573d5326fa8d0 |
| 162 c07 可执行见证 | d2ac388e7636130214ea246a5f70339051901e13 |
| 155 实际来源读数（后续明确授权追加） | a65ee10e27a3b98eb173384d9903b3d4025dd942 |
| 156 资源预热/冷入桌晚图恢复（最后明确授权追加） | 852aee3de1b62fcbec681a0579e142f28cbe94c9 |

逐个核远端 HEAD、merge-base 和差异后正常 merge。前六批无文本冲突；第七批实际三处冲突：ShopScene/GameScene 顶部保两边新导入；CharacterSelectScene 保158 sampleExpanded、删156已替代的 portraitRequests。其余正常三方合成，未做新设计。157/161 的 ShopScene 绘制与浏览上下文均保留，155 动态来源与160回看方法互不覆盖。原分支/PR未修改或关闭，main 未合/未推；新数值cap4不带入，不等待它阻塞当前候选。domain/application/content/platform、资源、依赖/工作流、唯一 DELIVERY_PLAN 与 main 无差异；无存档迁移或新交易规则。完整 SHA/祖先/保护路径见 [integration-proof.json](integration-proof.json)。

## 实验结果

- 五批 `c1659593`：320/390/1366 三类商店状态9例，五颗星均完整、稀有与组合签不相交，查看/取消的完整 state/journal/storage/localStorage 不变，send=0。
- 五批：390触控/1366鼠标键盘买存、立即使用取消、目标滚动/分类/焦点返回、冷继续；三笔真实交易逐字段等原 applyCommand/checkpoint。补验售罄禁用卡不聚焦、消费后实例不聚焦、菜单导入另一合法 createRun/RerollShop 新店后分类/滚动/焦点全部重置。原布局/规则未改。[边界报告](tools-boundary/report.json.gz)。
- 五批：390/1366/320 六英雄展开/重播/收起、切换复位、三路线，查看完整保存不变；手机/PC普通创建和冷继续相等。六批精确 `848f5b55` 再核手机/PC展开收起→正常创建→冷继续，原选角/ShopScene源码逐字节相同。[六批选角](six-selector/verification.json.gz)。
- 五批：普通/菜单/投影回看12行、成功失败结算对照4行通过，结果 canvas 与原基线逐字节相同，全部结果方法外源码及按钮回调保持。六批的回看文件与 inspectLastTrace 方法哈希仍相同，见 [前后证据](six-recap-source-after.json)。
- 六批精确 `848f5b55`：原生普通390=27、连锁1366/390=34681、亿分390=12886500000；本次倍率/加成与累计分开，原版次/重触/英雄来源及清理断言通过。真实 Play 后三个回看入口默认摘要、诊断展开再折叠/关闭保存不变；普通继续选牌取消，三个过关培养→OpenShop完整 state 等原领域命令；另败局1366/390关闭后返回选角保存不变。前后245个src文件hash一致，无pageerror。[来源→回看](six-source-recap/report.json.gz)、[完整账](six-source-recap/states.json.gz)、[败局后续](recap-followup/report.json.gz)。
- 六批 typecheck、8文件/56项定向（含c07全部正负例）通过。五批完整 domain 首轮3363通过/1个既有布局循环默认5秒超时；原 FAIL 保留，单独默认配置18项复跑全通过，content72定义通过。旧五批本地browser在范围更新后主动停止：build/Chromium desktop通过、mobile未完成，不签browser全绿。最终完整默认domain/browser/typecheck/docs以Draft PR精确HEAD CI为准，未改测试限时或断言。

- 最终七批精确 `83dbed7f`：商店9例和工具双端原全链/新店/售罄/消费焦点重新通过；完整保存与原命令相等。[七批卡面](seven-cards/report.json.gz)、[七批工具](seven-tools/report.json.gz)。390实际连锁→来源五捕获→回看诊断开合→培养OpenShop再次通过，文件/方法与六批相同，前后249个src哈希保持。[七批来源回看](seven-source-recap/report.json.gz)。
- 七批固定E2E构建绑定83dbed7f、modified=false：1366/390快速首店入桌及冷保存继续四行，J/Q/K对应图片 false→true；冷继续头像、PC桌边晚图恢复。root/cardViews/container/hit/handInput/avatar/heroHit/选择逐对象保持，无重新发牌，完整state/journal/checkpoint/IDB/非lease local相等；两端选角图晚到期间sampleExpanded/root/关闭按钮/样例状态保持，真实收起/重开仍可执行。[七批冷图报告](seven-warmup/report.json.gz)。
- 七批typecheck、10文件/65项定向通过；完整默认Vitest233文件/3379项全通过，但运行期间父复制独立evidence触发source守卫，故本地domain gate为FAIL（childExitCode=0），不代签CI。原[守卫记录](seven-domain-source-guard.json)保留；运行代码、index、HEAD没有改变。文档提交后工作树冻结，最终完整domain/content/browser/typecheck/docs以Draft集成PR精确HEAD CI回执为准。

所有 PNG 与压缩报告哈希见 [artifact-index.json](artifact-index.json)。代表图均实际查看；完整原小批 evidence 身份保持。观察器副本按实际执行保留，有本环境绝对导入路径；仓库既有 harness 可按原路径复现，工具补验脚本在 tools-boundary，六批追加在 six-source-recap。首次选角观察器人工结束的 Target closed 单独保留，不归为产品失败或完成。

仅Linux Chromium软件Canvas局部真实输入/受控合法保存导入，不打一整局。物理设备触感、音频/听感、自然获取/全旅程、整体审美及新数值未验；旧自然游戏没有迁移，兼容由原规则/保存树及旧合法checkpoint冷恢复保持，不冒称真实用户旧档验收。main合并仍需另行明确确认；本PR只开发集成候选。
