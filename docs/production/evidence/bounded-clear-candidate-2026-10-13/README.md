# 最小过关加成与公开目标候选

基线 main `2ef9180c066308e06d7d09850983ea469aa67fd8`。远端同方案 dev/bounded-clear-mainline-20261013 只有基线，没有产品提交；PR154仅分析，PR163七批交互未合、本分支未吸收。新分支 dev/bounded-clear-candidate-20261013，开发commit/push/Draft PR已获授权；不合main、不强推、不删分支、不部署。

新身份 `quality-r2-bounded-clear-v1`，hash `json-fnv-v1:7f60ad479f68b033`。保旧全局和 published-r2-contract-drift 完整性守卫，继承原角色/六牌/价格/供给。新局共用一身份；旧局沿原身份保留，不迁移、删除或重算历史。正常选角原实际路线保持，无路线的便利创建记录默认group的规范起局回执。

G/S/F保原合格清场计数、前三次宽限与1.35/1.4/1.3速率，单族上限×4；本手只读取实际相关族最大因子一次，平手按G/S/F固定顺序选择，高牌没有route-factor。清场新增下手生效。只有获选族进入实际factor事件，保真实before/after、routeFamily、resourceBefore/After。玩家叫“过关加成”。目标暖场400/900/1800/3600/6000/9000/14000/20475，8章后×1.1，原阶段/难度，最终ceil。第13章32976/49463/65951。B14继续初始锁值每弃一次+ceil(T/20)，不复利。

首检查点：typecheck通过；原相关5文件116项通过；新增13项通过；随后4文件101项通过。覆盖六角新身份、目标预告/入场/严格保存、非对称GF/SF双方向max、无关族/高牌、上限/宽限、B14两弃和重复确认、固定候选保存失败重试/冷恢复。已有route-growth-run现在使用新启动身份，四次真实清场不回灌、第五手读取1.35及原子保存测试通过。

受控早期回归：第三章B09三手、G8封4、普通满堂彩，普通66/77/88，Lv1 1096+1112+1128=3336<3600，真实T01升对子Lv2后1520+1540+1560=4620，胜败与每手严格恢复通过。夹具明确预植初始状态，非自然获得率。

原失败保留：首两断言仍期待旧启动身份/“资历”文案；首新增夹具跳章节保留了首店basicChoice回执，被原守卫正确拒绝，修成入场前明确受控状态，没削守卫。首完整Vitest 31 failed/3325 passed，主要旧启动身份、无路线便利创建及双族product期待；后续已收敛，原失败保持，不能借旧检查点签最后CI。执行环境一次transport disconnected后同环境恢复，未切执行器。

最终局部浏览器已补（见下）；最终精确HEAD CI交父另核。本批不跑18局或无限扫描，不签三条自然整局、第三章以后自然经营、上亿可达、设备触感/听感/整体平衡。整局由dot安排；PR159 F01/F03/F05归本批，F02/F06待同版自然验证，F04已归PR162/未合PR163，不重做骰爷已合机制。排程仍唯一DELIVERY_PLAN。

后续收敛：原全量失败逐项归因后，10文件202项与AI/副组/新规则3文件56项通过，typecheck通过。实际缺口为AI快照/缓存漏传boundedClear及GameScene别名目标读取漏传身份，已补；未删任何完整性守卫。旧启动/product/文案断言按新规则更新，旧原始identity/profile样例继续明确验证原合同。标准smoke仅更新正常菜单应进入的新精确version/hash两项断言，其余不放宽。首检查点精确CI38441078305失败、production-docs38441078310成功，不能用于最后候选签绿。浏览器结果如下。

## 局部原生结果与最终出口

局部原生冻结 `c241941ee75806203454f018afabdb8affc95d7e`（产品src tree `1ff4f0086739464d8ba4cb1a8a21e340e225070e`，同a4083ad5产品）。[完整state/journal/IndexedDB与真实factor事件](native/report.json)，[源码/报告/PNG SHA256与实际查看清单](source-and-artifacts.json)。PC1366×768、手机390×844各四行，共8行PASS：正常选角（PC阿默/手机骰爷）新身份及冷继续；受控第四章商店公开预告3600/5400/7200，查看/关闭完全无写入、实际进入锁3600且冷继续相等；非对称GF/SF（相关另一族4/F7）只记一个F因子事件，resourceBefore=7、真实before/after，完整保存按原命令相等；GF人为quota失败未发布，两次save候选字节相等、重试只结算一次，冷继续全state/journal/IndexedDB相等。GameScene实际AI公开输入boundedClear=true。截图PC/手机锁值与保存结果已实际查看，只签读数和局部操作，不签整体美学。

首原生FAIL为观察器导入同场景时 `waitScene(shop)` 立即成立、读到原正常商店；原PNG/完整report/output在[native-original-fail](native-original-fail/report.json)。只改观察器等待实际runId/commandSeq/idle回执，没改产品、放宽保存断言或削guard；补跑8行PASS。

本地完整门 `a4083ad5` 原227文件/3356项通过，1个未改动C02获取用例超过默认5秒（实耗6.338秒）；记录[完整domain FAIL及源码守卫结果](bounded-final-domain.txt)。不改限时/测试配置/CI。相同产品远端CI38441719201的domain和docs已success，production-docs38441719081 success，browser当时in_progress；最后HEAD CI另看PR164最终回执，不借此签新SHA。typecheck、有限定向202项＋56项、content验证与plan32通过。

可交dot进入同版三条有限自然路线（含早败、不刷样本）及PR163交互集成另核；第三章末封顶后自然经营承接、中后期采购/主动价值、自然千万/上亿、实体设备/听感和整体平衡仍未验。PR164保持Draft；主线2ef9180c未改、未部署。没有旧档迁移/历史删除，不做兼容大矩阵。
