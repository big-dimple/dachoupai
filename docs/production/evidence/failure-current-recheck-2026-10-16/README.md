# 失败体验：当前实现复核，产品无修改

固定运行时基线 `034557dc004175b5049d2f894c10e2f671996365`，独立分支 `investigate/failure-experience-current-20261016`。遵循 DELIVERY_PLAN 已有“失败回顾与同局再战已在 main”的入口，不重复开发或重开历史工作包。本轮没有复现新的产品缺口；只适配既有观察器到 Windows，并保留当前版本证据。P08 仍为 in_progress。

父通知新main `0621156b5bd17557d867f618dbb86c1ef0260384`后，正常合入本开发分支至`793c886ba3e333baba8b6f7a82c69dd953cd4d84`。失败/回顾/保存/重试/GameScene/全局CSS等11个相关文件逐字节同上述基线；本分支相对062的src/public差异仍为空。变更涉及选角/商店，因此只增验390×568的返回选角→换英雄/同花路线→新商店→冷恢复，通过且原模式分区保留；[当前报告](latest-selection-report.json.gz)、[完整状态](latest-selection-full-state.json.gz)、[新店截图](screens/latest-062-new-selection-shop.png)。不把旧13+2项改签为062的新一轮全套；后续B05开发未纳入本次范围。

## 当前玩家能力与核对结果

- 失败首页显示已保存的本场热度、目标/差额、末手及终态原因。[PC](screens/pc-hands-failure.png)、[320短屏](screens/320-short-hands-failure.png)均可读；历史名人立绘保持。320短屏先保事实与操作区，不用立绘遮挡差额。
- 出牌用尽、仍有次数但无合法牌、主动结束分别说明。刚跳场后主动结束注明没有计分，不捏造差额或末手。[跳场后主动结束](screens/390-short-post-skip-advice.png)。Boss建议仅引用有效保存末手中的实际影响，[B02代表](screens/390-short-boss-advice.png)，不把它宣称为唯一败因。
- “再战建议”2–3条、资格规则折叠，正文独立滚动；主流程九个尺寸/原因组合均实际滚动并覆盖建议及展开规则每一行，固定返回区保持可达。[320正文底部](screens/320-short-hands-rules-bottom.png)。无有效末手时回看明确禁用，并显示记录不可用，没有空白操作按钮。
- “对局回顾”展示最终持有及实际成长，支持末手回看、最终牌组、详情和返回建议。已有真实货架种子 `route-first-4` 的 c06 正常购买/出牌后，使用公开弱牌继续至失败；PC与320均由浏览器原生出牌进入终态，完整状态等于该原命令结果。回顾显示“已积攒 +0.5 倍率”“上手未新增，现存0.5”“上手实际读取 +0.5 倍率·1次”，没有把旧成长当作刚新增或宣传为整局最高纪录。[320](screens/320-saved-growth-reflection.png)、[PC](screens/1366-saved-growth-reflection.png)。查看/滚动/关闭/再打开均不改完整保存。
- 主屏和建议都能返回选角/同局重试；返回后可回原失败页，选新英雄/路线也可创建新局。同局重试沿用原种子、英雄、模式、身份和开局路线，从初始资源开始；金币/构筑/工具/成长不继承。

## 实际验证与证据

[validation.json](validation.json)记录56项相关测试、生产构建、两批原生检查及运行时文件哈希；`git diff HEAD -- src public`为空。没有修改IntermissionScene、FailureSummary、FinaleKeepsake、GameScene、ShopScene、全局CSS、领域/保存、音频或资产。

1. **13项主流程 PASS**：[完整报告](native-report.json.gz)、[完整state/journal/checkpoint/revision](native-full-state.json.gz)。1366×768、390×844、320×568分别三种终态；另390×568的B02、保存故障、跳场后主动结束、换英雄/方向。所有pageerror为0。
2. PC/390/320快速三击重试仅1次commit、1次revision、新局seq1且journal空，完整新局与createRun相等。冷恢复相等；原同分区进度作为备份，换模式分区保留旧分区。
3. quota故障下原状态和存储保留；再次失败仍为同一候选，恢复后3次尝试仅1次成功。另从完整快照逐字段确认首次失败候选checkpoint就是最终成功保存的checkpoint。[失败](screens/390-short-fault-save-failed.png)、[恢复](screens/390-short-fault-retry-shop.png)。
4. **2项成长回顾补查 PASS**：[报告](reflection-report.json)、[完整状态](reflection-full-state.json.gz)。这是主流程之后追加的独立两端检查，两批共享上述固定运行时；不把两阶段伪称为同一轮观察器。
5. `vitest` failure-summary/failure-guidance/finale-keepsake/result-stage/settlement-presentation共56项通过；`npm.cmd run build`类型及生产构建通过，保留原大chunk提示。`git diff --check`、harness语法检查通过。

观察器改动仅为：esbuild加载领域夹具、Vite build+preview、默认使用已安装Playwright Chromium；直接观察原控制器的store，保存故障记录实际commit候选，不新增应用hook。原Windows dev服务曾出现本机HTTP无响应，已停该探针改用preview；增加成长读取时首次Node夹具缺BASE_URL定义，已补测试定义后通过。两者是工具适配问题，不当成产品缺陷。

重跑 `node harness/failure-retry-guidance.mjs`（最终入口默认主流程加成长回顾）；仅补查可设 `FAILURE_QA_REFLECTION_ONLY=1`，读屏专项仍可设 `FAILURE_QA_SCROLL_ONLY=1`。默认输出在gitignored的shots目录。完整gz可用Node zlib.gunzipSync读取，避免把大量逐行观察复制成重复文档。

## 未验边界

软件通过不代表玩家已理解差距、感到被鼓励或愿意再战；“本局亮点”仅限可证明的末手/最终成长，不新增未策划的整局最高分历史或编造失败诊断。未签真人理解、完整审美、听感、物理设备、真实系统安全区/浏览器键盘、Firefox/WebKit或三路线自然平衡。受控终态与既有固定货架种子不作为失败率、供给率或通关率样本。未查询/等待CI，未部署、管理域名或合main。
